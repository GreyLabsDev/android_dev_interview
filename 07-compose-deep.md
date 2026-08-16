# Jetpack Compose для собеседования Senior Android Developer

Разбор в том же формате, что и `Kotlin_Senior_Android_Guide.markdown`: вопрос → механика →
код → подвох, который вылезет на follow-up. Покрывает блок 3 чеклиста и вопросы 39–59 из банка.

Ориентир: на senior-интервью Compose спрашивают не «как сверстать», а «как работает и почему тормозит».
Почти каждый вопрос сводится к трём вещам — что такое рекомпозиция, что такое стабильность
и в какой фазе читается состояние.

---

# 1. Что такое composable-функция

## 1.1. Во что превращается `@Composable`

Compose-компилятор — это плагин к Kotlin-компилятору. Он переписывает каждую `@Composable`-функцию,
добавляя скрытые параметры:

```kotlin
@Composable
fun Greeting(name: String) { Text(name) }

// примерно во что превращается:
fun Greeting(name: String, $composer: Composer, $changed: Int) {
    $composer.startRestartGroup(key)
    // ... проверка, можно ли пропустить, на основе $changed
    Text(name, $composer, ...)
    $composer.endRestartGroup()?.updateScope { c, _ -> Greeting(name, c, $changed or 1) }
}
```

Три следствия, которые нужно уметь произнести:

- Composable-функция не «возвращает UI». Она **записывает изменения в структуру данных** через `Composer`.
  Поэтому обычно она возвращает `Unit`, а вызвать её можно только из другой `@Composable`-функции —
  ей нужен `Composer`, которого в обычной функции нет. Возвращать значение при этом не запрещено
  (`rememberLazyListState()`, `rememberCoroutineScope()`), но такая функция не будет skippable — см. 3.2.
- `$changed` — битовая маска, в которой закодировано, изменились ли параметры с прошлого вызова.
  На ней строится решение о пропуске.
- `updateScope` регистрирует **scope рекомпозиции**: при инвалидации Compose перезапустит именно эту функцию,
  а не всё дерево.

## 1.2. Группы

Компилятор оборачивает вызовы в группы: restart group (перезапускаемая функция),
replaceable group (ветка `if`/`when`), movable group (`key { }`). Группы дают позиционную идентичность:
Compose понимает, что «этот элемент — тот же самый, что был в прошлой композиции».

`key { }` нужен там, где позиция меняется, а идентичность сохраняется — иначе состояние внутри
`remember` переедет не туда.

## 1.3. Slot table

Slot table — это плоская структура данных (gap buffer), в которой хранится состояние композиции:
значения `remember`, группы, узлы дерева. Доступ позиционный: `remember` привязан к месту вызова,
а не к имени переменной.

Отсюда правило про условные вызовы: если вы вызываете composable внутри `if`, компилятор оборачивает
ветку в replaceable group. Но если вы пытаетесь вызывать composable в цикле с меняющимся порядком
без `key`, состояние поедет.

## 1.4. Snapshot-система

`mutableStateOf` создаёт объект, реализующий `MutableState` поверх системы снапшотов —
по сути, MVCC внутри процесса:

- каждое состояние хранит цепочку **записей** (state records) с версиями;
- поток работает в контексте снапшота и видит согласованный срез всех состояний;
- запись создаёт новую запись в mutable-снапшоте; при `apply()` изменения становятся видимыми глобально;
- конфликты между снапшотами разрешаются (или приводят к исключению).

Практический смысл: Compose **автоматически отслеживает чтения**. Когда вы читаете `state.value`
внутри композиции, текущий scope подписывается на это состояние. Когда значение меняется — scope инвалидируется.

```kotlin
// Изменение состояния из фонового потока безопасно:
// snapshot-система обеспечивает согласованность.
withContext(Dispatchers.IO) {
    Snapshot.withMutableSnapshot { counter.value += 1 }
}
```

**Подвох на follow-up:** «как Compose узнаёт, что нужно перерисовать именно этот кусок?» Ответ — не через
сравнение деревьев (как в React), а через подписку на чтение состояния в конкретном scope рекомпозиции.

---

# 2. Три фазы кадра

## 2.1. Composition → Layout → Drawing

- **Composition** — «что показывать»: выполняются composable-функции, строится/обновляется дерево узлов.
- **Layout** — «где и какого размера»: measure и placement, один проход сверху вниз и снизу вверх.
- **Drawing** — «как выглядит»: отрисовка в канву.

Каждая фаза может выполниться без предыдущей. Это и есть главный рычаг оптимизации: чем позже
читается состояние, тем меньше работы.

## 2.2. Отложенное чтение состояния

```kotlin
// Плохо: чтение offset в композиции → рекомпозиция на каждом кадре анимации
Box(Modifier.offset(x = animatedOffset.dp))

// Хорошо: чтение в фазе layout → только re-layout
Box(Modifier.offset { IntOffset(animatedOffset.roundToInt(), 0) })

// Ещё лучше для чисто визуальных изменений: чтение в фазе draw
Box(Modifier.graphicsLayer { translationX = animatedOffset })
```

`graphicsLayer` важен ещё и потому, что выносит содержимое в отдельный слой:
альфа, поворот и сдвиг применяются на этапе композитинга, без перерисовки детей.

**Вопрос-ловушка:** «почему анимация alpha через `Modifier.alpha(state)` дороже, чем через
`graphicsLayer { alpha = ... }`?» Потому что первая версия читает состояние в композиции.

## 2.3. Как это связано с производительностью

Иерархия стоимости: рекомпозиция дороже re-layout, re-layout дороже re-draw. Оптимизация Compose —
это почти всегда «сдвинуть чтение состояния на фазу ниже» или «сузить scope рекомпозиции».

---

# 3. Рекомпозиция

## 3.1. Что её триггерит

Изменение значения `State`, которое было **прочитано** внутри scope рекомпозиции. Не изменение параметра
как такового, не вызов setState, а именно чтение отслеживаемого состояния.

## 3.2. Skippable и restartable

Компилятор помечает функцию:

- **restartable** — у неё есть свой scope, её можно перезапустить отдельно;
- **skippable** — её вызов можно пропустить, если все параметры «не изменились».

Функция не будет skippable, если хотя бы один параметр нестабилен (до strong skipping),
если она возвращает значение или помечена `@NonRestartableComposable`.

## 3.3. Стабильность

Тип стабилен, если:

- Compose может определить, изменилось ли значение (корректные `equals`);
- публичные свойства неизменяемы либо изменения происходят через `State` и потому наблюдаемы.

Стабильные из коробки: примитивы, `String`, функциональные типы, `State`, помеченные `@Stable`/`@Immutable`,
и data-классы, у которых **все** поля стабильны и объявлены как `val`.

Нестабильные типичные случаи:

- `List<T>`, `Map`, `Set` — это интерфейсы, за которыми может стоять мутабельная реализация;
- классы из модулей, которые не компилируются Compose-компилятором (например, ваш `:domain`-модуль без Compose);
- `var`-поля.

Решения: `kotlinx.collections.immutable` (`ImmutableList`, `PersistentList`), аннотации `@Immutable`/`@Stable`,
файл конфигурации стабильности (`stabilityConfigurationFile`) для чужих типов.

```kotlin
@Immutable
data class UiUser(val id: String, val name: String, val tags: ImmutableList<String>)
```

**Подвох:** `@Immutable` — это обещание компилятору, а не проверка. Если вы соврали и объект меняется,
UI просто не обновится, и баг будет выглядеть как «иногда не перерисовывается».

## 3.4. Strong skipping

Включён по умолчанию для Compose-компилятора начиная с Kotlin 2.0.20. Меняет две вещи:

- composable с **нестабильными** параметрами всё равно становится skippable: для таких параметров
  сравнение идёт по ссылке (`===`), а не по `equals`;
- лямбды запоминаются автоматически (раньше это делали руками через `remember`).

Что важно сказать на интервью: strong skipping снял большую часть боли, но **не отменил стабильность**.
Сравнение по ссылке означает, что новый экземпляр `List` на каждой эмиссии state всё равно вызовет рекомпозицию.
Если вы каждый раз делаете `items.map { ... }` в теле composable — вы создаёте новую ссылку и теряете пропуск.

## 3.5. Сужение scope

```kotlin
// Плохо: чтение state в родителе → рекомпозиция всей колонки
@Composable
fun Screen(state: State<Int>) {
    Column {
        Header()
        Text("Count: ${state.value}")
        HeavyList()
    }
}

// Лучше: чтение изолировано в мелком composable
@Composable
fun Screen(state: State<Int>) {
    Column {
        Header()
        Counter(state)   // инвалидируется только этот scope
        HeavyList()
    }
}
```

То же самое достигается передачей лямбды (`() -> Int`) вместо значения: чтение откладывается до места использования.

---

# 4. Состояние

## 4.1. `remember`

Сохраняет значение между рекомпозициями в slot table. Переживает рекомпозицию, **не переживает**
пересоздание Activity и смерть процесса. Ключи: при изменении ключа значение вычисляется заново.

```kotlin
val formatted = remember(timestamp) { formatDate(timestamp) }
```

## 4.2. `rememberSaveable`

Дополнительно сохраняет значение в `Bundle` через `SaveableStateRegistry`, поэтому переживает
поворот экрана и смерть процесса. Ограничение: тип должен быть Bundle-совместим либо иметь `Saver`.

```kotlin
val state = rememberSaveable(stateSaver = TextFieldValue.Saver) {
    mutableStateOf(TextFieldValue(""))
}

// Кастомный Saver
val UserSaver = listSaver<User, Any>(
    save = { listOf(it.id, it.name) },
    restore = { User(it[0] as String, it[1] as String) },
)
```

**Подвох:** `rememberSaveable` — это не замена `ViewModel` + `SavedStateHandle`. В Bundle нельзя класть
много данных (`TransactionTooLargeException`). Правило: в Saveable — идентификаторы и позиция скролла,
в SavedStateHandle — ключи для перезапроса, сами данные — перезапрашивать или брать из БД.

## 4.3. `derivedStateOf`

Нужен, когда **часто меняющееся** состояние отображается в **редко меняющееся** производное.

```kotlin
val listState = rememberLazyListState()
// Плохо: рекомпозиция на каждый пиксель скролла
val showButton = listState.firstVisibleItemIndex > 0

// Хорошо: рекомпозиция только при смене true/false
val showButton by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 0 }
}
```

**Подвох:** `derivedStateOf` часто ставят там, где достаточно `remember(key)`. Если входные данные
меняются с той же частотой, что и результат, `derivedStateOf` только добавляет накладные расходы.

## 4.4. `produceState`

Превращает не-Compose источник в `State`, запуская корутину, привязанную к композиции.

```kotlin
@Composable
fun userState(id: String, repo: UserRepository): State<UiState> = produceState<UiState>(
    initialValue = UiState.Loading, id, repo,
) {
    value = try { UiState.Content(repo.load(id)) } catch (e: IOException) { UiState.Error }
}
```

## 4.5. `rememberUpdatedState`

Фиксирует «свежее» значение внутри долгоживущего эффекта, который не должен перезапускаться.

```kotlin
@Composable
fun Splash(onTimeout: () -> Unit) {
    val currentOnTimeout by rememberUpdatedState(onTimeout)
    LaunchedEffect(Unit) {          // не перезапускается
        delay(3.seconds)
        currentOnTimeout()          // но вызовет актуальный колбэк
    }
}
```

Без `rememberUpdatedState` эффект захватит первую версию лямбды и вызовет устаревший колбэк.

## 4.6. State hoisting и UDF

Правило: состояние поднимается до самого низкого общего предка, которому оно нужно.
Composable получает значение и лямбду события (`value: T, onValueChange: (T) -> Unit`) — так он
становится stateless, переиспользуемым и тестируемым.

Что где живёт:

- Эфемерное UI-состояние (раскрыт ли аккордеон, позиция скролла) — в composable через `remember`.
- Состояние экрана (данные, загрузка, ошибка) — в `ViewModel`.
- Состояние, переживающее смерть процесса, — в `SavedStateHandle` или в БД.

**Вопрос на интервью:** «как вы решаете, что тащить в ViewModel?» Хороший ответ содержит критерий,
а не вкусовщину: если состояние нужно пережить пересоздание Activity, или им управляет бизнес-логика,
или оно нужно нескольким экранам — оно в ViewModel. Иначе — локально.

---

# 5. Side effects

## 5.1. `LaunchedEffect`

Запускает корутину, привязанную к жизни composable в композиции. Отменяется при выходе из композиции
и **перезапускается при смене ключа**.

```kotlin
LaunchedEffect(userId) { viewModel.load(userId) }
```

Ключи — главный источник багов:

- `LaunchedEffect(Unit)` — запустится один раз за жизнь composable в композиции;
- `LaunchedEffect(someObject)` с нестабильным объектом — перезапуск на каждую рекомпозицию;
- забыли ключ, от которого зависит эффект — эффект работает со старыми данными.

## 5.2. `DisposableEffect`

Для эффектов, требующих очистки: регистрация слушателей, подписки на системные события.

```kotlin
DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event -> /* ... */ }
    lifecycleOwner.lifecycle.addObserver(observer)
    onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
}
```

## 5.3. `SideEffect`

Выполняется после **каждой успешной** композиции. Нужен для публикации состояния Compose во внешний
не-Compose мир (аналитика, обновление поля в объекте, который живёт вне композиции).

## 5.4. `rememberCoroutineScope`

Scope, привязанный к точке композиции, для запуска корутин **из колбэков** (нажатие кнопки),
а не при входе в композицию.

```kotlin
val scope = rememberCoroutineScope()
Button(onClick = { scope.launch { snackbarHostState.showSnackbar("Готово") } }) { Text("OK") }
```

Разница с `LaunchedEffect` в одном предложении: `LaunchedEffect` — «когда появился на экране»,
`rememberCoroutineScope` — «когда пользователь что-то сделал».

## 5.5. `snapshotFlow`

Превращает чтение `State` в `Flow`.

```kotlin
LaunchedEffect(listState) {
    snapshotFlow { listState.firstVisibleItemIndex }
        .distinctUntilChanged()
        .collect { analytics.trackScroll(it) }
}
```

## 5.6. Общее правило

Composable-функция должна быть **идемпотентной и без побочных эффектов** в теле: её могут вызвать
сколько угодно раз, в любом порядке, на любом потоке, и она может быть отброшена. Любой побочный
эффект — через API эффектов.

---

# 6. Списки и производительность

## 6.1. `key` в `LazyColumn`

```kotlin
LazyColumn {
    items(
        items = messages,
        key = { it.id },
        contentType = { it.type },
    ) { message -> MessageRow(message) }
}
```

- `key` даёт элементам стабильную идентичность: при вставке в середину Compose переиспользует
  существующие узлы и сохраняет их внутреннее состояние, а не пересобирает список.
- `contentType` позволяет переиспользовать композиции между элементами одного типа — важно для
  разнородных лент.

**Почему индекс — плохой ключ:** при вставке элемента в начало все индексы сдвигаются,
идентичность ломается, состояние (`remember`, анимации, позиция ввода) уезжает к соседям.
Это и есть тот самый «мигающий список».

## 6.2. Типичные причины jank в списке

1. Нестабильные параметры элемента → рекомпозиция всех видимых строк.
2. Тяжёлые вычисления в теле composable (форматирование, сортировка, парсинг) без `remember`.
3. Отсутствие `key`/`contentType`.
4. Вложенный скролл без фиксированных размеров, из-за чего элементы измеряются многократно.
5. Загрузка изображений без указания размера — постоянные перекомпоновки layout.
6. Чтение часто меняющегося состояния (скролл, анимация) в композиции вместо layout/draw.
7. `SubcomposeLayout` (в том числе `BoxWithConstraints`) в каждой ячейке — субкомпозиция дороже обычного layout.

## 6.3. Как измерять

- **Compose compiler metrics и reports** — покажут, какие функции skippable/restartable и какие
  параметры признаны нестабильными:

```kotlin
composeCompiler {
    metricsDestination = layout.buildDirectory.dir("compose-metrics")
    reportsDestination = layout.buildDirectory.dir("compose-reports")
}
```

- **Layout Inspector** с подсчётом рекомпозиций — быстрый способ найти «горячий» узел.
- **Macrobenchmark + `FrameTimingMetric`** — единственный способ доказать улучшение цифрами.

На интервью цифра из собственного замера («на этом экране было 60 рекомпозиций на скролл, стало 4»)
весит больше, чем правильный пересказ теории.

---

# 7. Layout и модификаторы

## 7.1. Порядок модификаторов

Модификаторы применяются слева направо, каждый оборачивает следующий.

```kotlin
Modifier.padding(16.dp).background(Color.Red)  // отступ снаружи, фон внутри
Modifier.background(Color.Red).padding(16.dp)  // фон снаружи, отступ внутри
```

Правило для `clickable`: ставьте его до `padding`, если хотите, чтобы отступ был кликабельным.

## 7.2. Кастомный `Layout`

```kotlin
@Composable
fun Column2(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Layout(content = content, modifier = modifier) { measurables, constraints ->
        val placeables = measurables.map { it.measure(constraints) }
        layout(constraints.maxWidth, placeables.sumOf { it.height }) {
            var y = 0
            placeables.forEach { it.placeRelative(0, y); y += it.height }
        }
    }
}
```

Ключевое ограничение Compose: **каждого ребёнка можно измерить только один раз** за проход.
Это то, что даёт линейную сложность layout вместо экспоненциальной, как в старых вложенных `LinearLayout`.

## 7.3. `SubcomposeLayout` и его цена

`SubcomposeLayout` позволяет отложить композицию детей до момента, когда известны constraints
(на этом построены `BoxWithConstraints` и `LazyColumn`). Цена: композиция происходит в фазе layout,
что дороже и ломает пропуск. Не используйте `BoxWithConstraints` там, где хватит обычного layout.

## 7.4. `Modifier.Node`

Современный способ писать кастомные модификаторы. Заменил `composed { }`, который создавал
композицию на каждый вызов и мешал пропуску. `Modifier.Node` — это обычный объект в дереве модификаторов:
дешевле аллокации, есть доступ к coroutine scope и к жизненному циклу узла.

---

# 8. CompositionLocal

Неявная передача значения вниз по дереву.

```kotlin
val LocalAnalytics = staticCompositionLocalOf<Analytics> { error("Not provided") }

CompositionLocalProvider(LocalAnalytics provides analytics) { App() }
```

- `compositionLocalOf` — при изменении значения инвалидируются только читатели. Для часто меняющихся значений.
- `staticCompositionLocalOf` — Compose не отслеживает чтения, при изменении перекомпонуется всё поддерево `Provider`.
  Дешевле при чтении, поэтому подходит для того, что практически не меняется (тема, аналитика, DI-контейнер).

**Подвох:** CompositionLocal — это скрытая зависимость, которую не видно в сигнатуре. Уместен для
сквозных вещей (тема, локаль, insets), неуместен для передачи данных экрана — их передавайте параметрами.

---

# 9. Архитектура Compose-экрана

## 9.1. Разделение на stateful и stateless

```kotlin
@Composable
fun FeedRoute(viewModel: FeedViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    FeedScreen(state = state, onRefresh = viewModel::refresh)
}

@Composable
fun FeedScreen(state: FeedUiState, onRefresh: () -> Unit) { /* только UI */ }
```

Такое разделение даёт превью, скриншот-тесты и UI-тесты без ViewModel.

## 9.2. Сбор состояния

Используйте `collectAsStateWithLifecycle()`, а не `collectAsState()`: второй продолжает собирать,
когда экран в фоне, и держит upstream активным.

## 9.3. Одноразовые события

Три подхода, и у каждого есть недостаток — на интервью нужно назвать именно его:

| Подход | Проблема |
| --- | --- |
| `Channel` + `receiveAsFlow` | Только один потребитель. Отправка не теряется (канал буферизует и дождётся коллектора), но событие можно потерять **после** `receive`, если коллектор отменили сменой lifecycle прямо в этот момент |
| `SharedFlow(replay = 0)` | Событие теряется, если в момент `emit` нет активного коллектора; при нескольких коллекторах — обработается каждым |
| Событие как часть state + явный `consume()` | Больше кода, состояние захламляется, но потерь нет |

Практичный ответ: навигацию и снекбары делать через `Channel` с коллектором в `LaunchedEffect`,
а всё, что нельзя терять, моделировать состоянием.

## 9.4. Стоит ли каждому экрану ViewModel

Ответ, который ждут: ViewModel нужна там, где есть состояние, переживающее пересоздание,
и обращения к бизнес-логике. Для статического экрана (например, «О приложении») ViewModel — лишний слой.

---

# 10. Тестирование и доступность

## 10.1. Правила тестов

```kotlin
@get:Rule val composeTestRule = createComposeRule()          // изолированные composable
// createAndroidComposeRule<MainActivity>()                  // нужен Activity: ресурсы, навигация, Hilt
```

Compose-тесты можно класть в `test`-сорсет и гонять на JVM через Robolectric — это на порядок быстрее эмулятора.

## 10.2. Семантика вместо текста

```kotlin
composeTestRule.onNodeWithTag("submit").performClick()
composeTestRule.onNodeWithContentDescription("Избранное").assertIsDisplayed()
composeTestRule.waitUntil { composeTestRule.onAllNodesWithTag("row").fetchSemanticsNodes().isNotEmpty() }
```

Поиск по тексту ломается при локализации; предпочтительны семантические матчеры, `testTag` — как запасной вариант.

## 10.3. Доступность

Тестируемость и доступность в Compose — одно и то же дерево семантики. Практики:
`contentDescription` для всего нетекстового, `Modifier.semantics(mergeDescendants = true) { }`
для составных элементов (обратите внимание: это **параметр** функции `semantics`, а не свойство
внутри лямбды — частая ошибка), минимальный размер тач-таргета 48 dp, проверка на крупных шрифтах
и в TalkBack, `stateDescription` для переключателей.

---

# 11. Интероп с View

```kotlin
AndroidView(
    factory = { context -> MapView(context) },
    update = { view -> view.setCenter(center) },
    onRelease = { it.onDestroy() },
)
```

Стратегия миграции экрана: снизу вверх, начиная с листовых компонентов, через `ComposeView`
внутри существующего layout. Обратный интероп (`AndroidView`) оставляйте для того, чего в Compose нет:
карты, плееры, WebView, кастомные легаси-вью.

---

# 12. Частые вопросы «что не так с этим кодом»

## 12.1

```kotlin
@Composable
fun Screen(viewModel: MyViewModel) {
    viewModel.load()          // ❌
    val state by viewModel.state.collectAsStateWithLifecycle()
}
```

Побочный эффект в теле composable: `load()` будет вызываться на каждую рекомпозицию.
Правильно — `LaunchedEffect(Unit) { viewModel.load() }` или загрузка в `init` ViewModel.

## 12.2

```kotlin
@Composable
fun Items(items: List<Item>) {
    val sorted = items.sortedBy { it.name }   // ❌ на каждую рекомпозицию
    LazyColumn { items(sorted) { ItemRow(it) } }
}
```

Тяжёлая операция без `remember(items)`. И сортировку по-хорошему стоит делать в ViewModel: composable
не место для бизнес-логики.

## 12.3

```kotlin
LazyColumn {
    items(messages) { message -> MessageRow(message) }   // ❌ нет key
}
```

Без `key` вставка в начало ломает идентичность элементов.

## 12.4

```kotlin
@Composable
fun Timer(onFinish: () -> Unit) {
    LaunchedEffect(Unit) { delay(5000); onFinish() }     // ❌ устаревшая лямбда
}
```

Нужен `rememberUpdatedState(onFinish)`.

## 12.5

```kotlin
val scope = rememberCoroutineScope()
LaunchedEffect(Unit) { scope.launch { ... } }            // ❌ бессмысленно
```

Двойная обёртка: `LaunchedEffect` уже даёт корутину со своим жизненным циклом.
Корутина из `scope.launch` не является её потомком, поэтому она **не отменится при смене ключа
эффекта и при отмене самого `LaunchedEffect`** — она живёт до выхода call site
`rememberCoroutineScope()` из композиции. То есть привязка к жизненному циклу эффекта,
за которой вы шли в `LaunchedEffect`, здесь просто не работает: получаете работу, которая
переживает свой эффект. Либо пишите тело прямо в `LaunchedEffect`, либо используйте
`rememberCoroutineScope()` там, где он нужен — в обработчике события.

## 12.6

```kotlin
@Composable
fun Row(user: User) { ... }     // user — data class из :domain без Compose-компилятора
```

Тип будет признан нестабильным. Решения: UI-модель в UI-модуле, `@Immutable`, или файл конфигурации стабильности.

---

# 13. Чеклист самопроверки

Отвечайте вслух по 2–3 минуты:

1. Во что компилятор превращает `@Composable`-функцию и зачем там `$changed`?
2. Что такое slot table и почему `remember` привязан к позиции вызова?
3. Как snapshot-система отслеживает чтения состояния?
4. Назовите три фазы и приведите пример оптимизации через отложенное чтение.
5. Что делает тип стабильным? Почему `List` нестабилен?
6. Что изменил strong skipping и что он **не** отменил?
7. `remember` / `rememberSaveable` / `derivedStateOf` / `produceState` / `rememberUpdatedState` — по одному предложению на каждый.
8. `LaunchedEffect` / `DisposableEffect` / `SideEffect` / `rememberCoroutineScope` — когда что.
9. Что произойдёт, если ключом `LaunchedEffect` сделать нестабильный объект?
10. Зачем `key` и `contentType` в `LazyColumn`?
11. Семь причин jank в списке — назовите хотя бы пять.
12. `compositionLocalOf` vs `staticCompositionLocalOf`.
13. Почему `SubcomposeLayout` дорогой?
14. Как вы моделируете одноразовые события и какая у вашего варианта проблема?
15. Чем `collectAsStateWithLifecycle` лучше `collectAsState`?
16. Как доказать, что вы починили лишние рекомпозиции?
