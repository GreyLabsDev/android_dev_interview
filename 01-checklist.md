# Чеклист тем: Senior Android Developer, 2026

Отмечайте не «слышал», а «могу говорить 3 минуты без подготовки, с примером из своего проекта,
назвать трейд-офф и объяснить, где подход ломается». Это и есть senior-уровень владения темой.

Обозначения: 🔴 — спрашивают почти всегда, 🟡 — часто, 🟢 — реже, но отличает сильного кандидата.

---

## 1. Kotlin: язык 🔴

> Этот блок и следующий подробно разобраны в `Kotlin_Senior_Android_Guide.markdown` — используйте его
> как основной материал, а список ниже как чеклист для самопроверки. Android-специфика корутин,
> их тестирование и практические паттерны — в `08-coroutines-android.md`.

- [ ] 🔴 `data class`: что генерирует компилятор, `copy` и наследование, почему не всё стоит делать data-классом (бинарная совместимость, `equals` по всем полям, лишние методы в DEX)
- [ ] 🔴 `sealed class` vs `sealed interface` vs `enum`: иерархии в разных модулях, исчерпывающий `when`
- [ ] 🔴 Nullability, платформенные типы, `lateinit` vs `by lazy`, потокобезопасность `lazy`
- [ ] 🔴 `val` vs `const val` vs `@JvmStatic`, во что превращается в байткоде
- [ ] 🔴 Обобщения: ковариантность/контравариантность (`in`/`out`), `reified`, стирание типов
- [ ] 🔴 Inline-функции: зачем, `noinline`/`crossinline`, non-local return, цена инлайна для размера кода
- [ ] 🟡 `value class` (inline class): когда происходит боксинг, интероп с Java
- [ ] 🟡 Делегаты: `by`, `Delegates.observable`, свой `ReadWriteProperty`
- [ ] 🟡 `Any` / `Unit` / `Nothing`: где `Nothing` реально помогает вывести тип
- [ ] 🟡 Scope-функции без магии: чем `let` отличается от `run`/`also`/`apply`/`with` и когда это принципиально
- [ ] 🟡 Extension-функции: статическая диспетчеризация, почему они не переопределяются
- [ ] 🟢 Kotlin 2.x: K2-компилятор, что изменилось для сборки и для Compose
- [ ] 🟢 Kotlin 2.2: guard conditions, non-local `break`/`continue`, multi-dollar interpolation, nested type aliases
- [ ] 🟢 Kotlin 2.3.x: name-based destructuring, изменение разрешения перегрузок для context parameters (классический «вопрос с подвохом»)
- [ ] 🟢 Kotlin 2.4 (июнь 2026, актуальная версия): context parameters стабильны — флаг `-Xcontext-parameters` больше не нужен, context receivers окончательно мертвы; explicit backing fields (`field`) стабильны; стабильный `kotlin.uuid.Uuid`; use-site targets аннотаций и мета-таргет `@all`
- [ ] 🟢 Аннотации и use-site targets, `@JvmInline`, `@JvmName`, интероп-грабли с Java

## 2. Корутины и Flow 🔴

- [ ] 🔴 Что такое корутина на уровне компилятора: CPS-трансформация, `Continuation`, state machine, почему это не поток
- [ ] 🔴 Structured concurrency: `Job`, родитель-потомок, отмена вниз по дереву, ошибки вверх
- [ ] 🔴 `coroutineScope` vs `supervisorScope`, `SupervisorJob`, `CoroutineExceptionHandler` — где он реально срабатывает, а где нет
- [ ] 🔴 Кооперативная отмена: `isActive`, `ensureActive`, `yield`, `CancellationException`, почему `try/catch(Exception)` ломает отмену, `NonCancellable`
- [ ] 🔴 Диспетчеры: `Main`, `Main.immediate`, `Default`, `IO`, `Unconfined`; `limitedParallelism`; когда `withContext` нужен, а когда это карго-культ
- [ ] 🔴 `launch` vs `async`, `awaitAll`, fail-fast и таймауты (`withTimeout` vs `withTimeoutOrNull`)
- [ ] 🔴 Cold vs hot: `Flow` vs `StateFlow` vs `SharedFlow` vs `Channel`; когда что и как моделировать одноразовые UI-события
- [ ] 🔴 `stateIn` / `shareIn`, `SharingStarted.WhileSubscribed(5000)` — что означает эта пятёрка и зачем
- [ ] 🔴 Операторы: `map`, `filter`, `combine`, `zip`, `flatMapConcat` / `flatMapMerge` / `flatMapLatest`, `debounce`, `distinctUntilChanged`
- [ ] 🔴 Backpressure: `buffer`, `conflate`, `collectLatest`, `Channel.BUFFERED/CONFLATED/UNLIMITED`, стратегии переполнения
- [ ] 🔴 `flowOn` и почему нельзя менять контекст через `withContext` внутри `flow { }` (нарушение context preservation)
- [ ] 🟡 `repeatOnLifecycle` / `flowWithLifecycle` и чем плох простой `lifecycleScope.launch { collect() }`
- [ ] 🟡 Тестирование: `runTest`, `TestDispatcher` (`Standard` vs `Unconfined`), `advanceUntilIdle`, `MainDispatcherRule`, Turbine
- [ ] 🟡 Конкурентный доступ: `Mutex` vs `synchronized`, actor-подход, атомарность `MutableStateFlow.update`
- [ ] 🟢 `callbackFlow` / `channelFlow`, `awaitClose`, обёртка legacy-колбэков
- [ ] 🟢 Кастомные `CoroutineContext`-элементы, `ThreadLocal` и `asContextElement`

## 2а. Многопоточность и синхронизация 🔴

> Разбор всего блока — в `11-concurrency-deep.md`. Концепции JMM — в Kotlin-гайде, раздел 14.

- [ ] 🔴 Visibility, atomicity, ordering: что решает `@Volatile`, а что нет; почему `counter++` небезопасен
- [ ] 🔴 Happens-before: источники отношения; почему «на моём устройстве работает» — не аргумент; слабая модель памяти ARM против x86
- [ ] 🔴 Data race против race condition; гонка, которую не лечит лок (устаревший ответ затирает свежий)
- [ ] 🔴 `synchronized`: монитор, реентерабельность, почему нельзя лочиться на `this`, строке и боксированном числе
- [ ] 🔴 CAS и атомики: `AtomicInteger`/`AtomicReference`, `compareAndSet`, почему лямбда в `updateAndGet` должна быть чистой
- [ ] 🔴 Безопасная публикация: `val` как final-поле, утечка `this` из конструктора, корректный double-checked locking, режимы `lazy`
- [ ] 🔴 Потокобезопасные коллекции: почему `Collections.synchronizedMap` не спасает, свойства `ConcurrentHashMap`, `CopyOnWriteArrayList`, непотокобезопасный `SparseArray`
- [ ] 🔴 Иерархия выбора: immutable-состояние → confinement → атомарная замена → `Mutex` → `synchronized`
- [ ] 🟡 `synchronized` в ART изнутри: lock word, thin lock, инфляция, fat lock и `Monitor`
- [ ] 🟡 `ReentrantLock`: `tryLock` с таймаутом, `lockInterruptibly`, честность, `Condition`; когда `ReadWriteLock` вредит
- [ ] 🟡 Пулы: параметры `ThreadPoolExecutor`, порядок «потоки → очередь → потоки», политики отказа, чем плох `newFixedThreadPool`
- [ ] 🟡 Координация: `CountDownLatch`, `CyclicBarrier`, `Semaphore` и их корутиновые аналоги
- [ ] 🟡 `wait`/`notify`/`notifyAll`: почему только под тем же монитором, проблема потерянного `notify`, зачем проверять условие в `while`, а не в `if` (spurious wakeup)
- [ ] 🟡 Дедлок: четыре условия, порядок захвата локов, запрет вызывать чужой код под локом, поиск по thread dump и ANR-трейсу
- [ ] 🟡 Прерывание потока: почему `Thread.stop` удалён, что делать с `InterruptedException`
- [ ] 🟡 Что не потокобезопасно в Android: `View`, `Bitmap`, `SparseArray`, `SimpleDateFormat`; почему пачка `apply()` даёт ANR
- [ ] 🟢 `ThreadLocal` и утечки в пуле потоков: почему значение переживает задачу и как это чинить (перенос `asContextElement` из блока 2 сюда не помогает)
- [ ] 🟢 ABA, `LongAdder`, false sharing, lock convoy
- [ ] 🟢 Тестирование конкурентности: стресс-тест с барьером, Lincheck (stress + model checking), почему обычный юнит-тест ничего не доказывает
- [ ] 🟢 Мультиплатформенные атомики: `kotlin.concurrent.atomics` (экспериментальные), `kotlinx-atomicfu`

## 3. Jetpack Compose 🔴

> Полный разбор Compose — в `Jetpack_Compose_Senior_Android_Guide.markdown`: от runtime и recomposition
> до жестов, `TextField`, insets, анимаций, accessibility, интеропа и тестирования.

- [ ] 🔴 Три фазы: Composition → Layout → Drawing; что можно пропустить и как «отложить» чтение состояния до нужной фазы (лямбда-модификаторы, `graphicsLayer`)
- [ ] 🔴 Рекомпозиция: что её триггерит, snapshot-система, slot table, как компилятор решает пропустить вызов
- [ ] 🔴 Стабильность: stable / immutable / unstable типы, `@Stable`, `@Immutable`, почему `List<T>` нестабилен, `kotlinx.collections.immutable`
- [ ] 🔴 Strong skipping (по умолчанию с Compose-компилятора для Kotlin 2.0.20+): что изменилось в правилах стабильности и в лямбдах
- [ ] 🔴 `remember` vs `rememberSaveable` vs `derivedStateOf` vs `produceState` vs `rememberUpdatedState`
- [ ] 🔴 Side effects: `LaunchedEffect`, `DisposableEffect`, `SideEffect`, `rememberCoroutineScope`, ключи эффектов и типовые ошибки с ними
- [ ] 🔴 State hoisting и UDF: что живёт в composable, что в state holder, что в ViewModel
- [ ] 🔴 `LazyColumn`: `key`, `contentType`, стабильные item'ы, почему нельзя ставить индекс ключом, диагностика подтормаживаний и мигания
- [ ] 🟡 Изменения выведения стабильности в Compose-компиляторе Kotlin 2.4: все интерфейсы теперь `Unknown` (кроме явно помеченных стабильными), дефолт для non-final классов — `Unknown` вместо `Stable`, стабильность `internal`-типов из другого файла решается в рантайме. Практический вывод: `@Immutable`/`@Stable` на публичных контрактах и `data class` вместо `open class` в UI-моделях стали не «на всякий случай», а обязательными
- [ ] 🟡 `CompositionLocal`: `compositionLocalOf` vs `staticCompositionLocalOf`, когда это оправдано, а когда скрытая зависимость
- [ ] 🟡 Кастомный `Layout`, `SubcomposeLayout` и его цена; `Modifier.Node` как современный способ писать модификаторы
- [ ] 🟡 Порядок модификаторов и почему он меняет результат
- [ ] 🟡 Инструменты: Layout Inspector с подсчётом рекомпозиций, Compose compiler metrics/reports, `Recomposition highlighter`
- [ ] 🟡 Интероп: `AndroidView`, `ComposeView`, миграция экрана по частям
- [ ] 🟡 Доступность: `semantics`, `contentDescription`, `mergeDescendants`, TalkBack, крупные шрифты
- [ ] 🟡 Ввод и жесты: `pointerInput` и `awaitPointerEventScope`, `detectTapGestures`/`detectDragGestures`, потребление события и порядок обработки, `nestedScroll`
- [ ] 🟡 `TextField` и клавиатура: state-hoisting текста и почему наивный `onValueChange` теряет символы, `keyboardOptions`/`imeAction`, фокус через `FocusRequester`, insets и `imePadding()`, `Modifier.windowInsetsPadding`
- [ ] 🟢 Compose-компилятор: `PausableComposition` и `OptimizeNonSkippingGroups` включены по умолчанию и уже помечены как флаги «на удаление» — то есть это просто базовое поведение; как выключить через `featureFlags = setOf(...disabled())` и зачем это может понадобиться; `@Composable` function references
- [ ] 🟢 Анимации: `animate*AsState`, `Transition`, `AnimatedContent`, shared element transitions
- [ ] 🟢 Material 3 / Expressive, дизайн-система поверх Material, темизация без Material

## 4. Навигация 🟡

> Разбор всего блока — в `12-architecture-deep.md`, раздел 7.

- [ ] 🔴 Navigation Compose (Nav2): type-safe routes через `@Serializable` (2.8+), аргументы и их ограничения, вложенные графы, `SavedStateHandle.toRoute()`. Знать, что библиотека переведена в режим поддержки: критические фиксы есть, новых фич не будет
- [ ] 🔴 Навигация в мультимодульном проекте: как два фича-модуля ходят друг в друга, не зная друг о друге (API-модули, навигационные контракты, DI-агрегация)
- [ ] 🟡 Navigation 3: стабилен с 1.0 (ноябрь 2025), back stack — обычный `SnapshotStateList`, который вы владеете; `NavDisplay`, `entryProvider`, `SceneStrategy` для адаптивных раскладок; требует `compileSdk` 36
- [ ] 🟡 Nav2 vs Nav3: что реально решает Nav3 (вы владеете back stack'ом, мультипейн, ViewModel на entry) и чего пока не хватает (deep links есть только в предварительных версиях, экосистема меньше). Анимации и predictive back в Nav3 **есть** — утверждение об их отсутствии устарело
- [ ] 🟡 Deep links, App Links, обработка внешних интентов, восстановление back stack
- [ ] 🟢 Альтернативы: Decompose, Voyager, самописный навигатор — и почему в KMP-проектах часто Decompose

## 5. Архитектура приложения 🔴

> Разбор всего блока — в `12-architecture-deep.md`, разделы 1–6.

- [ ] 🔴 MVVM vs MVI vs «MVVM с UDF»: практическая разница, а не определения; что выбрать для большого Compose-приложения и почему
- [ ] 🔴 Дизайн UI State: одна `data class` vs sealed-иерархия состояний, частичные загрузки, ошибки, пустые состояния
- [ ] 🔴 Одноразовые события (навигация, снекбары): `Channel` vs `SharedFlow` vs флаг в состоянии — и почему у каждого варианта есть проблема
- [ ] 🔴 Repository: зачем он нужен, single source of truth, где границы domain/data
- [ ] 🔴 Clean Architecture и UseCase-слой: честно защитить обе позиции — когда он оправдан, когда это лишний boilerplate
- [ ] 🔴 Process death: чем отличается от configuration change, `SavedStateHandle`, `rememberSaveable`, что восстанавливать, а что перезапрашивать
- [ ] 🔴 ViewModel «механически»: как переживает поворот, к чему привязан scope, почему нельзя держать `Context`/`View`
- [ ] 🟡 Модуляризация: по слоям vs по фичам, `:core`, `:feature`, `:data`, api/impl-разделение, convention plugins
- [ ] 🟡 Стратегия распила монолита: с чего начать, как мерить успех (время инкрементальной сборки, конфликты в PR), как не сделать хуже
- [ ] 🟡 Контроль границ архитектуры: lint-правила, Konsist/ArchUnit, запрет импортов, ревью-чеклист
- [ ] 🟡 Design system как отдельный модуль: токены, компоненты, скриншот-тесты
- [ ] 🟢 Feature flags и remote config: хранение, фетч без блокировки старта, фолбэк, kill-switch, постепенная раскатка

## 6. DI и сборка 🟡

> Разбор всего блока — в `13-di-build-deep.md`.

- [ ] 🔴 Dagger под капотом: что генерируется (`_Factory`, `_MembersInjector`, `Dagger*Component`), компонент как объект с полями-провайдерами, `fastInit` и `SwitchingProvider` (включён по умолчанию с Gradle-плагином Hilt, отключается только `-Pdagger.hilt.fastInit=false`)
- [ ] 🔴 Способы объявить биндинг: `@Inject`-конструктор, `@Provides`, `@Binds` (+ безпараметрический `@Binds` из 2.60), `@BindsInstance`, `@BindsOptionalOf`, мультибиндинги; `Lazy` vs `Provider` и разрыв циклов; assisted-инъекция, включая `@HiltViewModel(assistedFactory = ...)`
- [ ] 🔴 Скоупы Dagger как механика: `@Scope` — метка для компилятора, кэш — это `DoubleCheck` в поле компонента, значит **скоуп = время жизни экземпляра компонента**; два экземпляра компонента = два «синглтона»; выход из скоупа = потеря ссылки; `@Reusable` на `SingleCheck` (без потокобезопасности и без гарантии единственности); свой скоуп и свой сабкомпонент; сабкомпонент vs `dependencies = [...]`
- [ ] 🟡 Мультибиндинги в деталях: `@IntoSet`/`@ElementsIntoSet`/`@IntoMap`, ключи и `@MapKey(unwrapValue = false)`, `@Multibinds` для потенциально пустых коллекций, `Map<K, Provider<V>>`, `@LazyClassKey` против загрузки всех классов-ключей, ловушка `@JvmSuppressWildcards` в Kotlin
- [ ] 🔴 Компоненты и скоупы Hilt: кто физически держит каждый (`ActivityRetainedComponent` живёт в `ViewModel`), `@TestInstallIn` и `@BindValue`, свои компоненты через `@DefineComponent` и их ограничения, стоимость KSP-кодогенерации
- [ ] 🔴 Hilt vs Koin vs Metro vs ручной DI: compile-time валидация графа против runtime-резолва, влияние на сборку, старт и KMP
- [ ] 🔴 Gradle: KSP вместо KAPT, configuration cache (не включён по умолчанию), build cache, version catalogs, convention plugins. Про «KSP вдвое быстрее»: это вендорская оценка исполнения процессора, а не сборки целиком, и выигрыш появляется только когда из модуля убран **последний** KAPT-процессор
- [ ] 🟡 Koin 4.2.x (актуально 4.2.2, требует Kotlin 2.3+): lazy-модули с параллельной загрузкой на старте, `CoreResolverV2`, `koinApplication.verify()` в тестах, свой K2-компиляторный плагин вместо KSP (пока RC), поддержка Navigation 3; единственный зрелый вариант для KMP из «большой тройки»
- [ ] 🟡 Metro: DI как compiler plugin (FIR + IR, без KSP), мультиплатформенный. Заявленные адоптерами выигрыши — порядка 40–60 % на инкрементальных сборках с изменением ABI и 10–25 % на чистых, а на изменениях без ABI разницы почти нет; цифру «50–80 %» не цитируйте. Square задепрекейтил Anvil в его пользу
- [ ] 🟡 Ускорение сборки: замер (`--scan`, build analyzer), параллелизм, ремоут-кэш, разделение модулей, `isMinifyEnabled` только в release
- [ ] 🟡 R8: сжатие, обфускация, оптимизация; правила keep, `mapping.txt` и деобфускация стектрейсов; чем «R8 vs ProGuard» реально отличается
- [ ] 🟡 Варианты сборки, product flavors, подпись, App Bundle, Play App Signing
- [ ] 🟢 CI/CD: пайплайн PR (компиляция → unit → screenshot → lint), релизные поезда, staged rollout, автоматизация changelog

## 7. Данные, сеть, offline-first 🔴

> Разбор всего блока — в `14-data-network-deep.md`. Проектирование системы целиком — в `04-system-design.md`.

- [ ] 🔴 Offline-first: локальная БД как single source of truth, UI читает только из Room через Flow, сеть — фоновый синк
- [ ] 🔴 Room: миграции (авто и ручные), что будет, если забыть; транзакции; возвращать `Flow` vs `suspend`; индексы и `@Relation`
- [ ] 🔴 Синхронизация: outbox-паттерн (сначала запись в Room со статусом PENDING, затем WorkManager), идемпотентность, экспоненциальный backoff
- [ ] 🔴 Разрешение конфликтов: last-write-wins, server-wins, версии/векторы версий, event sourcing — и цена каждого
- [ ] 🔴 Пагинация: offset vs cursor (page drift), Paging 3, `RemoteMediator`, что Paging решает поверх самописной реализации
- [ ] 🔴 Retrofit/OkHttp: интерцепторы (`addInterceptor` vs `addNetworkInterceptor`), обновление токена без гонок, `Authenticator`, таймауты, ретраи, HTTP-кэш
- [ ] 🟡 Хранилища: Room vs DataStore vs SharedPreferences vs файлы; `commit()` vs `apply()`; почему SharedPreferences считается легаси
- [ ] 🟡 Кэш: многоуровневый (memory LRU + disk), инвалидация, TTL, вытеснение, ограничение по размеру
- [ ] 🟡 REST vs GraphQL vs WebSocket vs SSE vs polling: критерии выбора, реконнект, heartbeat, деградация в офлайн
- [ ] 🟡 Оптимистичные апдейты и откат при ошибке
- [ ] 🟢 Ktor Client и SQLDelight (актуально для KMP), сериализация `kotlinx.serialization`
- [ ] 🟢 Экономия трафика: сжатие, дельта-синк, батчинг, только-Wi-Fi для тяжёлого

## 8. Платформа и внутренности Android 🔴

> Разбор всего блока — в `10-android-sdk-deep.md`. ART, компиляция и dexopt — в `09-jvm-memory-deep.md`, раздел 7.

- [ ] 🔴 Жизненные циклы: Activity, Fragment, процесс; чем configuration change отличается от process death; launch modes (`singleTop` vs `singleTask`)
- [ ] 🔴 Context: application vs activity; типовые утечки; `LocalContext.current` в Compose и почему его нельзя сохранять в ViewModel
- [ ] 🔴 Главный поток: `Looper`, `Handler`, `MessageQueue`, Choreographer, кадровый бюджет
- [ ] 🔴 Фоновая работа: WorkManager vs Foreground Service vs `JobScheduler`; WorkManager хранит очередь в собственной Room-БД и переживает смерть процесса, но не force stop
- [ ] 🔴 Ограничения фона: Doze, App Standby buckets, ограничения на запуск FGS из фона; Android 15 — лимит 6 часов в сутки для `dataSync` и `mediaProcessing` с вызовом `onTimeout`, запрет запуска ряда FGS из `BOOT_COMPLETED`
- [ ] 🔴 Android 16 / API 36 (обязательный target с 31.08.2026): edge-to-edge без возможности отключить, predictive back по умолчанию (`onBackPressed` не вызывается, `KEYCODE_BACK` не доставляется), игнорирование ориентации/аспекта/resizability на экранах от sw600dp с временным opt-out
- [ ] 🔴 Android 17 / API 37: opt-out по адаптивности отменён, `static final` нельзя менять рефлексией, обязательный `ACCESS_LOCAL_NETWORK`, задержка SMS с OTP, Certificate Transparency по умолчанию, lock-free `MessageQueue`
- [ ] 🔴 Адаптивность как требование, а не фича: `WindowSizeClass`, multi-window, desktop windowing, сохранение состояния при изменении размера окна
- [ ] 🔴 `minSdk` / `targetSdk` / `compileSdk`: что означает каждый, какой из них влияет на поведение системы, а какой — только на компиляцию
- [ ] 🟡 Ограничения Background Activity Launch: кто делится правами при таргете 34 и 35, `setPendingIntentBackgroundActivityStartMode`
- [ ] 🟡 `BroadcastReceiver` сегодня: почему статическая регистрация почти бесполезна, что обязательно указывать при динамической с Android 14 (`RECEIVER_EXPORTED` / `RECEIVER_NOT_EXPORTED`)
- [ ] 🟡 Activity Result API вместо `startActivityForResult`; Splash screen API вместо своей Activity; `androidx.startup` вместо инициализации через собственный `ContentProvider`
- [ ] 🟡 `PendingIntent`: явная мутабельность с Android 12, роль `requestCode`, `FLAG_UPDATE_CURRENT`
- [ ] 🟡 Тренд на системные пикеры вместо широких разрешений: Photo Picker, Contact Picker, device picker для локальной сети
- [ ] 🟡 Требование 16 КБ страниц для нативных библиотек (с 01.11.2025 для таргета Android 15+): чем проверять и чем лечить
- [ ] 🟡 Разрешения: runtime-модель, `POST_NOTIFICATIONS`, гранулярные медиа-разрешения, scoped storage, `MANAGE_EXTERNAL_STORAGE` и политика Play
- [ ] 🟡 IPC: Binder, транзакции и лимит буфера (`TransactionTooLargeException`), AIDL, `DeathRecipient`, ContentProvider
- [ ] 🟡 `android:exported` и изменения Android 12; безопасность экспортируемых компонентов; неявные интенты
- [ ] 🟡 Push: FCM, приоритеты сообщений, доставка в Doze, data vs notification payload, каналы уведомлений
- [ ] 🟢 Автосброс разрешений у давно не используемых приложений и как правильно просить исключение из оптимизации батареи (и когда Play это не пропустит)
- [ ] 🟢 ART: JIT, AOT, profile-guided optimization, dexopt, чем это связано с Baseline Profiles
- [ ] 🟢 Форм-факторы за пределами телефона: Wear OS / TV / Auto / XR — у каждого свои требования к target API и свой UX-набор (адаптивность и `WindowSizeClass` — выше, в 🔴-пункте)

## 9. Производительность 🔴

> Память, GC, ссылки, утечки и OOM разобраны в `09-jvm-memory-deep.md`.

- [ ] 🔴 Cold / warm / hot start: что именно измеряется, TTID vs TTFD, что влияет на каждый
- [ ] 🔴 Baseline Profiles: что делает ART, почему первый запуск медленнее, генерация через `:baselineprofile`-модуль и Macrobenchmark, типичный выигрыш 20–40 % на холодном старте
- [ ] 🔴 Startup Profiles: раскладка кода в DEX, ещё +15–30 % к старту, требуется R8 и AGP ≥ 8.2
- [ ] 🔴 Jank: бюджет кадра 16.6 мс при 60 Гц (и всего 8.3 мс при 120 Гц — на современных устройствах считайте по фактической частоте), `FrameTimingMetric`, где смотреть просадки, длинные кадры vs пропущенные
- [ ] 🔴 ANR: пороги (5 с на input dispatch), user-perceived ANR rate как Play Vital, чтение ANR-трейсов, типовые причины (I/O на main, дедлоки, тяжёлый `onCreate`, `SharedPreferences.commit`)
- [ ] 🔴 Утечки памяти: топовые причины (статические ссылки на Context, слушатели без отписки, внутренние классы, корутины вне scope), LeakCanary, Memory Profiler, heap dump
- [ ] 🔴 Устройство памяти процесса: Java heap, native heap, стеки, code, graphics; PSS/RSS/USS; почему рост памяти может быть не виден в Java heap
- [ ] 🔴 Reachability и GC roots; почему циклические ссылки не мешают сборке; почему живой поток — это корень
- [ ] 🔴 Ссылки: strong, `SoftReference`, `WeakReference`, `PhantomReference` + `ReferenceQueue`; почему soft-ссылки — плохой кэш на Android
- [ ] 🔴 Как LeakCanary определяет утечку изнутри: `ObjectWatcher`, слабая ссылка в очереди, порог удержанных, Shark и кратчайший путь до корня
- [ ] 🟡 Сборщики в ART: CMS → Concurrent Copying (Android 8) → generational CC (Android 10) → CMC на `userfaultfd` (Android 14+) → генерационный CMC; что решал каждый шаг
- [ ] 🟡 Барьеры: write barrier и card table, Baker-style read barrier у CC и почему CMC от него избавился
- [ ] 🟡 Чтение GC-логов: причины сборки (`Background`, `Alloc`, `Explicit`, `NativeAlloc`), paused vs total, `HeapTaskDaemon`
- [ ] 🟡 `OutOfMemoryError` в ART: как читать сообщение, фрагментация против общего объёма, почему `largeHeap` не лечение
- [ ] 🟡 `onTrimMemory` в актуальном виде: какие уровни устарели и не доставляются с API 34, что делать по `UI_HIDDEN` и `BACKGROUND`
- [ ] 🟡 Bitmap: Java heap до Android 8, native heap после, `NativeAllocationRegistry`, декодирование под целевой размер; `ImageDecoder` вместо `BitmapFactory`, `Config.HARDWARE` для «только показать», `BitmapRegionDecoder` для огромных изображений
- [ ] 🟡 Low memory killer: `oom_score_adj` и группы процессов (foreground → visible → perceptible → service → cached), почему внутри группы убивают самый крупный, и как узнать причину смерти через `ApplicationExitInfo`
- [ ] 🟡 Macrobenchmark и Microbenchmark: `CompilationMode`, прогон в CI, борьба с шумом измерений
- [ ] 🟡 Perfetto / systrace: чтение трейса, поиск stall'ов на main-потоке, кастомные трейс-секции
- [ ] 🟡 Compose-специфика: лишние рекомпозиции, нестабильные параметры, тяжёлые вычисления в composition, `derivedStateOf`
- [ ] 🟡 Размер приложения: App Bundle, разделение по ABI/плотности, ресурсы, R8, Play Feature Delivery, анализ APK
- [ ] 🟡 Батарея и сеть: wakelock'и, батчинг запросов, ограничения WorkManager, Battery Historian
- [ ] 🟢 `finalize()` и почему он устарел (`FinalizerWatchdogDaemon`, `TimeoutException`), `Cleaner`, детерминированный `close()`
- [ ] 🟢 Native-утечки: `heapprofd` в Perfetto, `malloc_debug`, `dumpsys meminfo` как первый шаг диагностики
- [ ] 🟢 Бюджеты производительности как процесс: SLO по p95 TTID/TTFD по тирам устройств, регрессии в CI, трейс обязателен в постмортеме

## 10. Тестирование 🟡

- [ ] 🔴 Пирамида на практике: юниты на логику, интеграционные на «проводку», ~5 % E2E на ключевые сценарии
- [ ] 🔴 Тесты ViewModel: `MainDispatcherRule`, `runTest`, `UnconfinedTestDispatcher` vs `StandardTestDispatcher`
- [ ] 🔴 Flow: Turbine (`flow.test { }`), проверка последовательности эмиссий, `StateFlow` и пропущенные значения
- [ ] 🔴 Fakes vs mocks: почему fakes лучше для сложных зависимостей и что говорить про MockK
- [ ] 🟡 Compose UI-тесты: `createComposeRule` vs `createAndroidComposeRule`, семантические матчеры вместо текста, `testTag`, синхронизация и `waitUntil`
- [ ] 🟡 Robolectric: гонять Compose/Espresso-тесты на JVM без девайса
- [ ] 🟡 Скриншот-тесты: Paparazzi (LayoutLib, JVM) vs Roborazzi (Robolectric) vs Compose Preview Screenshot Testing; темы, размеры шрифта, RTL
- [ ] 🟡 Интеграционные тесты Room, миграционные тесты БД, тесты сети через MockWebServer
- [ ] 🟡 Флаки: почему это P1, а не «перезапусти пайплайн»; детерминизм времени и диспетчеров
- [ ] 🟢 Тестируемость как дизайн: инъекция `Clock`/`Dispatcher`, `@VisibleForTesting` как запах, contract-тесты для фейков

## 11. Kotlin Multiplatform 🟡

> Разбор всего блока — в `15-kmp-deep.md`.

- [ ] 🔴 Что шарить, а что нет: бизнес-логика, модели, сеть, БД — да; UI — отдельное решение
- [ ] 🔴 `expect` / `actual`, source sets, иерархия таргетов, интероп с Swift/ObjC
- [ ] 🔴 Стек: Ktor, SQLDelight, kotlinx.serialization, kotlinx.coroutines, Koin, Decompose
- [ ] 🟡 Compose Multiplatform: iOS стабилен с 1.8.0 (май 2025), web (Wasm) до сих пор в бете; инкрементальное внедрение и interop со SwiftUI/UIKit. Про размер: официально заявлено +~9 МБ, независимые замеры дают 15–30 МБ — планируйте по второй цифре
- [ ] 🟡 Когда KMP оправдан, а когда нет: критерии, которые стоит проговорить (общий баг в бизнес-логике на обеих платформах, готовность iOS-инженеров к Kotlin, требования к нативным паттернам навигации, Live Activities, виджеты)
- [ ] 🟡 Как де-рискнуть внедрение в существующее нативное приложение: с одного модуля, с не-критичной фичи, с обратимым решением
- [ ] 🟢 Отличие от Flutter/React Native (кто владеет UI-слоем и рантаймом), Swift Export, состояние concurrency в Kotlin/Native

## 12. Безопасность 🟡

> Разбор всего блока — в `16-security-deep.md`.

- [ ] 🔴 Принцип: сервер — единственная граница доверия; клиентские проверки не авторизуют
- [ ] 🔴 Хранение секретов: Android Keystore, `setUserAuthenticationRequired`, key attestation с двумя корнями доверия. **`EncryptedSharedPreferences`/`EncryptedFile` задепрекейчены целиком** — знать это и уметь назвать, чем заменяют (Keystore напрямую, шифрующий сериализатор DataStore, платформенное хранилище токенов)
- [ ] 🔴 Сеть: TLS, network security config, certificate pinning по SPKI промежуточного сертификата, обязательный backup-пин и срок годности пинов
- [ ] 🟡 Play Integrity API (замена SafetyNet): `appIntegrity`, `deviceIntegrity`, `requestHash` для привязки к конкретному действию, обязательная проверка токена на бэкенде
- [ ] 🟡 Root/эмулятор/Frida-детект как телеметрия, а не как гейт; градуированная реакция вместо булева «блокировать»
- [ ] 🟡 R8-обфускация: от чего защищает и от чего нет
- [ ] 🟡 Биометрия: `BiometricPrompt`, привязка к криптооперации, `CryptoObject`
- [ ] 🟡 Поверхность атаки: экспортируемые компоненты, валидация deep links по allowlist, `FLAG_SECURE`, логи без PII
- [ ] 🟡 Платежи и чувствительный ввод: как сузить PCI-скоуп (SDK провайдера, токенизация, поля карты в его вебвью/компоненте), почему свой ввод карты — дорогое решение, `FLAG_SECURE` и запрет скриншотов на таких экранах
- [ ] 🟢 OAuth/PKCE, refresh-токены и их ротация, key attestation (в 2026 два корневых якоря доверия, Remote Key Provisioning на Android 16+)
- [ ] 🟢 Приватность: Data Safety в Play, GDPR/152-ФЗ, минимизация данных, advertising ID

## 13. On-device AI и AI в работе 🟡

> Разбор всего блока — в `17-ai-deep.md`.

- [ ] 🟡 Как вы используете AI-инструменты в разработке: где помогают, где вы им не доверяете, как ревьюите сгенерированный код
- [ ] 🟢 Gemini Nano и AICore: модель живёт в системном сервисе, вес не бандлится в приложение, обновляется системой
- [ ] 🟢 ML Kit GenAI API: summarization, proofreading, rewriting, image description, speech recognition, prompt; проверка `FeatureStatus` и догрузка адаптера. Важно: ни один из этих API не GA — все в бете или альфе
- [ ] 🟢 On-device vs cloud: приватность, стоимость, латентность, доступность модели на конкретном железе, фолбэк; hybrid inference
- [ ] 🟢 LiteRT для собственных моделей, бюджет размера и старта, инференс только на переднем плане

## 14. Алгоритмы и live coding 🟡

> Разбор всего блока — в `Algorithms_LeetCode_Easy_Medium_Senior_Android_Guide.markdown`:
> паттерны с кодом на Kotlin, инварианты, типовые ошибки, Kotlin/JVM-грабли и план подготовки
> по этапам. Практические задачи на корутинах (дебаунсер, пул с ограничением, кэш с TTL) —
> в `08-coroutines-android.md`, раздел 4.

- [ ] 🔴 Big O по времени и памяти, умение оценить своё решение вслух
- [ ] 🔴 Коммуникация в кодинге: проговорить условия, edge cases, наивное решение → оптимизация
- [ ] 🔴 Формат «дан проект с багами»: починить, дополнить фичу, покрыть тестами, объяснить решения (актуально для Авито и не только)
- [ ] 🔴 Массивы и строки: два указателя, скользящее окно, префиксные суммы
- [ ] 🔴 Хеш-таблицы: частоты, группировка, поиск пар
- [ ] 🔴 Бинарный поиск, в том числе по ответу
- [ ] 🟡 Стек и очередь, монотонный стек
- [ ] 🟡 Деревья и графы: BFS, DFS, обходы, топологическая сортировка
- [ ] 🟡 Сортировки, интервалы, слияния
- [ ] 🟡 Базовое ДП: рюкзак, лестница, LIS
- [ ] 🟡 Куча и `k` наибольших/наименьших
- [ ] 🟡 Практические задачи на Kotlin: LRU-кэш, дебаунсер, пул задач с ограничением параллелизма, ретрай с backoff, парсер, in-memory кэш с TTL

## 15. Mobile System Design 🔴

- [ ] 🔴 Фреймворк ответа (детали в `04-system-design.md`): требования → оценка масштаба → архитектура и обоснование → компоненты → сценарии отказа → трейд-офы
- [ ] 🔴 Уметь проговорить API-контракт: эндпоинты, форма ответов, стратегия пагинации
- [ ] 🔴 Мобильные ограничения как отдельный класс проблем: батарея, трафик, память, обрывы сети, смерть процесса, устаревшие версии приложения на руках у пользователей
- [ ] 🔴 Deep dive: способность 20 минут держать разговор про одну коробочку на схеме — именно это отличает оффер от «прошёл»
- [ ] 🟡 Канонические задачи: лента, чат, офлайн-заметки, загрузка/выгрузка медиа, трекинг геолокации, feature flags, аналитика/логирование, плеер, крэш-репортер
- [ ] 🟡 Наблюдаемость: метрики, крэш-репортинг, трейсинг, алерты, что мониторить после релиза
- [ ] 🟡 Релизная стратегия: staged rollout, kill-switch, форс-апдейт, миграции данных на клиенте

## 16. Senior-сигналы вне техники 🔴

> Формулировки, образец полного STAR-ответа и вопросы работодателю — в `05-behavioral.md`.

- [ ] 🔴 Владение фичей end-to-end: от продуктовой постановки до метрик после релиза
- [ ] 🔴 Инцидент в проде, который вы вели: детект → митигация → постмортем
- [ ] 🔴 Архитектурное решение, которое вы бы отменили через 18 месяцев, и какой сигнал заставил бы это заметить
- [ ] 🔴 Как вы подняли планку качества в команде системно (перф-бюджеты, lint-правила, baseline profiles, культура тестов)
- [ ] 🔴 Конфликт с бэкендом или продуктом: как продавили или как уступили и почему
- [ ] 🟡 Менторство, ревью, онбординг, техрадар
- [ ] 🟡 Оценка сроков и работа с неопределённостью, декомпозиция
- [ ] 🟡 Продуктовое мышление: метрики, A/B-тесты, аналитика, чем ваша фича помогла бизнесу

---

## Мини-аудит: 12 вопросов «готов / не готов»

Ответьте вслух, засекая время. Меньше 2 минут внятного ответа с примером — тема в работу.

1. Почему `suspend` сам по себе не делает вызов безопасным с UI-потока?
2. Что именно происходит при отмене корутины и как правильно писать `try/catch` рядом с ней?
3. Как Compose решает, что можно пропустить рекомпозицию, и что такое strong skipping?
4. Как вы моделируете одноразовое событие из ViewModel и какая проблема у вашего варианта?
5. Чем process death отличается от configuration change, и что вы восстанавливаете в каждом случае?
6. Ваше приложение стартует 2,5 секунды. Ваши первые три шага?
7. Как устроен offline-first в вашем проекте и как вы решаете конфликты?
8. Почему cursor-пагинация, а не offset?
9. Как вы гарантируете доставку действия, начатого офлайн, если процесс умер?
10. Hilt или Koin в вашем следующем проекте — и почему именно там?
11. Как вы распилите монолит на 600k строк с 12-минутной инкрементальной сборкой?
12. Расскажите про архитектурное решение, о котором вы жалеете.
