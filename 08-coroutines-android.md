# Корутины: Android-специфика, тестирование и паттерны для лайв-кодинга

Материал начинается с платформонезависимой модели Kotlin coroutines, а затем переходит к Android.
На собеседовании сначала объясните владение задачами, отмену и ошибки; `viewModelScope` и `Dispatchers.Main`
— лишь конкретное применение этих правил.

---

# 0. База Kotlin coroutines вне Android

## 0.1. Что корутина даёт, а чего не даёт

Корутина — лёгкая задача, которую можно **приостановить** без блокировки потока и позднее продолжить.
`suspend` означает только, что функция может приостановиться: это не гарантия фонового потока, не запуск
параллельно и не автоматическая отмена блокирующего I/O.

```kotlin
suspend fun loadProfile(api: Api): Profile {
    delay(100)                 // приостанавливает coroutine, поток свободен для другой работы
    return api.profile()
}
```

У coroutine есть `CoroutineContext`: набор элементов, передаваемых детям. Главные из них:

| Элемент | Отвечает за |
| --- | --- |
| `Job` | lifetime, дерево детей, отмену и завершение |
| `CoroutineDispatcher` | где продолжить выполнение после suspension point |
| `CoroutineName` | диагностику и логи |
| `CoroutineExceptionHandler` | последнюю обработку необработанной ошибки root `launch` |

`withContext(Dispatchers.IO)` переключает контекст **внутри уже существующей** корутины и ждёт результат;
он не создаёт независимую фоновую задачу. Dispatcher выбирают по природе работы: `Default` для CPU-bound
вычислений, `IO` для блокирующего I/O. Suspend-сетевой API обычно не требует вручную оборачивать каждый
вызов в `IO`: библиотека должна сама не блокировать вызывающий поток.

## 0.2. Structured concurrency и владение работой

Structured concurrency означает, что каждая coroutine принадлежит родителю: родитель ждёт детей,
отмена идёт вниз по дереву, а ошибка обычного ребёнка отменяет siblings и поднимается к владельцу.
Поэтому suspend-функция не должна создавать `CoroutineScope(...)` «для удобства»: caller потеряет
контроль над её lifetime, ошибками и тестированием.

```kotlin
suspend fun loadScreen(api: Api): Screen = coroutineScope {
    val profile = async { api.profile() }
    val recommendations = async { api.recommendations() }

    Screen(profile.await(), recommendations.await())
}
```

`coroutineScope` создаёт дочерний scope и возвращает результат только после завершения всех children.
Если `recommendations()` падает, `profile` отменяется, а исключение получает caller. Это подходит, когда
данные образуют одну атомарную операцию: экран без любого из двух ответов невалиден.

Независимые задачи запускают в `supervisorScope` или под `SupervisorJob`: ошибка одного ребёнка не отменяет
siblings. Но ошибка всё равно должна быть наблюдена через `await` или обработана внутри `launch`.

```kotlin
suspend fun refreshWidgets(api: Api): List<WidgetResult> = supervisorScope {
    val weather = async { runCatching { api.weather() } }
    val news = async { runCatching { api.news() } }

    listOf(WidgetResult(weather.await()), WidgetResult(news.await()))
}
```

Не используйте `supervisorScope` как способ «спрятать» ошибки. Он нужен, когда частичный результат имеет
осмысленную бизнес-семантику; иначе fail-fast `coroutineScope` проще и корректнее.

## 0.3. `launch` и `async` — разные контракты

- `launch` возвращает `Job`: задача нужна ради side effect, результат не ожидается. Необработанная ошибка
  у обычного child отменяет родителя; у root coroutine доходит до `CoroutineExceptionHandler`.
- `async` возвращает `Deferred<T>`: задача производит значение. Ошибку нужно наблюдать через `await()`
  (либо она отменит обычного родителя раньше). Создавать `async` и никогда не await-ить — ошибка дизайна.
- `withContext` не является конкурентным builder: он выполняет блок последовательно относительно строки
  вызова и возвращает его значение.

Правильный параллельный fan-out сначала запускает все работы, затем ждёт результаты:

```kotlin
suspend fun loadDashboard(api: Api): Dashboard = coroutineScope {
    val user = async { api.user() }
    val feed = async { api.feed() }
    val alerts = async { api.alerts() }

    Dashboard(user.await(), feed.await(), alerts.await())
}
```

`awaitAll(user, feed, alerts)` эквивалентен по fail-fast семантике и удобен для коллекции `Deferred`.
Он не блокирует поток: ожидающая coroutine приостанавливается. Время выполнения независимых операций
примерно равно $max(t_1, t_2, ..., t_n)$, а не $sum(t_1, t_2, ..., t_n)$, если у внешних ресурсов есть
достаточная ёмкость.

## 0.4. Ошибки и отмена

Отмена кооперативна: `delay`, `await`, `withContext`, большинство suspend API и явная `ensureActive()`
проверяют её. CPU-цикл обязан периодически уступать управление или проверять отмену сам.

```kotlin
suspend fun hashAll(values: List<ByteArray>): List<Hash> = withContext(Dispatchers.Default) {
    values.map { bytes ->
        ensureActive()
        calculateHash(bytes)
    }
}
```

`CancellationException` — управляющий сигнал, а не прикладная ошибка. Не превращайте его в `Error`, не
ретрайте и не проглатывайте широким `catch`:

```kotlin
try {
    api.load()
} catch (error: CancellationException) {
    throw error
} catch (error: IOException) {
    showNetworkError(error)
}
```

`CoroutineExceptionHandler` не заменяет обработку ошибок: он работает только для необработанных ошибок
root `launch`, не ловит исключения `async` до `await`, и не даёт восстановить уже отменённое дерево.
Обрабатывайте expected domain/network ошибки на границе use case или UI state; unexpected ошибки логируйте
и дайте им завершить операцию.

## 0.5. Параллелизм, ограничение и backpressure

Конкурентность не равна параллелизму. Тысяча coroutines может ожидать сеть на нескольких потоках;
CPU-bound работа действительно исполняется параллельно лишь в пределах потоков dispatcher и ядер CPU.
Запуск `async` на каждый элемент без лимита может исчерпать сокеты, память, rate limit сервера или пул БД.

Для доменного лимита («не более 8 запросов») используйте `Semaphore`; для ограничения выполнения
CPU-задач на dispatcher — `Dispatchers.Default.limitedParallelism(n)`.

```kotlin
suspend fun <T, R> Iterable<T>.mapConcurrent(
    concurrency: Int,
    transform: suspend (T) -> R,
): List<R> = coroutineScope {
    require(concurrency > 0)
    val semaphore = Semaphore(concurrency)

    map { item ->
        async { semaphore.withPermit { transform(item) } }
    }.awaitAll()
}
```

Этот вариант сохраняет порядок результата, но создаёт coroutine на каждый элемент. Для очень большой или
бесконечной последовательности нужен bounded worker pool либо Flow с `flatMapMerge(concurrency)`, чтобы
ограничить и число уже созданных задач. Лимит выбирают по измерениям и контрактам зависимостей, а не по
числу ядер: для HTTP он часто ниже server rate limit, для CPU обычно близок к доступному parallelism.

## 0.6. Рецепты владения scope

Правило по умолчанию: use case и repository предоставляют `suspend fun`; scope выбирает слой, который
владеет пользовательским сценарием. Так lifetime не прячется внутри data-слоя.

```kotlin
class LoadDashboardUseCase(private val api: DashboardApi) {
    suspend operator fun invoke(): Dashboard = coroutineScope {
        val profile = async { api.profile() }
        val feed = async { api.feed() }
        Dashboard(profile.await(), feed.await())
    }
}

class DashboardViewModel(
    private val loadDashboard: LoadDashboardUseCase,
) : ViewModel() {
    fun refresh() = viewModelScope.launch {
        _state.value = DashboardState.Loading
        _state.value = runCatching { loadDashboard() }
            .fold(::DashboardState.Content, ::DashboardState.Error)
    }
}
```

Здесь уход с экрана отменяет `viewModelScope`, а через него — use case и оба запроса. `coroutineScope`
в use case не дублирует ViewModel scope: он выражает, что два запроса являются одной операцией и должны
быть дожданы до возврата.

Для работы, сознательно переживающей caller, внешний scope передают через DI и обязательно дают ему
владельца. Repository не создаёт scope сам:

```kotlin
class BookmarkRepository(
    private val dataSource: BookmarkDataSource,
    private val applicationScope: CoroutineScope,
) {
    fun bookmark(articleId: String): Job = applicationScope.launch {
        dataSource.savePending(articleId)
        dataSource.sync(articleId)
    }
}
```

Это допустимо только если контракт действительно fire-and-forget и вызывающий не ждёт результата. Для
гарантированной доставки после смерти процесса одной coroutine недостаточно: сохраните намерение в БД
и передайте выполнение `WorkManager`. `lifecycleScope` выбирают для View/Fragment-работы, которую не
следует переживать уничтожение View; `rememberCoroutineScope()` — для событий Compose. Эти scopes не
взаимозаменяемы с `viewModelScope`: например, запрос состояния экрана не должен отменяться на каждом
пересоздании View.

## 0.7. Таймауты и параллельная загрузка

`withTimeout` задаёт deadline и при истечении отменяет свой блок через `TimeoutCancellationException`.
Это отмена, а не обычная бизнес-ошибка: код внутри должен быть cooperative и освобождать ресурсы в
`finally`. `withTimeoutOrNull` удобен, когда timeout ожидаем и `null` однозначно означает «результат не
получен вовремя».

### Общий deadline: либо весь dashboard, либо ошибка

Если экран бесполезен без всех частей, общий timeout оборачивает весь `coroutineScope`. При истечении
срока отменяются все дочерние `async`.

```kotlin
suspend fun loadDashboard(api: DashboardApi): Dashboard = withTimeout(1_500) {
    coroutineScope {
        val profile = async { api.profile() }
        val feed = async { api.feed() }
        val notifications = async { api.notifications() }

        Dashboard(profile.await(), feed.await(), notifications.await())
    }
}
```

В UI `TimeoutCancellationException` переводят в отдельное состояние вроде `DashboardState.SlowNetwork`.
Не ловите общий `CancellationException`: это поглотит и отмену ViewModel, которую нужно пробросить.

### Индивидуальный deadline: отбросить только опоздавшую задачу

Если виджеты независимы, используйте `supervisorScope` и timeout внутри каждой задачи. Быстрые результаты
сохраняются, а истёкшая задача отменяется и превращается в понятный результат.

```kotlin
sealed interface LoadResult<out T> {
    data class Value<T>(val value: T) : LoadResult<T>
    data object TimedOut : LoadResult<Nothing>
    data class Failed(val error: Throwable) : LoadResult<Nothing>
}

suspend fun <T> loadWithin(
    timeoutMs: Long,
    block: suspend () -> T,
): LoadResult<T> = try {
    withTimeout(timeoutMs) { LoadResult.Value(block()) }
} catch (error: TimeoutCancellationException) {
    LoadResult.TimedOut
} catch (error: CancellationException) {
    throw error
} catch (error: Throwable) {
    LoadResult.Failed(error)
}

suspend fun loadWidgets(api: WidgetsApi): Widgets = supervisorScope {
    val weather = async { loadWithin(800) { api.weather() } }
    val news = async { loadWithin(1_200) { api.news() } }
    val stocks = async { loadWithin(500) { api.stocks() } }

    Widgets(weather.await(), news.await(), stocks.await())
}
```

Здесь `supervisorScope` нужен именно потому, что `Failed` и `TimedOut` — допустимые данные для каждого
виджета. Если ошибка любой части должна отменять остальные, уберите `loadWithin` и используйте обычный
`coroutineScope` с общим deadline.

### Первый успешный ответ: отменить проигравшую реплику

Для двух зеркал или cache/network race можно взять первый ответ и отменить проигравшую работу. Это нужно
редко: лишний запрос может стоить денег или создать побочный эффект, поэтому применимо только к идемпотентным
read-операциям.

```kotlin
suspend fun loadFromFastestReplica(api: ReplicaApi): Payload = coroutineScope {
    val primary = async { api.primary() }
    val secondary = async { api.secondary() }

    try {
        select {
            primary.onAwait { it }
            secondary.onAwait { it }
        }
    } finally {
        primary.cancel()
        secondary.cancel()
    }
}
```

`select` возвращает первый завершившийся `Deferred`, включая ошибку. Если нужен «первый успешный», а ошибка
одной реплики не должна завершать поиск, потребуется `supervisorScope` и явная политика retry/fallback;
не маскируйте ошибку простым `runCatching`, иначе легко получить бесконечное ожидание.

### Тест deadline без реального ожидания

`runTest` и `StandardTestDispatcher` позволяют проверить отмену задачи мгновенно в виртуальном времени:

```kotlin
@Test
fun `drops only a widget that exceeds its timeout`() = runTest {
    val api = FakeWidgetsApi(
        weatherDelay = 100.milliseconds,
        newsDelay = 2.seconds,
        stocksDelay = 100.milliseconds,
    )

    val widgets = loadWidgets(api)

    assertIs<LoadResult.Value<Weather>>(widgets.weather)
    assertEquals(LoadResult.TimedOut, widgets.news)
    assertIs<LoadResult.Value<Stocks>>(widgets.stocks)
}
```

Такой тест поймает ошибку, при которой общий `coroutineScope` случайно отменяет успешные виджеты вместе
с опоздавшим. В production timeout подбирают по SLO и наблюдаемой latency, а не по произвольному числу;
timeout не исправляет зависшую неблокирующую операцию, если её API игнорирует отмену.

---

# 1. Корутины в Android-компонентах

## 1.1. Какой scope выбрать

| Scope | Живёт | Для чего |
| --- | --- | --- |
| `viewModelScope` | до `onCleared()` ViewModel | загрузка данных экрана, обработка событий UI |
| `lifecycleScope` | до уничтожения LifecycleOwner | работа, жёстко привязанная к экрану |
| `rememberCoroutineScope()` | пока composable в композиции | корутины из колбэков UI |
| scope в `CoroutineWorker` | пока выполняется работа | фоновая работа с гарантией доставки |
| собственный `CoroutineScope` в синглтоне | пока жив процесс | app-scoped работа: синхронизация, кэш-прогрев |
| `GlobalScope` | до смерти процесса, вне дерева | практически никогда |

Про app-scoped scope стоит уметь рассказать: он создаётся руками и живёт в DI.

```kotlin
@Provides @Singleton @ApplicationScope
fun provideAppScope(): CoroutineScope =
    CoroutineScope(SupervisorJob() + Dispatchers.Default)
```

`SupervisorJob` здесь принципиален: падение одной фоновой задачи не должно убивать все остальные
на всё время жизни процесса.

## 1.2. Классическая ошибка: работа, которая должна пережить экран

```kotlin
// ❌ пользователь ушёл с экрана — отправка отменилась на середине
fun sendMessage(text: String) = viewModelScope.launch { api.send(text) }
```

Правильный ответ на интервью: отправка сообщения не принадлежит экрану. Она принадлежит приложению,
а лучше — системе. Пишем в БД со статусом `PENDING`, ставим `WorkManager`, экран отображает статус
из БД. Тогда операция переживает и уход с экрана, и смерть процесса.

## 1.3. Сбор Flow в UI

```kotlin
// View-система
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.state.collect { render(it) }
    }
}

// Compose
val state by viewModel.state.collectAsStateWithLifecycle()
```

Что здесь важно понимать: `lifecycleScope.launch { flow.collect() }` без `repeatOnLifecycle`
продолжает собирать, когда экран в фоне. Это не «утечка» в классическом смысле, но это работа
и трафик в фоне и потенциальные апдейты UI, который не виден.

`repeatOnLifecycle` **отменяет и перезапускает** корутину на каждом переходе STARTED/STOPPED.
Для холодного upstream это означает новый запрос при каждом возврате на экран — если это нежелательно,
upstream шарится через `stateIn`/`shareIn`.

## 1.4. Почему `WhileSubscribed(5000)`

```kotlin
val state: StateFlow<UiState> = repository.observeItems()
    .map(::toUiState)
    .stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UiState.Loading,
    )
```

Пять секунд — это запас на поворот экрана: подписчик исчезает и появляется снова, upstream за это время
не успевает остановиться, и повторного запроса не происходит. `Eagerly` держит upstream всегда,
`Lazily` — с первой подписки и навсегда.

## 1.5. `CoroutineWorker`

```kotlin
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val syncRepository: SyncRepository,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result = try {
        syncRepository.sync()
        Result.success()
    } catch (e: CancellationException) {
        throw e
    } catch (e: IOException) {
        if (runAttemptCount < 5) Result.retry() else Result.failure()
    }
}
```

Два момента, о которых спрашивают: `CancellationException` нужно пробрасывать (иначе вы «съедаете»
отмену от системы), а перезапуски считаются через `runAttemptCount` — бесконечный retry съест батарею.

---

# 2. Тестирование корутин и Flow

## 2.1. `runTest` и виртуальное время

`runTest` заменяет реальные задержки виртуальным временем: `delay(10.seconds)` выполняется мгновенно,
но с точки зрения корутины проходит десять секунд. Это делает тесты и быстрыми, и детерминированными.

```kotlin
@Test
fun `succeeds on third attempt`() = runTest {
    val api = FailingApi(failures = 2)                     // падает дважды, потом отдаёт данные

    val result = retryWithBackoff(times = 3) { api.load() }

    assertEquals(Data("ok"), result)
    assertEquals(3, api.attempts)                          // times = 3 → всего три попытки
}

@Test
fun `fails after exhausting attempts`() = runTest {
    val api = FailingApi(failures = Int.MAX_VALUE)

    assertFailsWith<IOException> { retryWithBackoff(times = 3) { api.load() } }

    assertEquals(3, api.attempts)
}
```

Тест на успех и тест на исчерпание попыток — это два разных теста, и именно второй ловит
off-by-one в `repeat(times - 1)`. Если в проекте есть только первый, ошибку «делаем на одну
попытку меньше» никто не заметит.

Три вещи про `runTest`, о которых стоит знать до того, как они съедят полдня:

- **Виртуальное время работает только для `TestDispatcher`.** `withContext(Dispatchers.IO) { delay(10.seconds) }`
  внутри `runTest` подождёт настоящие десять секунд, а `Thread.sleep` — тем более. Отсюда правило
  инъекции диспетчеров из 2.6: то, что не подменено, не ускоряется.
- **У `runTest` есть таймаут** (по умолчанию 60 секунд на тест). Тест, который «висит», не висит
  вечно — он падает с `UncompletedCoroutinesError`, и это подсказка, что вы кого-то не дождались
  или, наоборот, ждёте бесконечный поток.
- **Бесконечные корутины запускайте в `backgroundScope`, а не в `this`.** `runTest` в конце ждёт
  завершения всех детей тестовой корутины, поэтому `launch { someStateFlow.collect { } }` в теле
  теста повесит его до таймаута. Корутины из `backgroundScope` отменяются автоматически по
  завершении теста — это штатный способ тестировать «горячие» подписки.

## 2.2. `StandardTestDispatcher` vs `UnconfinedTestDispatcher`

- **`StandardTestDispatcher`** (по умолчанию в `runTest`) ставит новые корутины в очередь, а не
  выполняет сразу: управление они получают, когда тестовая корутина приостановится или когда вы
  прокрутите планировщик руками — `advanceUntilIdle()`, `runCurrent()`, `advanceTimeBy(...)`.
  Важная деталь: `runTest` в конце тела теста сам делает эквивалент `advanceUntilIdle()`, поэтому
  «ничего не выполнилось вообще» не бывает — бывает «выполнилось позже, чем вы проверили».
  Даёт точный контроль над порядком.
- **`UnconfinedTestDispatcher`** выполняет корутины немедленно, до первой настоящей приостановки.
  Удобен, когда вам не важен порядок и нужно просто «чтобы состояние уже применилось».

Практическое правило обратное распространённому: по умолчанию берите **`Standard`** и явно
прокручивайте время, а `Unconfined` — только там, где ручная прокрутка мешает читать тест.
`Unconfined` меняет порядок выполнения относительно продакшена, поэтому тесты на нём легко
проходят при сломанном коде и наоборот. Для промежуточных состояний правильный инструмент —
не `Unconfined`, а Turbine (см. 2.4), который подписывается до начала действия.

## 2.3. `MainDispatcherRule`

`Dispatchers.Main` в JVM-тестах не существует — отсюда ошибка «Module with the Main dispatcher had failed to initialize».

```kotlin
class MainDispatcherRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher(),
) : TestWatcher() {
    override fun starting(description: Description) { Dispatchers.setMain(dispatcher) }
    override fun finished(description: Description) { Dispatchers.resetMain() }
}

class FeedViewModelTest {
    @get:Rule val mainDispatcherRule = MainDispatcherRule()
}
```

`UnconfinedTestDispatcher` в дефолте здесь — сознательный компромисс и та же конвенция, что в
Now in Android: он избавляет от прокрутки времени в `init`-блоке ViewModel, из-за которого иначе
падает половина тестов. Если тест проверяет порядок или тайминги, передайте
`MainDispatcherRule(StandardTestDispatcher())` явно. Уметь объяснить, почему дефолт именно такой
и когда его надо переопределить, — ровно тот уровень детализации, который ждут от senior.

## 2.4. Turbine

```kotlin
@Test
fun `emits loading then content`() = runTest {
    val viewModel = FeedViewModel(FakeFeedRepository(items))

    viewModel.state.test {
        assertEquals(FeedUiState.Loading, awaitItem())
        assertEquals(FeedUiState.Content(items), awaitItem())
        cancelAndIgnoreRemainingEvents()
    }
}
```

Полезные методы: `awaitItem()`, `awaitError()`, `awaitComplete()`, `expectNoEvents()`, `skipItems(n)`,
`cancelAndIgnoreRemainingEvents()`. Turbine падает, если в конце теста остались непрочитанные эмиссии —
это фича, она ловит «лишние» состояния.

## 2.5. Ловушка с `StateFlow`

`StateFlow` конфлейтит значения: если состояние сменилось `Loading → Content` быстрее, чем коллектор
успел прочитать, тест увидит только `Content`. Поэтому:

- либо подписывайтесь до запуска действия (Turbine именно так и работает);
- либо используйте `UnconfinedTestDispatcher`, чтобы состояния применялись синхронно;
- либо тестируйте не `StateFlow`, а лежащий под ним холодный `Flow`.

Отдельный практический кейс, который спрашивают чаще всего: **как тестировать `stateIn(WhileSubscribed)`**.
Без подписчика такой поток не производит значений вообще, поэтому наивный тест видит только
`initialValue` и делает вывод «ViewModel не работает».

```kotlin
@Test
fun `loads content when subscribed`() = runTest {
    val viewModel = FeedViewModel(FakeFeedRepository(items))

    // подписка живёт в backgroundScope: она нужна, чтобы upstream проснулся,
    // и не должна удерживать завершение теста
    backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
        viewModel.state.collect()
    }

    viewModel.state.test {
        assertEquals(FeedUiState.Content(items), awaitItem())
    }
}
```

Либо, что проще и обычно достаточно, полагайтесь на то, что `Turbine`-подписка сама является
подписчиком и активирует `WhileSubscribed` — тогда отдельный `backgroundScope.launch` не нужен.
Знать оба варианта полезно: первый нужен, когда вы проверяете именно поведение при появлении
и уходе подписчиков (например, что `stateIn` не перезапрашивает данные при повороте экрана).

## 2.6. Инъекция диспетчеров

Код, который жёстко зашивает `Dispatchers.IO`, тестируется плохо.

```kotlin
class UserRepository(
    private val api: Api,
    private val io: CoroutineDispatcher = Dispatchers.IO,
) {
    suspend fun load(id: String) = withContext(io) { api.user(id) }
}
```

В тесте передаёте `StandardTestDispatcher(testScheduler)` — и виртуальное время работает и внутри репозитория.
На интервью это хороший ответ на «как вы проектируете под тестируемость».

## 2.7. Что тестировать не нужно

Не тестируйте, что `launch` запустил корутину, а `map` смапил. Тестируйте поведение:
последовательность состояний, обработку ошибок, отмену, конкурентные сценарии (два запроса подряд,
пользователь ушёл с экрана в середине загрузки).

---

# 3. Мосты в мир колбэков

## 3.1. `suspendCancellableCoroutine` — для одноразового результата

```kotlin
suspend fun FusedLocationProviderClient.awaitLocation(): Location =
    suspendCancellableCoroutine { cont ->
        val task = lastLocation
        task.addOnSuccessListener { cont.resume(it) }
        task.addOnFailureListener { cont.resumeWithException(it) }
        cont.invokeOnCancellation { /* отменить запрос */ }
    }
```

Почему именно `Cancellable`: обычный `suspendCoroutine` не умеет реагировать на отмену,
и корутина зависнет до ответа колбэка, даже если её родитель уже отменён.

## 3.2. `callbackFlow` — для потока событий

```kotlin
fun ConnectivityManager.networkAvailability(): Flow<Boolean> = callbackFlow {
    val callback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) { trySend(true) }
        override fun onLost(network: Network) { trySend(false) }
    }
    registerDefaultNetworkCallback(callback)
    awaitClose { unregisterNetworkCallback(callback) }   // обязателен
}
    .distinctUntilChanged()
    .conflate()
```

`awaitClose` не опционален: без него `callbackFlow` бросит исключение, а слушатель останется
зарегистрированным — это настоящая утечка.

Разница с `channelFlow`: `callbackFlow` предназначен именно для колбэков и требует `awaitClose`;
`channelFlow` — более общий инструмент для случаев, когда эмиссия идёт из нескольких корутин
(в обычном `flow { }` эмитить из другой корутины запрещено).

---

# 4. Паттерны, которые дают на лайв-кодинге

## 4.1. Retry с экспоненциальным backoff и джиттером

```kotlin
suspend fun <T> retryWithBackoff(
    times: Int = 3,
    initialDelay: Duration = 500.milliseconds,
    maxDelay: Duration = 10.seconds,
    factor: Double = 2.0,
    shouldRetry: (Throwable) -> Boolean = { it is IOException },
    block: suspend () -> T,
): T {
    require(times >= 1) { "times must be >= 1" }
    val maxDelayMs = maxDelay.inWholeMilliseconds
    var delayMs = initialDelay.inWholeMilliseconds.coerceAtMost(maxDelayMs)
    repeat(times - 1) {
        try {
            return block()
        } catch (e: CancellationException) {
            throw e                                   // отмену не ретраим
        } catch (e: Throwable) {
            if (!shouldRetry(e)) throw e
        }
        val jitter = if (delayMs >= 2) Random.nextLong(delayMs / 2) else 0L
        delay(delayMs + jitter)                       // джиттер против «стада»
        delayMs = (delayMs * factor).toLong().coerceAtMost(maxDelayMs)
    }
    return block()
}
```

`times` здесь — общее число **попыток**, а не число повторов: `times = 3` означает один вызов
плюс два ретрая. Это первое, что стоит проговорить вслух, потому что интервьюер почти наверняка
спросит «сколько раз вызовется `block`».

На follow-up почти всегда спрашивают ещё две вещи: почему `CancellationException` обрабатывается
отдельно (иначе вы ретраите отменённую операцию и ломаете structured concurrency) и зачем джиттер
(чтобы тысячи клиентов после падения сервера не пришли одновременно).

Три граничных случая, на которых такой код обычно и ломается — их полезно назвать до того, как
о них спросят: `Random.nextLong(0)` бросает `IllegalArgumentException`, поэтому джиттер нужно
защищать при очень маленькой задержке; `maxDelay` должен ограничивать и первую задержку тоже,
а не только результат умножения; `times = 0` не должен молча означать «один вызов».

## 4.2. Параллельная обработка с ограничением

```kotlin
suspend fun <T, R> Iterable<T>.mapParallel(
    concurrency: Int,
    transform: suspend (T) -> R,
): List<R> = coroutineScope {
    val semaphore = Semaphore(concurrency)
    map { item -> async { semaphore.withPermit { transform(item) } } }.awaitAll()
}
```

Почему `coroutineScope`, а не `CoroutineScope(...)`: первое ждёт всех детей и корректно пробрасывает
отмену и ошибки; второе создаёт независимый scope и утечку.

Альтернатива без семафора — `Dispatchers.IO.limitedParallelism(n)`, но она ограничивает потоки,
а не логические задачи. Уметь объяснить разницу — плюс.

## 4.3. Дедупликация одновременных запросов (single-flight)

### Что делает `Mutex`

`kotlinx.coroutines.sync.Mutex` защищает критическую секцию так, чтобы одновременно внутри неё
находилась только одна корутина. Если mutex уже занят, следующая корутина **приостанавливается**,
а не блокирует текущий поток. Поэтому `Mutex` подходит для coroutine-кода, в отличие от попытки
удерживать `synchronized`/`ReentrantLock` через suspension point.

Обычный шаблон:

```kotlin
private val mutex = Mutex()

suspend fun updateSafely() {
    mutex.withLock {
        // Чтение и изменение общего mutable state.
    }
}
```

`withLock` освобождает mutex в `finally`, в том числе если код внутри бросил исключение или корутина
была отменена. Ожидание свободного mutex cancellable: отменённая ожидающая корутина перестаёт
претендовать на вход.

Важные свойства:

- `Mutex` защищает **инвариант**, а не отдельную строку кода;
- он не привязан к потоку: корутина может приостановиться и продолжиться на другом;
- он не реентерабельный — повторный `withLock` того же mutex из критической секции приводит к зависанию;
- он сериализует работу, поэтому долгий network/disk вызов под общим mutex допустим только осознанно;
- для нескольких одновременных разрешений нужен `Semaphore`, а для простой числовой операции часто
  лучше atomic или `MutableStateFlow.update`.

### Пример 1. Счётчик с составной операцией

`counter++` — это чтение, вычисление и запись, а не одна атомарная операция:

```kotlin
class SafeCounter {
    private val mutex = Mutex()
    private var value = 0

    suspend fun increment() {
        mutex.withLock {
            value += 1
        }
    }

    suspend fun current(): Int =
        mutex.withLock { value }
}

suspend fun countConcurrently(): Int = coroutineScope {
    val counter = SafeCounter()

    repeat(1_000) {
        launch(Dispatchers.Default) {
            counter.increment()
        }
    }

    // coroutineScope дождётся всех launch перед возвратом.
    counter
}.current()
```

Для одного счётчика `AtomicInteger` проще и быстрее. Пример показывает базовую механику; `Mutex`
становится особенно полезен, когда одним действием нужно согласованно изменить несколько значений.

### Пример 2. Атомарный перевод между счетами

Проверка баланса и обе записи составляют один инвариант, поэтому находятся в одной критической секции:

```kotlin
class Wallet {
    private val mutex = Mutex()
    private val balances = mutableMapOf<String, Long>()

    suspend fun deposit(account: String, amount: Long) {
        require(amount > 0)
        mutex.withLock {
            balances[account] = balances.getOrDefault(account, 0L) + amount
        }
    }

    suspend fun transfer(
        from: String,
        to: String,
        amount: Long,
    ) {
        require(amount > 0)

        mutex.withLock {
            val sourceBalance = balances.getOrDefault(from, 0L)
            require(sourceBalance >= amount) { "Insufficient funds" }

            balances[from] = sourceBalance - amount
            balances[to] = balances.getOrDefault(to, 0L) + amount
        }
    }

    suspend fun snapshot(): Map<String, Long> =
        mutex.withLock { balances.toMap() }
}
```

Если защищать списание и зачисление разными lock-вызовами, другая корутина сможет увидеть
промежуточное состояние, в котором деньги уже списаны, но ещё не зачислены.

### Продвинутый пример: single-flight

```kotlin
class SingleFlight<K, V>(private val scope: CoroutineScope) {
    private val mutex = Mutex()
    private val inFlight = mutableMapOf<K, Deferred<V>>()

    suspend fun run(key: K, block: suspend () -> V): V {
        val deferred = mutex.withLock {
            inFlight[key] ?: scope.async { block() }.also { inFlight[key] = it }
        }
        return try {
            deferred.await()
        } finally {
            // NonCancellable обязателен: без него отменённый вызывающий не доберётся
            // до withLock, и запись останется в карте навсегда
            withContext(NonCancellable) {
                mutex.withLock { if (inFlight[key] === deferred) inFlight.remove(key) }
            }
        }
    }
}
```

Классический сценарий применения — обновление протухшего токена, когда пять запросов одновременно
получили 401.

Две оговорки, которые нужно проговорить самому, — на интервью именно за них ставят плюс:

1. **Очистка в `finally` должна быть `NonCancellable`.** Если вызывающего отменили, а мьютекс в этот
   момент занят, `withLock` приостановится и сразу бросит `CancellationException` — `inFlight.remove`
   не выполнится, и в карте навсегда останется завершённый (возможно, упавший) `Deferred`.
   Дальше все запросы по этому ключу будут получать один и тот же старый результат или одну и ту же
   старую ошибку. Это ровно то правило, которое сформулировано в `Kotlin_Senior_Android_Guide.markdown`,
   раздел 12.6: работа, обязанная выполниться при отмене, оборачивается в `NonCancellable`.
2. **`scope` обязан быть с `SupervisorJob`.** `scope.async { }` при первой же ошибке отменит родителя,
   если это обычный `Job`, — и весь `SingleFlight` перестанет работать до конца жизни scope, причём
   молча. Плюс общий scope означает, что отмена одного вызывающего не отменяет саму операцию: это
   осознанный компромисс (в том и смысл дедупликации), но озвучить его надо.

## 4.4. Поиск с дебаунсом

```kotlin
private val query = MutableStateFlow("")

val results: StateFlow<SearchUiState> = query
    .debounce(300)
    .map(String::trim)
    .filter { it.length >= 2 }
    .distinctUntilChanged()
    .flatMapLatest { q ->
        searchRepository.search(q)
            .map<List<Item>, SearchUiState>(SearchUiState::Content)
            .onStart { emit(SearchUiState.Loading) }
            .catch { emit(SearchUiState.Error) }
    }
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SearchUiState.Idle)
```

Каждый оператор нужно уметь защитить: `debounce` — не дёргать сеть на каждую букву,
`distinctUntilChanged` — не повторять одинаковый запрос, `flatMapLatest` — отменить предыдущий поиск
(иначе результаты старого запроса могут прийти после нового), `catch` — не уронить весь Flow ошибкой,
`stateIn` — переживать поворот экрана.

## 4.5. Потокобезопасное состояние

```kotlin
private val _state = MutableStateFlow(CartState())

fun addItem(item: Item) {
    _state.update { it.copy(items = it.items + item) }   // атомарно, без гонок
}
```

`update` использует compare-and-set в цикле. Присваивание `_state.value = _state.value.copy(...)`
не атомарно и теряет обновления при конкурентных вызовах.

## 4.6. Кэш с TTL

```kotlin
class TtlCache<K, V>(private val ttl: Duration, private val clock: Clock = Clock.System) {
    private data class Entry<V>(val value: V, val expiresAt: Instant)

    private val mutex = Mutex()
    private val entries = mutableMapOf<K, Entry<V>>()

    suspend fun get(key: K, loader: suspend () -> V): V = mutex.withLock {
        val now = clock.now()
        entries[key]?.takeIf { it.expiresAt > now }?.value
            ?: loader().also { entries[key] = Entry(it, now + ttl) }
    }
}
```

Здесь намеренно два обсуждаемых недостатка, о которых лучше сказать самому: `loader()` вызывается
под мьютексом (сериализует все загрузки — можно совместить с single-flight),
и `Clock` инжектируется ради тестируемости.

---

# 5. «Что не так с этим кодом»

## 5.1

```kotlin
viewModelScope.launch {
    try {
        api.load()
    } catch (e: Exception) {   // ❌ поглотит CancellationException
        _state.value = Error
    }
}
```

При отмене экрана состояние уйдёт в `Error`, а structured concurrency сломается.
Правильно — ловить конкретные типы или пробрасывать `CancellationException` явно.

## 5.2

```kotlin
val a = async { loadA() }.await()   // ❌
val b = async { loadB() }.await()
```

Параллелизма нет: вторая корутина стартует после завершения первой. Нужно запустить оба `async`,
а потом сделать `awaitAll`.

## 5.3

```kotlin
flow {
    withContext(Dispatchers.IO) { emit(load()) }   // ❌ IllegalStateException
}
```

Нарушение context preservation. Правильно — `flow { emit(load()) }.flowOn(Dispatchers.IO)`.

## 5.4

```kotlin
suspend fun save() = withContext(Dispatchers.IO) {
    database.write()      // блокирующий вызов
    Thread.sleep(100)     // ❌ блокирует поток из пула, а не приостанавливает
}
```

`Thread.sleep` вместо `delay` занимает поток и игнорирует отмену.

## 5.5

```kotlin
class Repo {
    private val scope = CoroutineScope(Dispatchers.IO)   // ❌ никто не отменяет
    fun refresh() = scope.launch { api.refresh() }
}
```

Scope без владельца живёт вечно. Либо app-scoped scope из DI с осознанным решением,
либо `suspend fun`, чтобы вызывающий сам решал, в каком scope выполнять.

## 5.6

```kotlin
GlobalScope.launch { analytics.track(event) }   // ❌
```

Вне дерева structured concurrency: не отменяется, ошибки не всплывают, в тестах не контролируется.
Правильно — app-scoped scope, инжектированный через DI.

---

# 6. Чеклист самопроверки

1. Что означает `suspend`, а чего он не гарантирует?
2. Из каких ключевых элементов состоит `CoroutineContext` и за что отвечает каждый?
3. Чем `withContext` отличается от запуска новой coroutine через `launch` или `async`?
4. Что именно гарантирует structured concurrency?
5. Когда нужна fail-fast семантика `coroutineScope`, а когда оправдан `supervisorScope`?
6. Чем различаются контракты `launch`, `async` и `withContext`?
7. Почему `async { ... }.await()` в той же строке не даёт параллелизма?
8. Почему нельзя проглатывать `CancellationException` и как отменять долгий CPU-цикл?
9. Почему `CoroutineExceptionHandler` не заменяет `try/catch` вокруг `await`?
10. Чем конкурентность отличается от параллелизма и почему нельзя бездумно создать тысячи `async`?
11. Когда выбирать `Semaphore`, `limitedParallelism` и bounded worker pool?
12. Какой scope вы возьмёте для отправки сообщения, которое должно уйти, даже если пользователь ушёл с экрана?
13. Почему `SupervisorJob` обязателен в app-scoped scope?
14. Чем `repeatOnLifecycle` отличается от простого `collect` в `lifecycleScope`?
15. Что означает `WhileSubscribed(5000)` и что будет при `Eagerly`?
16. Зачем `runTest` подменяет время и как прокрутить его вручную?
17. `StandardTestDispatcher` vs `UnconfinedTestDispatcher` — когда какой?
18. Какую именно ошибку предотвращает `MainDispatcherRule`?
19. Почему тест `StateFlow` может не увидеть состояние `Loading` и как это чинить?
20. Зачем `awaitClose` в `callbackFlow` и что будет без него?
21. Почему `suspendCancellableCoroutine`, а не `suspendCoroutine`?
22. Зачем джиттер в backoff и почему `CancellationException` не ретраят?
23. Как обновить токен ровно один раз, если пять запросов получили 401 одновременно?
24. Почему `flatMapLatest` в поиске, а не `flatMapMerge`?
25. Чем `_state.update { }` лучше присваивания `_state.value = ...`?
