# 20 задач для собеседования: Kotlin Coroutines

Задачи расположены от middle-сценариев с `suspend`-функциями до senior-уровня: конкурентных `Flow`-пайплайнов, lifecycle, сессий и тестов. Каждая рассчитана на обсуждение решения вслух: сначала назовите инвариант и владельца работы, затем исправьте код или объясните порядок выполнения.

Обозначения: **[Исправить]** - найти дефект в коде; **[Разобрать]** - предсказать выполнение; **[Реализовать]** - дописать решение. Часть задач комбинирует пометки, например «Разобрать и исправить»: сначала нужно объяснить фактическое поведение, а затем поправить код.

Предполагаются импорты из `kotlinx.coroutines`, `kotlinx.coroutines.flow` и, где нужно, AndroidX.

---

## Задачи

### 1. Граница dispatcher и cancellation

**[Исправить, senior]** `ProfileRepository` вызывается и из `ViewModel` (Main), и из фонового `WorkManager`-воркера. `legacyApi.fetchAndParse()` - синхронный блокирующий вызов. У класса два самостоятельных недостатка: (1) блокирующий вызов не имеет собственной границы диспетчера и исполняется на потоке caller-а, будь то Main или worker thread; (2) даже если добавить диспетчер прямо в теле функции, его нельзя будет подменить в unit-тесте. Назовите оба недостатка и перепишите репозиторий так, чтобы UI не блокировался, cancellation не терялась, а dispatcher был инъецируемым.

```kotlin
class ProfileRepository(
    private val legacyApi: LegacyApi,
    private val cache: Cache,
) {
    suspend fun refresh(): Profile {
        val profile = legacyApi.fetchAndParse()
        cache.write(profile)
        return profile
    }
}

viewModelScope.launch {
    render(repository.refresh())
}
```

Объясните, почему не стоит оборачивать весь вызов `repository.refresh()` в `withContext(IO)` прямо во ViewModel.

### 2. Атомарный экран с независимыми границами

**[Реализовать, senior]** Экран профиля обязан показать `Profile` и `Permissions` вместе. `ProfileApi` - корректный suspend HTTP API, `permissionsStore.readBlocking()` читает зашифрованный файл, а `avatarDecoder.decode()` CPU-bound. Реализуйте загрузку с параллельным стартом независимых частей, fail-fast семантикой и корректными dispatcher boundaries. Объясните, какая ошибка отменит sibling и почему.

```kotlin
data class ProfileScreen(
    val profile: Profile,
    val permissions: Permissions,
    val avatar: Avatar,
)

suspend fun loadProfileScreen(
    profileApi: ProfileApi,
    permissionsStore: PermissionsStore,
    avatarDecoder: AvatarDecoder,
    io: CoroutineDispatcher,
    default: CoroutineDispatcher,
): ProfileScreen = TODO()
```

### 3. Потерянная отмена

**[Исправить, senior]** Пользователь закрыл экран, но запрос продолжает работать и позже меняет общий кэш.

```kotlin
suspend fun refreshCache(api: Api) {
    CoroutineScope(Dispatchers.IO).launch {
        cache.save(api.load())
    }
}
```

Перепишите контракт так, чтобы caller владел lifetime и ошибкой.

### 4. `launch` против `async`

**[Разобрать, senior]** Что произойдёт при ошибке `api.feed()`? Почему `CoroutineExceptionHandler` здесь не делает результат `null`?

```kotlin
val handler = CoroutineExceptionHandler { _, error -> log(error) }

viewModelScope.launch(handler) {
    val profile = async { api.profile() }
    val feed = async { api.feed() }
    show(profile.await(), feed.await())
}
```

Нужно показать либо весь экран, либо ошибку, без частичного состояния. Исправьте.

### 5. Последовательность вместо параллельности

**[Исправить, senior]** Два независимых HTTP-запроса занимают сумму времён, хотя должны выполняться одновременно.

```kotlin
suspend fun loadDashboard(api: Api): Dashboard {
    val profile = api.profile()
    val notifications = api.notifications()
    return Dashboard(profile, notifications)
}
```

### 6. Частичный dashboard

**[Реализовать, senior]** Виджеты погоды и новостей независимы. Верните оба результата так, чтобы ошибка одного не отменяла другой. Отмена экрана по-прежнему должна отменять обе операции.

```kotlin
sealed interface Widget<out T> {
    data class Data<T>(val value: T) : Widget<T>
    data class Error(val cause: Throwable) : Widget<Nothing>
}

suspend fun loadWidgets(api: Api): Pair<Widget<Weather>, Widget<News>> = TODO()
```

### 7. Отмена не является ошибкой UI

**[Исправить, senior]** При повороте экрана UI показывает «Не удалось загрузить данные».

```kotlin
try {
    _state.value = UiState.Content(api.load())
} catch (error: Exception) {
    _state.value = UiState.Error(error.message ?: "Unknown")
}
```

### 8. Cleanup при отмене

**[Исправить, senior]** Upload можно отменить, но серверный temporary upload надо освободить всегда. Почему код ниже иногда не вызывает `release` и как исправить?

```kotlin
suspend fun upload(file: File, api: UploadApi) {
    val id = api.start(file)
    api.send(id, file)
    api.release(id)
}
```

Ограничьте cleanup одной секундой.

### 9. CPU-цикл и кооперативная отмена

**[Исправить, senior]** Кнопка Cancel не действует, пока не завершится вычисление.

```kotlin
suspend fun findMatches(items: List<Item>): List<Match> = withContext(Dispatchers.Default) {
    items.map(::expensiveMatch)
}
```

### 10. Concurrency limit

**[Реализовать, senior]** Реализуйте `fetchAll`, который сохраняет порядок URL и делает не более четырёх запросов одновременно. Ошибка одного запроса должна отменить остальные.

```kotlin
suspend fun fetchAll(urls: List<String>, api: Api): List<Response> = TODO()
```

### 11. Timeout и fallback

**[Исправить, senior]** Медленный recommendations endpoint не должен ломать профиль. После 800 мс нужно показать пустой список; реальные сетевые ошибки тоже дают пустой список, а отмену caller нельзя проглотить.

```kotlin
suspend fun loadScreen(api: Api): Screen = coroutineScope {
    val profile = async { api.profile() }
    val recommendations = async { api.recommendations() }
    Screen(profile.await(), recommendations.await())
}
```

### 12. Cold Flow

**[Разобрать, senior]** Сколько раз выполнится запрос и почему?

```kotlin
fun user(): Flow<User> = flow {
    println("request")
    emit(api.user())
}

val source = user()
source.collect(::renderHeader)
source.collect(::renderAvatar)
```

Измените API так, чтобы один запрос обслуживал оба подписчика в `ViewModel`.

### 13. Search без устаревших результатов

**[Реализовать, senior]** Из `queries: Flow<String>` постройте `Flow<UiState>`. Пустая строка показывает `Empty`; ввод debounce-ится на 300 мс; одинаковые запросы не повторяются; старый поиск отменяется новым; ошибка становится `UiState.Error`, но поток не завершается.

```kotlin
sealed interface UiState {
    data object Empty : UiState
    data object Loading : UiState
    data class Content(val items: List<Item>) : UiState
    data class Error(val cause: Throwable) : UiState
}

fun searchState(queries: Flow<String>, api: Api): Flow<UiState> = TODO()
```

### 14. `flow {}` и context preservation

**[Исправить, senior]** Этот код падает с нарушением Flow invariant. Почему?

```kotlin
fun loadItems(): Flow<List<Item>> = flow {
    withContext(Dispatchers.IO) {
        emit(api.items())
    }
}
```

### 15. Backpressure: последние данные важнее всех

**[Реализовать, senior]** Сенсор выдаёт позицию 60 раз в секунду, `render` занимает 100 мс. Нужна отзывчивая карта: во время рендера промежуточные позиции можно отбросить, но после него нужно отрисовать последнюю доступную. `scope` принадлежит владельцу экрана и отменяется вместе с ним. Выберите оператор и объясните, почему не `buffer()`.

```kotlin
fun renderPositions(positions: Flow<Position>, scope: CoroutineScope): Job = TODO()
```

### 16. Callback API в Flow

**[Реализовать, senior]** Оберните API ниже в `Flow<Location>`. Подписка должна сниматься при отмене collector; ошибка должна завершать flow.

```kotlin
interface LocationClient {
    fun subscribe(listener: Listener)
    fun unsubscribe(listener: Listener)

    interface Listener {
        fun onLocation(value: Location)
        fun onError(error: Throwable)
    }
}

fun LocationClient.locations(): Flow<Location> = TODO()
```

### 17. `StateFlow`, lifecycle и лишняя работа

**[Исправить, senior]** После ухода с экрана сеть продолжает обновляться, а при возврате появляются две подписки.

```kotlin
class CatalogViewModel(repository: CatalogRepository) : ViewModel() {
    val state = repository.catalog()
        .map { UiState.Content(it) }
}

override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewModel.state.collect(::render)
    }
}
```

### 18. SharedFlow event и rotation

**[Разобрать и исправить, senior]** Почему навигация может потеряться после поворота или повториться при возврате на экран? Предложите контракт для одноразового события.

```kotlin
private val _events = MutableSharedFlow<Event>(replay = 1)
val events = _events.asSharedFlow()

fun onPaymentDone() {
    _events.tryEmit(Event.OpenReceipt)
}
```

### 19. Concurrent refresh token

**[Реализовать, senior+]** Десять запросов одновременно получили `401`. Реализуйте координатор: в каждый момент выполняется не более одного `refresh`; все ожидающие получают тот же новый token; при отмене одного ожидания общий refresh не отменяется; после ошибки следующая попытка может стартовать заново.

```kotlin
class TokenRefresher(private val authApi: AuthApi) {
    suspend fun refresh(): String = TODO()
}
```

### 20. Детерминированный тест Flow и retry

**[Разобрать и исправить, senior+]** Функция ниже задумана так: сначала `Loading`, затем после двух `IOException` - `Content`. Но `retryWhen` при `true` перезапускает **весь** upstream `flow {}` заново, включая `emit(UiState.Loading)`. Напишите тест с `runTest` (без реального `delay`/`Thread.sleep`), который зафиксирует фактическую последовательность состояний, а затем исправьте функцию так, чтобы `Loading` эмитился ровно один раз независимо от числа повторов, и обновите тест под исправленную версию.

```kotlin
fun loadWithRetry(api: Api): Flow<UiState> = flow {
    emit(UiState.Loading)
    emit(UiState.Content(api.items()))
}.retryWhen { cause, attempt ->
    cause is IOException && attempt < 2 && run {
        delay(1_000)
        true
    }
}
```

---

# Решения и разбор

## 1. Граница dispatcher и cancellation

`suspend` не меняет dispatcher: blocking fetch/parse выполнится на Main при вызове из `viewModelScope`. Граница с блокирующей библиотекой принадлежит repository, а dispatcher инъецируется для теста. `withContext` сохраняет cancellation и ошибку в дереве caller.

```kotlin
class ProfileRepository(
    private val legacyApi: LegacyApi,
    private val cache: Cache,
    private val io: CoroutineDispatcher,
) {
    suspend fun refresh(): Profile = withContext(io) {
        legacyApi.fetchAndParse().also(cache::write)
    }
}
```

ViewModel не должен знать, блокирует ли внутренняя реализация repository поток: иначе это знание размазывается по callers и легко пропускается в background worker. Альтернатива - разделить `fetchBlocking` и CPU parsing между инъецируемыми `io`/`default` dispatcher-ами, если profiling показывает, что parsing существенно нагружает CPU.

## 2. Атомарный экран с независимыми границами

`coroutineScope` выражает атомарность: ошибка любой обязательной части отменит siblings и выйдет к owner. Suspend HTTP API не нужно насильно переносить на `IO`; blocking file read и CPU decode получают свои границы.

```kotlin
suspend fun loadProfileScreen(
    profileApi: ProfileApi,
    permissionsStore: PermissionsStore,
    avatarDecoder: AvatarDecoder,
    io: CoroutineDispatcher,
    default: CoroutineDispatcher,
): ProfileScreen = coroutineScope {
    val profile = async { profileApi.profile() }
    val permissions = async { withContext(io) { permissionsStore.readBlocking() } }
    val avatar = async {
        val bytes = profileApi.avatarBytes()
        withContext(default) { avatarDecoder.decode(bytes) }
    }
    ProfileScreen(profile.await(), permissions.await(), avatar.await())
}
```

Например, ошибка расшифровки permissions отменит ещё незавершённый avatar download: экран не может считаться валидным без permissions. Альтернатива - `supervisorScope` и явный `Result` для avatar, если продукт допускает показать профиль без изображения.

## 3. Потерянная отмена

Вручную созданный scope не принадлежит caller, поэтому screen scope не отменяет его и не получает ошибку. Suspend-функция должна вернуть результат в том же дереве работ.

```kotlin
suspend fun refreshCache(api: Api) {
    val value = api.load()
    cache.save(value)
}

// Владелец выбирает lifetime.
viewModelScope.launch { refreshCache(api) }
```

Если `cache.save` блокирующий, только его границу оборачивают в `withContext(Dispatchers.IO)`. Альтернатива для application-wide гарантированной доставки - WorkManager, а не глобальный coroutine scope.

## 4. `launch` против `async`

Ошибка дочернего `async` отменит обычный родительский `launch` и sibling; `await()` выбросит исключение. Handler только последняя точка для необработанной ошибки root `launch`, не превращает результат `async` в `null` и не восстанавливает уже отменённое дерево.

```kotlin
viewModelScope.launch {
    try {
        val dashboard = coroutineScope {
            val profile = async { api.profile() }
            val feed = async { api.feed() }
            Dashboard(profile.await(), feed.await())
        }
        show(dashboard.profile, dashboard.feed)
    } catch (error: CancellationException) {
        throw error
    } catch (error: IOException) {
        showError(error)
    }
}
```

`coroutineScope` явно выражает атомарность экрана. Альтернатива - `awaitAll`, если результаты однородны.

## 5. Последовательность вместо параллельности

Нужно стартовать обе работы до первого ожидания и связать их structured concurrency.

```kotlin
suspend fun loadDashboard(api: Api): Dashboard = coroutineScope {
    val profile = async { api.profile() }
    val notifications = async { api.notifications() }
    Dashboard(profile.await(), notifications.await())
}
```

При ошибке одного запроса второй отменяется: это правильно, когда dashboard невалиден без любого поля. Время приблизительно $max(t_{profile}, t_{notifications})$.

## 6. Частичный dashboard

`supervisorScope` сохраняет связь с родителем, но не отменяет sibling при ошибке. Ошибку надо преобразовать в доменный результат, обязательно пробросив cancellation.

```kotlin
suspend fun <T> widget(block: suspend () -> T): Widget<T> = try {
    Widget.Data(block())
} catch (error: CancellationException) {
    throw error
} catch (error: Throwable) {
    Widget.Error(error)
}

suspend fun loadWidgets(api: Api): Pair<Widget<Weather>, Widget<News>> = supervisorScope {
    val weather = async { widget { api.weather() } }
    val news = async { widget { api.news() } }
    weather.await() to news.await()
}
```

Альтернатива - `async { runCatching { ... } }`, но нужно вручную не превратить `CancellationException` в обычный failure.

## 7. Отмена не является ошибкой UI

Широкий `catch (Exception)` ловит `CancellationException`. Её надо немедленно пробросить.

```kotlin
try {
    _state.value = UiState.Content(api.load())
} catch (error: CancellationException) {
    throw error
} catch (error: IOException) {
    _state.value = UiState.Error("Network error")
}
```

Альтернатива - ловить только ожидаемые доменные/сетевые исключения, тогда cancellation не попадёт в catch вовсе.

## 8. Cleanup при отмене

После отмены строка `release` не будет достигнута. `finally` выполняется при отмене, но suspend cleanup требует `NonCancellable`. В нём допустим только короткий cleanup, а не продолжение business flow.

```kotlin
suspend fun upload(file: File, api: UploadApi) {
    val id = api.start(file)
    try {
        api.send(id, file)
    } finally {
        withContext(NonCancellable) {
            withTimeoutOrNull(1_000) { api.release(id) }
        }
    }
}
```

Альтернатива для гарантированного удаления после смерти процесса - server-side TTL временной загрузки либо WorkManager cleanup.

## 9. CPU-цикл и кооперативная отмена

CPU-код не имеет suspension point. Добавляем `ensureActive()` между единицами работы.

```kotlin
suspend fun findMatches(items: List<Item>): List<Match> = withContext(Dispatchers.Default) {
    items.map { item ->
        ensureActive()
        expensiveMatch(item)
    }
}
```

Альтернатива - `yield()` с подходящей периодичностью. Частота проверки - компромисс между latency отмены и overhead.

## 10. Concurrency limit

`Semaphore` задаёт доменный лимит, а `coroutineScope` сохраняет fail-fast. Результат `awaitAll` остаётся в исходном порядке.

```kotlin
suspend fun fetchAll(urls: List<String>, api: Api): List<Response> = coroutineScope {
    val limit = Semaphore(4)
    urls.map { url ->
        async { limit.withPermit { api.fetch(url) } }
    }.awaitAll()
}
```

Для огромного/бесконечного источника этот вариант создаст coroutine на каждый URL. Альтернатива - bounded worker pool или `urls.asFlow().flatMapMerge(concurrency = 4) { ... }`.

## 11. Timeout и fallback

Профиль образует обязательный результат, recommendations - нет, поэтому нужен supervisor scope и локальная обработка timeout/ожидаемой ошибки.

```kotlin
suspend fun loadScreen(api: Api): Screen = supervisorScope {
    val profile = async { api.profile() }
    val recommendations = async {
        try {
            withTimeout(800) { api.recommendations() }
        } catch (error: CancellationException) {
            if (!currentCoroutineContext().isActive) throw error
            emptyList() // TimeoutCancellationException
        } catch (error: IOException) {
            emptyList()
        }
    }
    Screen(profile.await(), recommendations.await())
}
```

Проще отделить timeout: `withTimeoutOrNull(800) { api.recommendations() } ?: emptyList()`, а `IOException` поймать отдельно. Это предпочтительно, когда timeout и cancellation надо различать явно.

## 12. Cold Flow

`flow {}` cold: каждый `collect` запускает block заново, поэтому `request` напечатается два раза и будет два HTTP-вызова. В `ViewModel` shared state обычно превращают в `StateFlow`.

```kotlin
val user: StateFlow<User?> = repository.user()
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
```

Альтернатива - `shareIn` для потока без обязательного текущего значения. `WhileSubscribed` останавливает upstream без UI-подписчиков; timeout сглаживает короткие lifecycle-переходы.

## 13. Search без устаревших результатов

`flatMapLatest` отменяет прежний inner flow. `catch` должен быть внутри него, иначе первая ошибка завершит весь поток запросов.

```kotlin
fun searchState(queries: Flow<String>, api: Api): Flow<UiState> = queries
    .map(String::trim)
    .debounce(300)
    .distinctUntilChanged()
    .flatMapLatest { query ->
        if (query.isEmpty()) flowOf(UiState.Empty)
        else flow {
            emit(UiState.Loading)
            emit(UiState.Content(api.search(query)))
        }.catch { error ->
            if (error is CancellationException) throw error
            emit(UiState.Error(error))
        }
    }
```

Альтернатива - `transformLatest`; она удобна, когда loading/content/error пишутся в одном операторе.

## 14. `flow {}` и context preservation

`emit` произошёл из другого context, что запрещено: flow collector ожидает последовательность в своём context. Переключают upstream через `flowOn`.

```kotlin
fun loadItems(): Flow<List<Item>> = flow {
    emit(api.items())
}.flowOn(Dispatchers.IO)
```

Если `api.items()` - корректный suspend HTTP API, `IO` может быть не нужен. Альтернатива для блокирующего источника - выполнить чтение в `withContext(IO)` до `emit`, но не вызывать `emit` внутри переключённого блока.

## 15. Backpressure: последние данные важнее всех

`collectLatest` отменяет текущий `render`, когда приходит новая позиция; после паузы выполнится render последней. Это подходит, только если `render` cooperative/cancellable.

```kotlin
fun renderPositions(positions: Flow<Position>, scope: CoroutineScope): Job = scope.launch {
    positions.collectLatest { position -> render(position) }
}
```

`buffer()` лишь накапливает очередь и увеличивает lag. Альтернатива - `conflate().collect { render(it) }`: текущий render не отменяется, но промежуточные значения сохраняются только последним; выбирайте это, если render нельзя безопасно отменять.

## 16. Callback API в Flow

`callbackFlow` связывает внешнюю подписку с жизнью collector; `awaitClose` обязателен для отписки.

```kotlin
fun LocationClient.locations(): Flow<Location> = callbackFlow {
    val listener = object : LocationClient.Listener {
        override fun onLocation(value: Location) {
            trySend(value)
        }

        override fun onError(error: Throwable) {
            close(error)
        }
    }
    subscribe(listener)
    awaitClose { unsubscribe(listener) }
}
```

Альтернатива - `channelFlow`, если несколько дочерних coroutines параллельно отправляют значения. Настройте `buffer`/overflow отдельно, когда producer быстрее consumer.

## 17. `StateFlow`, lifecycle и лишняя работа

Cold `catalog()` будет запущен для каждого collector. Привяжите sharing к `viewModelScope`, а UI collector - к видимости View.

```kotlin
class CatalogViewModel(repository: CatalogRepository) : ViewModel() {
    val state: StateFlow<UiState> = repository.catalog()
        .map { UiState.Content(it) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UiState.Loading)
}

override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            viewModel.state.collect(::render)
        }
    }
}
```

Альтернатива - Compose `collectAsStateWithLifecycle()`. Если upstream должен жить независимо от UI, выбирайте `SharingStarted.Eagerly` осознанно.

## 18. SharedFlow event и rotation

`replay = 1` доставляет старое событие новому collector, поэтому навигация может повториться. `replay = 0` может потерять event, если collector временно отсутствует. Первым делом определите контракт: navigation - часть устойчивого state или одноразовая команда.

```kotlin
private val _events = MutableSharedFlow<Event>(extraBufferCapacity = 1)
val events = _events.asSharedFlow()

fun onPaymentDone() {
    _events.tryEmit(Event.OpenReceipt)
}
```

UI собирает events через `repeatOnLifecycle`; это допустимо, если потеря команды при отсутствии UI допустима. Альтернатива для гарантированной доставки - хранить `pendingReceiptId` в `SavedStateHandle`/UI state и подтверждать consumption явным intent. Альтернатива для единственного consumer - `Channel` + `receiveAsFlow`, с пониманием его lifecycle-семантики.

## 19. Concurrent refresh token

`Mutex` защищает ссылку на shared `Deferred`, но сам network refresh запускается в отдельном scope: отмена одного awaiter не отменяет общую операцию. После завершения ссылку надо очистить, включая error.

```kotlin
class TokenRefresher(private val authApi: AuthApi) {
    private val mutex = Mutex()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var inFlight: Deferred<String>? = null

    suspend fun refresh(): String {
        val deferred = mutex.withLock {
            inFlight?.takeIf { it.isActive } ?: scope.async {
                authApi.refreshToken()
            }.also { created ->
                inFlight = created
                created.invokeOnCompletion {
                    scope.launch {
                        mutex.withLock {
                            if (inFlight === created) inFlight = null
                        }
                    }
                }
            }
        }
        return deferred.await()
    }
}
```

В реальном приложении scope принадлежит session/auth component и закрывается при logout, иначе он течёт. Альтернатива - single-flight primitive в DI-компоненте; не используйте один `Mutex` вокруг всего network call, иначе caller cancellation и другие операции будут заблокированы слишком грубо.

## 20. Детерминированный тест Flow и retry

`retryWhen` при `true` перезапускает upstream `flow {}` с начала, поэтому `Loading` эмитится заново перед каждой попыткой. При двух `IOException` и третьей успешной попытке реальная последовательность - `[Loading, Loading, Loading, Content]`, а не `[Loading, Content]`. `runTest` даёт virtual time, а `advanceUntilIdle()` продвигает оба интервала `delay(1_000)` без реального ожидания.

```kotlin
@Test
fun `retryWhen re-emits Loading before every attempt`() = runTest {
    var calls = 0
    val api = object : Api {
        override suspend fun items(): List<Item> {
            calls += 1
            if (calls < 3) throw IOException("temporary")
            return listOf(Item("1"))
        }
    }

    val states = mutableListOf<UiState>()
    val job = launch { loadWithRetry(api).toList(states) }

    advanceUntilIdle()

    assertEquals(
        listOf(UiState.Loading, UiState.Loading, UiState.Loading, UiState.Content(listOf(Item("1")))),
        states,
    )
    assertEquals(3, calls)
    job.cancel()
}
```

Чтобы `Loading` эмитился один раз независимо от числа повторов, retry должен оборачивать только сетевой вызов, а `Loading` эмитить снаружи `retryWhen` через `onStart` - он выполняется один раз при подписке на итоговый flow и не перезапускается вместе с upstream:

```kotlin
fun loadWithRetry(api: Api): Flow<UiState> = flow {
    emit(UiState.Content(api.items()))
}.retryWhen { cause, attempt ->
    cause is IOException && attempt < 2 && run {
        delay(1_000)
        true
    }
}.onStart { emit(UiState.Loading) }
```

```kotlin
@Test
fun `emits loading once then content after two retries`() = runTest {
    var calls = 0
    val api = object : Api {
        override suspend fun items(): List<Item> {
            calls += 1
            if (calls < 3) throw IOException("temporary")
            return listOf(Item("1"))
        }
    }

    val states = mutableListOf<UiState>()
    val job = launch { loadWithRetry(api).toList(states) }

    advanceUntilIdle()

    assertEquals(listOf(UiState.Loading, UiState.Content(listOf(Item("1")))), states)
    assertEquals(3, calls)
    job.cancel()
}
```

Альтернатива - Turbine: `awaitItem()` на каждое состояние с `advanceTimeBy(1_000)` между попытками вместо `toList`/`advanceUntilIdle`. Для production dispatcher/scope инъецируют явно, а не подменяют глобальный `Dispatchers`.

---

## Карта навыков

| Задачи | Навык |
| --- | --- |
| 1-3 | Suspension, dispatcher, ownership и cancellation |
| 4-8 | Structured concurrency, errors и cleanup |
| 9-11 | Cooperative CPU work, rate limits, timeout/fallback |
| 12-18 | Cold/hot Flow, operators, callbacks, lifecycle и events |
| 19-20 | Concurrency coordination и детерминированные тесты |

Для теории и дополнительных задач: `08-coroutines-android.md`, `11-concurrency-deep.md`, `14-data-network-deep.md`.