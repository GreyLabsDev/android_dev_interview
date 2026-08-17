# Корутины: Android-специфика, тестирование и паттерны для лайв-кодинга

Дополнение к разделам 12–14 файла `Kotlin_Senior_Android_Guide.markdown`. Там разобрана механика языка:
`suspend` и state machine, structured concurrency, отмена, диспетчеры, Flow, JMM. Здесь — то, чего там нет:
как это живёт в Android-компонентах, как это тестировать и какие задачи дают на лайв-кодинге.

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

1. Какой scope вы возьмёте для отправки сообщения, которое должно уйти, даже если пользователь ушёл с экрана?
2. Почему `SupervisorJob` обязателен в app-scoped scope?
3. Чем `repeatOnLifecycle` отличается от простого `collect` в `lifecycleScope`?
4. Что означает `WhileSubscribed(5000)` и что будет при `Eagerly`?
5. Зачем `runTest` подменяет время и как прокрутить его вручную?
6. `StandardTestDispatcher` vs `UnconfinedTestDispatcher` — когда какой?
7. Какую именно ошибку предотвращает `MainDispatcherRule`?
8. Почему тест `StateFlow` может не увидеть состояние `Loading` и как это чинить?
9. Зачем `awaitClose` в `callbackFlow` и что будет без него?
10. Почему `suspendCancellableCoroutine`, а не `suspendCoroutine`?
11. Зачем джиттер в backoff и почему `CancellationException` не ретраят?
12. Как ограничить параллелизм: `Semaphore` или `limitedParallelism`? В чём разница?
13. Как обновить токен ровно один раз, если пять запросов получили 401 одновременно?
14. Почему `flatMapLatest` в поиске, а не `flatMapMerge`?
15. Чем `_state.update { }` лучше присваивания `_state.value = ...`?
