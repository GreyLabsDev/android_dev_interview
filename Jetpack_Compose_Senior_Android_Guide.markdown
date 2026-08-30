# Jetpack Compose для собеседования Senior Android Developer

Комплексный гайд по декларативной модели Compose, recomposition, runtime/compiler internals, state, effects, UI phases, производительности, архитектуре и практическим Android-сценариям.

> Compose активно развивается. Материал описывает актуальную модель на 2026 год и намеренно не привязан к конкретной версии большинства артефактов. Experimental API нужно проверять по документации версии, используемой в проекте.

## Как пользоваться

- Отвечайте на вопрос вслух, затем сверяйтесь с объяснением.
- На Senior-уровне раскрывайте механизм, lifetime, ограничения и способ измерения.
- Не называйте recomposition проблемой без доказательства влияния на frame time.
- Различайте API Compose Runtime, Compose UI, Foundation, Material и Android integration.

---

# 1. Ментальная модель Jetpack Compose

Compose — декларативный UI toolkit. Приложение не говорит «создай View, затем измени её текст», а описывает, какой UI соответствует текущему state. Runtime сохраняет предыдущую Composition, отслеживает зависимости и применяет минимально необходимые изменения к UI-дереву.

Главная модель:

```text
State + Composable functions
        ↓
    Composition
        ↓
 UI node tree
        ↓
Layout and Draw
```

При изменении наблюдаемого state Compose инвалидирует связанные участки, повторно исполняет нужные composable-функции и обновляет только изменившуюся структуру. Это не полная перерисовка экрана и не обязательное пересоздание всех UI nodes.

## 1.1. Что такое composable-функция?

Функция с `@Composable` может вызывать другие composable-функции и участвует в протоколе Composition. Обычно она возвращает `Unit`: её результатом является не `View`, а описание UI через вызовы, которые runtime сопоставляет с предыдущим выполнением.

```kotlin
@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    Text(
        text = "Hello, $name",
        modifier = modifier,
    )
}
```

Composable должна быть:

- быстрой;
- идемпотентной относительно одинаковых входов;
- свободной от неконтролируемых side effects;
- готовой к повторному, пропущенному или отменённому выполнению.

## 1.2. Что такое Composition?

Composition — runtime-представление результата выполнения composable-кода:

- структура групп вызовов;
- сохранённые `remember`-значения;
- identity участков;
- restart scopes;
- зависимости от snapshot state;
- связь с UI nodes и effects.

Composition не равна Android View hierarchy. Один composable может не создать ни одного UI node, а другой — создать несколько.

## 1.3. Initial composition и recomposition

- Initial composition — первое выполнение и создание структуры.
- Recomposition — повторное выполнение инвалидированных участков после изменения state или параметров.
- Skipping — пропуск тела composable, если runtime/compiler доказали, что повторное выполнение не требуется.

Recomposition может завершиться без изменений UI-дерева. После неё layout или draw запускаются только при необходимости.

## 1.4. Почему declarative UI проще синхронизировать?

В imperative UI состояние часто распределено между model и полями View: один callback обновил текст, другой забыл visibility, третий изменил enabled. Compose заставляет получить весь видимый результат из state.

Это не устраняет архитектурные ошибки автоматически. Mutable shared state, потерянные events, гонки Flow и неверный lifecycle остаются возможны. Compose лишь делает однонаправленную модель естественнее.

## 1.5. Может ли Compose выполнять код в любом порядке?

Нельзя полагаться на точный порядок выполнения sibling composables, частоту вызова или обязательное завершение начатой recomposition. Runtime и compiler имеют право:

- пропустить функцию;
- повторно выполнить только часть дерева;
- отменить незавершённую recomposition;
- выполнять независимую работу оптимизированным способом.

Поэтому side effect в теле composable некорректен.

---

# 2. Что делает Compose Compiler

`@Composable` меняет соглашение вызова. Compose Compiler plugin преобразует исходную функцию, добавляя служебные параметры и runtime-протокол. Это объясняет, почему composable можно вызывать только из composable-контекста и почему обычная function reference не всегда эквивалентна composable lambda.

## 2.1. Как примерно преобразуется composable?

Compiler обычно добавляет:

- скрытый `Composer`;
- changed/dirty bit masks;
- маски default arguments;
- группы для сопоставления вызовов;
- restart scope;
- проверки skipping;
- лямбду повторного вызова;
- source information для tooling.

Упрощённый псевдокод:

```kotlin
fun Greeting(
    name: String,
    composer: Composer,
    changed: Int,
) {
    composer.startRestartGroup(/* key */)

    val dirty = calculateDirtyFlags(name, changed)

    if (canSkip(dirty) && composer.skipping) {
        composer.skipToEndGroup()
    } else {
        Text(name, composer, /* flags */)
    }

    composer.endRestartGroup()?.updateScope { next, force ->
        Greeting(name, next, changed or force)
    }
}
```

Это концептуальная модель. Конкретные имена, флаги и формат generated code являются implementation detail.

### Простая схема: что происходит на вызове composable

```text
Вызов Greeting("Anna")
        │
        ▼
startRestartGroup(key)        // "открыли карточку для этого места в дереве"
        │
        ▼
calculateDirtyFlags(name)     // сравнили новое значение name со старым
        │
        ▼
   изменилось? ──нет──▶ skipToEndGroup()   // тело функции НЕ выполняется повторно
        │
       да
        ▼
выполнить тело: Text(name, ...)
        │
        ▼
endRestartGroup()              // "закрыли карточку", запомнили lambda для будущего перезапуска
```

Смысл в двух словах: компилятор оборачивает функцию в блок «есть ли смысл выполнять тело заново», а не выполняет тело безусловно. Разработчик пишет обычный Kotlin-код — вся эта обвязка генерируется автоматически и не видна в исходниках.

## 2.2. Зачем changed/dirty masks?

Маски передают информацию об аргументах:

- значение известно как неизменившееся;
- значение изменилось;
- значение статическое;
- runtime должен сравнить с предыдущим.

Если родитель уже знает, что параметр не изменился, ребёнок не обязан выполнять повторное сравнение. На основе объединённых dirty flags generated code принимает решение о skip.

Dirty mask относится к конкретному вызову и не означает, что объект глобально «грязный». Snapshot invalidation и сравнение параметров — связанные, но разные механизмы.

**Простыми словами:** представьте, что перед вызовом функции родитель прикладывает стикер к каждому аргументу: «этот точно не изменился», «этот новый», «этот всегда один и тот же (constant)». Функции не нужно самой сравнивать значения — она читает стикеры и на основании этого решает: можно скипнуть тело целиком или нет.

```kotlin
@Composable
fun Greeting(name: String) { // допустим, вызывается повторно с тем же name
    Text("Hello, $name")
}

// Компилятор генерирует примерно такую проверку (упрощённо):
// if (изменился name == false && composer.skipping) {
//     composer.skipToEndGroup() // Text(...) не вызывается вообще
// } else {
//     Text("Hello, $name")
// }
```

Если `name` не менялся между recomposition — тело `Greeting` не выполнится вовсе, `Text` не будет вызван, кадр не перерисуется из-за этого composable.

## 2.3. Restartable и skippable — одно и то же?

Нет.

- Restartable composable создаёт точку, с которой runtime может начать recomposition.
- Skippable composable можно целиком пропустить при неизменившихся входах.
- Non-restartable функция выполняется вместе с ближайшим restartable parent.
- Non-skippable функция выполняется, если её parent дошёл до вызова.

Большинство обычных composables компилятор делает restartable. Аннотации вроде `@NonRestartableComposable` и `@NonSkippableComposable` — инструменты узкой оптимизации, а не стандарт для прикладного кода.

**Простая аналогия:** restartable — это «есть кнопка перезапуска именно для этого куска» (можно перезапустить `Counter`, не трогая весь экран). Skippable — это «кнопку можно вообще не нажимать, если ничего не изменилось».

```kotlin
@Composable
fun Screen(state: ScreenState) {   // restartable: у него есть restart scope
    Header()                        // skippable: без параметров, можно скипнуть почти всегда
    Counter(state.count)            // restartable + skippable: перезапустится только если count изменился
}
```

Если `state.count` не менялся, `Counter` будет пропущен (skip). Если менялся — перезапустится только `Counter`, а `Header` не тронут вообще, так как он не зависит от `state`.

## 2.4. Что такое `Composer`, `Recomposer` и `Applier`?

`Composer`:

- сопоставляет текущее выполнение с предыдущей Composition;
- работает с группами и SlotTable;
- реализует positional memoization;
- регистрирует scopes и state reads;
- создаёт change list.

`Recomposer`:

- получает invalidations;
- планирует recomposition;
- координируется с frame clock;
- запускает recomposition и применение изменений;
- управляет effect lifecycle.

`Applier` применяет рассчитанные операции к целевому дереву. Compose Runtime не привязан только к Android UI; конкретный UI backend предоставляет свой способ применения nodes.

**Простыми словами**, роли можно представить как три должности на «стройке UI»:

```text
Composer   — прораб, который сверяет новый план со старым и решает, что менять
Recomposer — диспетчер, который получает заявки "что-то изменилось" и планирует работу
Applier    — рабочий, который непосредственно вносит изменения в дерево (Android View/LayoutNode)
```

```text
изменился state
      │
      ▼
Recomposer получил invalidation → запланировал recomposition
      │
      ▼
Composer выполнил нужные composable заново, сравнил со старой Composition,
построил список изменений (change list)
      │
      ▼
Applier применил change list к реальному UI-дереву (LayoutNode/View)
```

## 2.5. Что хранится в SlotTable?

SlotTable — компактное side storage Composition:

- иерархия групп;
- ключи, parent/size metadata;
- число UI nodes;
- remembered values;
- anchors;
- данные restart scopes и CompositionLocal;
- служебная информация runtime.

Один composable не обязан соответствовать одной группе. Группы также создаются для условий, циклов, `key`, remembered values и emitted nodes.

`remember` привязан не к имени локальной переменной, а к логической позиции group/slot.

**Простая аналогия:** SlotTable — это таблица (или плоский массив) со «ячейками», пронумерованными по порядку вызовов, а не по именам переменных.

```kotlin
@Composable
fun Example(showDetails: Boolean) {
    val a = remember { "A" }         // slot 0
    if (showDetails) {
        val b = remember { "B" }     // slot 1 (существует, только пока showDetails == true)
    }
    val c = remember { "C" }         // slot 2
}
```

Если `showDetails` станет `false`, а затем снова `true`, значение `b` будет создано заново — Compose не помнит его "по имени переменной", он помнит структуру групп в SlotTable, и группа для `b` была разрушена при выходе из `if`.

## 2.6. Что такое RecomposeScope?

Это потенциальная точка входа для повторного выполнения restart group.

Когда scope читает snapshot state:

1. runtime регистрирует зависимость state → scope;
2. запись в state инвалидирует scope;
3. Recomposer планирует работу;
4. generated restart lambda повторно вызывает composable;
5. зависимости записываются заново.

Зависимости динамические: если новая ветка больше не читает state, соответствующая связь должна исчезнуть.

**Пример на коде:**

```kotlin
@Composable
fun Counter() {
    var count by remember { mutableIntStateOf(0) } // RecomposeScope этой функции читает count

    Button(onClick = { count++ }) { // запись в count при клике
        Text("Count: $count")       // чтение count регистрирует зависимость scope → count
    }
}
```

Пошагово: при первом выполнении `Counter` runtime запоминает «этот scope читал `count`». При клике `count++` меняет snapshot state, runtime находит все scope, зависящие от `count`, помечает их invalid и просит `Recomposer` перезапустить именно `Counter` (а не весь экран). После перезапуска зависимость `scope → count` регистрируется заново — если бы в новой версии `count` больше не читался (например, ветка `if` изменилась), связь исчезла бы.

---

# 3. Identity, lifecycle и recomposition

Compose должен сопоставить вызовы текущего выполнения с предыдущими экземплярами. По умолчанию используется positional identity: call site плюс положение среди соседних вызовов и структура групп.

Identity определяет lifetime:

- `remember`-значений;
- effects;
- coroutine из `LaunchedEffect`;
- локального state;
- сохранения lazy item;
- анимаций и UI nodes.

## 3.1. Что вызывает recomposition?

Типичные причины:

- изменение `MutableState`, прочитанного scope;
- новый параметр composable;
- изменение `CompositionLocal`;
- invalidation от внутренних Compose API;
- изменение observable state в layout/draw может перезапустить соответствующую фазу без composition.

Обычное изменение поля объекта, не являющегося snapshot-aware state, Compose не наблюдает.

## 3.2. Что значит positional memoization?

```kotlin
if (show) {
    val controller = remember { Controller() }
}
```

Значение связывается с позицией вызова `remember`. Когда ветка исчезает, группа покидает Composition и значение забывается. Когда ветка появляется снова, создаётся новый controller.

В цикле несколько вызовов из одного call site различаются порядком. Вставка элемента в начало может сместить identity всех последующих элементов.

## 3.3. Для чего нужен `key`?

```kotlin
for (message in messages) {
    key(message.id) {
        MessageRow(message)
    }
}
```

`key` добавляет data identity к позиции. При reorder runtime может переместить группу вместе с:

- remembered state;
- effects;
- restart scope;
- UI nodes.

Ключ должен быть стабильным и уникальным среди siblings этого call site. Индекс — плохой ключ для изменяемого порядка, random UUID при каждой recomposition ещё хуже.

## 3.4. `key {}`, `remember(key)` и effect key

Несмотря на одинаковое слово, задачи разные:

- `key(id) {}` задаёт identity участка Composition;
- `remember(id) {}` сбрасывает кешированное значение при изменении `id`;
- `LaunchedEffect(id)` отменяет coroutine и запускает новую;
- `DisposableEffect(id)` выполняет cleanup и регистрацию заново;
- `LazyColumn.items(key = ...)` задаёт item identity.

Неверный key означает либо stale state, либо лишние сбросы и перезапуски.

## 3.5. Recomposition всегда идёт от корня?

Нет. Snapshot state invalidates ближайший подходящий restart scope, и Recomposer может начать с него. Если state прочитан слишком высоко, область invalidation становится шире.

```kotlin
@Composable
fun Screen(state: ScreenState) {
    Header()
    Counter(value = state.counter)
    Footer()
}
```

При грамотных границах `Header` и `Footer` могут быть skipped. Важно не «дробить всё на функции ради performance», а создавать осмысленные APIs и читать часто меняющийся state близко к потребителю.

## 3.6. Почему side effects могут перезапускаться при reorder?

Без стабильного key identity item зависит от позиции. После вставки runtime считает, что существующий composable теперь представляет другой item. Его `LaunchedEffect` может отмениться или продолжить работу с другой сущностью.

Стабильный business ID — часть correctness, а не только оптимизация.

## 3.7. Что такое `movableContentOf`?

Он создаёт content, identity которого можно перемещать между местами Composition, сохраняя remembered state и nodes. Нужен для специальных случаев, когда один и тот же stateful subtree физически переезжает между ветками adaptive UI.

Это не замена обычному state hoisting и key. API добавляет runtime complexity и применяется только когда действительно нужно переместить саму Composition.

## 3.8. Что такое `retain`?

В новых версиях Compose Runtime `retain` дополняет `remember` и `rememberSaveable`: значение может пережить временный выход из hierarchy без сериализации. По lifetime оно ближе к короткоживущему retained state, но не является durable storage и не переживает process death как сохранённые данные.

Нужно проверять доступность и контракт в версии Runtime проекта.

```kotlin
@Composable
fun ExpensiveContent() {
    // обычный remember теряет значение, когда узел временно покидает Composition
    // (например, скрыт в свёрнутом LazyColumn без saveable-механизма)
    val expensiveState = retain { computeExpensiveState() }
}
```

Для screen business state стандартными владельцами по-прежнему являются `ViewModel`, `SavedStateHandle` и data layer.

---

# 4. Snapshot system и Compose State

Compose state — не просто callback/listener. Snapshot system хранит версии state records, отслеживает чтения и атомарно применяет изменения. Концептуально это похоже на versioned state/MVCC, но не следует отождествлять snapshots с конкретной СУБД.

## 4.1. Как `mutableStateOf` вызывает обновление UI?

```kotlin
var count by remember { mutableIntStateOf(0) }
Text("$count")
```

Во время чтения runtime регистрирует зависимость текущей фазы от state object. При записи:

1. mutation policy решает, отличается ли значение;
2. запись публикуется через snapshot;
3. наблюдатели получают invalidation;
4. Recomposer планирует затронутый scope;
5. UI повторно читает актуальное значение.

Если state не был прочитан участвующей фазой, сама запись не обязана изменить UI.

## 4.2. Что такое snapshot?

Snapshot задаёт согласованное представление snapshot-aware state. Mutable snapshot изолирует изменения до `apply`. Параллельные snapshots могут читать разные версии, а несовместимые записи способны вызвать apply conflict.

Runtime использует read/write observers:

- read observer строит зависимости;
- write/apply notifications инвалидируют потребителей;
- state records обеспечивают versioned view.

Snapshots не делают произвольный object graph immutable и не устраняют все data races внешнего кода.

**Пример изоляции:**

```kotlin
var count by mutableIntStateOf(0)

val snapshot = Snapshot.takeSnapshot()
try {
    count = 42                       // изменение вне snapshot, снаружи от него
    snapshot.enter {
        println(count)               // snapshot всё ещё видит старое значение (0), а не 42
    }
} finally {
    snapshot.dispose()
}
```

Mutable snapshot, наоборот, накапливает изменения локально и публикует их разом через `apply()`. Если два mutable snapshot одновременно меняют одно и то же state и оба пытаются `apply()`, второй `apply()` может завершиться конфликтом (`SnapshotApplyConflictException`), который нужно обработать (обычно — повторить попытку).

## 4.3. Mutation policies

Для `mutableStateOf` можно выбрать:

- `structuralEqualityPolicy()` — эквивалентность по `==`;
- `referentialEqualityPolicy()` — по `===`;
- `neverEqualPolicy()` — каждая запись считается новой;
- custom `SnapshotMutationPolicy`.

Если policy считает значения эквивалентными, наблюдаемого изменения не происходит.

```kotlin
val state = mutableStateOf(
    value = initial,
    policy = referentialEqualityPolicy(),
)
```

Custom policy должна соответствовать UI-семантике. Игнорирование значимого поля создаст stale UI, а `neverEqualPolicy` может вызвать лишние invalidations.

**Как policy влияет на recomposition, на конкретном примере:**

```kotlin
data class Point(val x: Int, val y: Int)

val structural = mutableStateOf(Point(0, 0)) // structuralEqualityPolicy() по умолчанию
structural.value = Point(0, 0)               // равно по equals() -> invalidation НЕ произойдёт

val referential = mutableStateOf(
    value = Point(0, 0),
    policy = referentialEqualityPolicy(),
)
referential.value = Point(0, 0)              // другой instance, но referentialEqualityPolicy сравнивает по ===
                                              // -> invalidation ПРОИЗОЙДЁТ, хотя данные идентичны
```

`structuralEqualityPolicy()` — правильный выбор по умолчанию для data class/value type. `referentialEqualityPolicy()` оправдан для больших объектов, где сравнение полей дороже, чем лишняя recomposition, либо когда identity объекта и есть значимая семантика.

## 4.4. Почему mutable объект внутри `State` опасен?

```kotlin
val users = mutableStateOf(mutableListOf<User>())
users.value.add(newUser)
```

Изменилось содержимое списка, но setter `value` не вызван. Snapshot system не наблюдает внутреннюю мутацию обычного `MutableList`.

Варианты:

```kotlin
users.value = users.value + newUser
```

или snapshot-aware collection:

```kotlin
val users = mutableStateListOf<User>()
users += newUser
```

Первый вариант лучше выражает immutable snapshot на архитектурной границе. Второй удобен для локального fine-grained UI state.

## 4.5. Специальные primitive state

Для часто обновляемых примитивов доступны:

- `mutableIntStateOf`;
- `mutableLongStateOf`;
- `mutableFloatStateOf`;
- `mutableDoubleStateOf`.

Они позволяют избежать boxing, возникающего у generic `MutableState<Int>`. Использовать их особенно полезно в animation/layout hot path, но только после оценки реальной частоты.

## 4.6. Snapshot-aware коллекции

Compose Runtime предоставляет:

- `mutableStateListOf` / `SnapshotStateList`;
- `mutableStateMapOf` / `SnapshotStateMap`;
- в актуальных версиях — state set API / `SnapshotStateSet`;
- `toMutableStateList` для создания observable list.

Операции коллекции являются наблюдаемыми. Но сама коллекция не делает элементы immutable: изменение обычного поля элемента не уведомит Compose.

```kotlin
data class Item(
    val id: Long,
    val selected: Boolean,
)

val items = mutableStateListOf<Item>()
items[index] = items[index].copy(selected = true)
```

На domain/ViewModel boundary обычно проще экспортировать immutable `List`, а snapshot collections оставить внутри UI state holder.

**Пример с `mutableStateMapOf`:**

```kotlin
val expandedIds = mutableStateMapOf<Long, Boolean>()

@Composable
fun UserRow(user: User) {
    val expanded = expandedIds[user.id] ?: false

    Row(Modifier.clickable { expandedIds[user.id] = !expanded }) {
        Text(user.name)
        if (expanded) Text(user.details)
    }
}
```

Запись в конкретный ключ карты — наблюдаемая операция сама по себе, `copy()` всей модели не требуется. Но если карту не очищать при удалении пользователей, она будет расти неограниченно — за lifecycle такого state нужно следить explicitly.

## 4.7. Что такое `Snapshot.withMutableSnapshot`?

Он позволяет выполнить группу snapshot writes и применить их вместе. Это полезно для согласованного обновления нескольких snapshot states вне обычной main-thread Composition.

```kotlin
Snapshot.withMutableSnapshot {
    first.value = newFirst
    second.value = newSecond
}
```

Это не database transaction и не заменяет синхронизацию внешних ресурсов. При сложной межпоточной модели лучше централизовать state transitions.

## 4.8. Опасность backward write

```kotlin
Text("Count: $count") // read
count++               // write после read
```

Scope прочитал старое значение и тут же инвалидировал себя новой записью. Это может создать бесконечный цикл recomposition.

Записи выполняют в:

- event callback;
- `LaunchedEffect`;
- ViewModel/state holder;
- `SideEffect`, если публикация должна быть после успешной composition.

## 4.9. State read зависит от фазы

Snapshot read регистрируется не только в composition:

- composition read → recomposition;
- measure read → remeasure;
- placement read → replace;
- draw read → redraw.

Это даёт один из важнейших способов оптимизации: читать часто меняющийся state в самой поздней фазе, которая действительно должна измениться.

---

# 5. `remember`, сохранение и производное состояние

`remember` — positional cache внутри текущей Composition. Он не является общим cache, lifecycle component или persistent storage.

## 5.1. Как работает `remember`?

```kotlin
val formatter = remember(locale) {
    DateFormatter(locale)
}
```

Calculation выполняется при первом входе и повторно, когда изменился key. Значение забывается, когда соответствующая identity покидает Composition.

Типичные ошибки:

- забытый key создаёт объект со старой dependency;
- лишний key постоянно сбрасывает state;
- side effect внутри calculation;
- ожидание сохранения после Activity recreation.

## 5.2. Почему `remember { mutableStateOf(parameter) }` часто ошибочен?

```kotlin
@Composable
fun Editor(initialText: String) {
    var text by remember { mutableStateOf(initialText) }
}
```

`initialText` используется только при первом входе. Последующее новое значение параметра не синхронизирует локальный state.

Возможные контракты:

- параметр действительно только initial value — это нужно явно назвать;
- state полностью контролирует parent;
- `remember(entityId)`, если при смене сущности редактор должен сброситься;
- отдельная синхронизация через effect, если она осмыслена и не уничтожает пользовательский ввод.

**Правильные реализации под каждый контракт:**

```kotlin
// 1) Параметр — только initial value, явно названо в имени:
@Composable
fun Editor(initialText: String) {
    var text by remember { mutableStateOf(initialText) } // корректно: имя параметра отражает контракт
    TextField(value = text, onValueChange = { text = it })
}

// 2) State полностью контролирует parent (state hoisting):
@Composable
fun Editor(text: String, onTextChange: (String) -> Unit) {
    TextField(value = text, onValueChange = onTextChange)
}

// 3) Сброс при смене сущности — entityId как key:
@Composable
fun Editor(entityId: Long, initialText: String) {
    var text by remember(entityId) { mutableStateOf(initialText) } // новый entityId -> новый remember
    TextField(value = text, onValueChange = { text = it })
}
```

Главная ошибка оригинала — не сам вызов `remember { mutableStateOf(initialText) }`, а отсутствие явного выбора одного из этих трёх контрактов.

## 5.3. `rememberSaveable`

Сохраняет небольшое UI state через saved-state registry, переживая configuration recreation и system-driven process recreation при наличии сохранённого Bundle.

```kotlin
var query by rememberSaveable { mutableStateOf("") }
```

Это не durable storage:

- Bundle ограничен размером;
- сохранение зависит от Android lifecycle;
- большие DTO, bitmap и списки хранить нельзя;
- business data восстанавливается из repository/database.

## 5.4. `Saver`, `listSaver`, `mapSaver`

Custom state сохраняют в компактное saveable-представление:

```kotlin
val UserDraftSaver = Saver<UserDraft, Bundle>(
    save = { draft ->
        bundleOf(
            "name" to draft.name,
            "age" to draft.age,
        )
    },
    restore = { bundle ->
        UserDraft(
            name = bundle.getString("name").orEmpty(),
            age = bundle.getInt("age"),
        )
    },
)
```

Хороший Saver сохраняет минимум для восстановления, а не сериализует весь объектный граф.

## 5.5. `SaveableStateHolder`

Позволяет сохранять `rememberSaveable` state для динамически появляющегося content по ключу. Применяется в навигации, tab/pager и custom containers, где subtree временно удаляется из Composition.

Owner обязан удалять state для identity, которая больше никогда не вернётся, иначе registry будет удерживать ненужные данные.

```kotlin
@Composable
fun TabsScreen(tabs: List<TabInfo>, selectedTab: String) {
    val saveableStateHolder = rememberSaveableStateHolder()

    Column {
        TabRow(tabs, selectedTab)

        Box(Modifier.weight(1f)) {
            // каждая вкладка сохраняет свой rememberSaveable state (например, scroll position),
            // даже когда content временно уходит из Composition при переключении вкладки
            saveableStateHolder.SaveableStateProvider(key = selectedTab) {
                TabContent(selectedTab)
            }
        }
    }
}

fun onTabRemovedPermanently(tabKey: String, holder: SaveableStateHolder) {
    holder.removeState(tabKey) // обязательная очистка, иначе утечка памяти
}
```

## 5.6. `derivedStateOf`

Создаёт производный snapshot state:

```kotlin
val showScrollToTop by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex > 0
    }
}
```

Полезен, когда dependency меняется часто, а итоговое значение — редко. Scroll position изменяется почти каждый кадр, boolean пересекает порог значительно реже.

Не нужен для каждого вычисления:

```kotlin
val fullName = "$firstName $lastName"
```

Если результат меняется с каждым входом и вычисление дешёвое, `derivedStateOf` только добавляет tracking overhead.

## 5.7. `remember(keys)` против `derivedStateOf`

- `remember(key)` пересчитывает значение во время recomposition, когда key изменился.
- `derivedStateOf` самостоятельно отслеживает snapshot reads и предоставляет `State`.
- Обычное вычисление выполняется при каждом достижении строки.

`derivedStateOf` не переносит тяжёлую работу в background. Большую фильтрацию/сортировку лучше выполнять в ViewModel/Flow или заранее подготовленном state.

**Сравнение на одном примере:**

```kotlin
@Composable
fun Example(listState: LazyListState, firstName: String, lastName: String) {
    // A: derivedStateOf — вход меняется почти каждый кадр, результат — редко
    val showButton by remember {
        derivedStateOf { listState.firstVisibleItemIndex > 0 }
    }

    // B: remember(keys) — пересчитывает при каждом изменении key, даже если результат тот же
    val fullName = remember(firstName, lastName) { "$firstName $lastName" }
}
```

В (A) `showButton` пересчитывается при каждом scroll-тике, но инвалидирует читателей только когда boolean реально меняется — recomposition читающего composable редкая. В (B) каждое изменение `firstName`/`lastName` вызывает пересчёт, и результат всё равно меняется — такая защита от пересчёта не нужна.

## 5.8. `snapshotFlow`

Преобразует snapshot reads в cold Flow:

```kotlin
LaunchedEffect(listState) {
    snapshotFlow { listState.firstVisibleItemIndex }
        .map { it > 0 }
        .distinctUntilChanged()
        .filter { it }
        .collect { analytics.reportScrolled() }
}
```

Block:

- исполняется в read-only snapshot;
- автоматически отслеживает прочитанный state;
- повторяется при изменении dependency;
- emits только неравный предыдущему результат;
- должен быть чистым и идемпотентным.

`snapshotFlow` полезен для event-processing/analytics, но не заменяет прямое чтение state для UI.

---

# 6. Stability, skipping и immutable-модели

Stability — compile-time контракт, помогающий compiler/runtime решить, можно ли безопасно skip composable при неизменившихся аргументах.

## 6.1. Что значит stable?

Упрощённый контракт:

- `equals` одной пары instances не меняет смысл произвольно;
- изменение публичного observable state уведомляет Compose;
- публичные свойства также имеют подходящую стабильность.

`MutableState<T>` — stable, хотя mutable: изменение `value` наблюдаемо.

**Типы, которые Compose обычно считает stable по умолчанию:**

- примитивы и их boxed-варианты (`Int`, `Long`, `Boolean` и т.д.);
- `String`, `Enum` и функциональные типы;
- `State<T>` / `MutableState<T>` и другие snapshot state containers;
- типы, явно помеченные `@Stable` или `@Immutable`;
- data-классы с `val`-свойствами, если тип каждого публичного свойства тоже stable.

Последний пункт не означает, что любой `data class` stable: `data class Screen(val items: List<Item>)` наследует нестабильность `List`.

**Пример: почему это важно для skipping**

```kotlin
data class UserUi(val id: Long, val name: String) // stable: val-поля, все типы stable, есть equals

@Composable
fun UserRow(user: UserUi) { // restartable + skippable
    Text(user.name)
}
```

Если родитель передаёт новый `UserUi` с теми же полями (`user.copy()` без изменений или тот же instance), compiler сравнивает по `equals` и пропускает (skip) `UserRow` — тело функции не выполняется повторно.

## 6.2. Что значит immutable?

Публично наблюдаемое состояние объекта после создания не меняется, а методы не скрывают изменение значимого state.

```kotlin
@Immutable
data class UserUi(
    val id: Long,
    val name: String,
)
```

Аннотация — обещание разработчика, а не runtime-проверка. Если внутри `@Immutable` хранится изменяемый список, Compose может skip нужное обновление.

Честная immutable UI-модель использует immutable-поля на всей публичной поверхности:

```kotlin
@Immutable
data class UiUser(
    val id: String,
    val name: String,
    val tags: ImmutableList<String>,
)
```

`@Stable` подходит и для намеренно mutable holder, но только если каждое наблюдаемое изменение проходит через snapshot state:

```kotlin
@Stable
class SearchState(initialQuery: String) {
    var query by mutableStateOf(initialQuery)
        private set

    fun updateQuery(value: String) {
        query = value
    }
}
```

Обычное `var query: String` в таком классе не регистрирует snapshot write. Пометка `@Stable` тогда лжива и способна оставить UI устаревшим.

## 6.3. Почему `List<T>` часто считается unstable?

Интерфейс `List` read-only, но underlying implementation может быть mutable. Compiler не может доказать глубокую неизменяемость стандартной коллекции.

Типичные нестабильные случаи:

- `List<T>`, `Map<K, V>` и `Set<T>`: за read-only интерфейсом может скрываться mutable implementation;
- публичное `var`, если изменения не наблюдаются через Compose state;
- модель из модуля, который не компилируется Compose compiler plugin: compiler не может вывести её контракт автоматически.

Решения по ситуации:

- strong skipping и тот же list instance;
- immutable/persistent collections;
- wrapper с честным контрактом;
- `stabilityConfigurationFile` для внешних типов, в чьём контракте команда уверена;
- не оптимизировать, если нет измеренной проблемы.

Например, для стабильной внешней модели можно задать configuration file в Compose compiler DSL:

```kotlin
composeCompiler {
    stabilityConfigurationFile = rootProject.layout.projectDirectory
        .file("compose-stability.conf")
}
```

В `compose-stability.conf` перечисляют только типы с реально соблюдаемым контрактом, например `com.example.domain.ImmutableUser`. Конфигурация не делает объект immutable и не отслеживает его мутации: ошибочная запись создаёт тот же риск stale UI, что и ложная аннотация.

**Демонстрация проблемы:**

```kotlin
@Composable
fun Feed(items: List<Item>) { // List<Item> compiler считает unstable
    Column {
        items.forEach { ItemRow(it) }
    }
}
```

Без strong skipping compiler не может доказать, что содержимое `items` не изменилось между вызовами, и generated code будет считать `Feed` unstable-параметром — recomposition родителя почти всегда перезапустит `Feed` целиком, даже если список идентичен. Решение — либо полагаться на strong skipping (сравнение по `===` для того же instance), либо использовать `ImmutableList` (kotlinx.collections.immutable) как явный stable-контракт:

```kotlin
@Composable
fun Feed(items: ImmutableList<Item>) { // явно stable для compiler
    Column {
        items.forEach { ItemRow(it) }
    }
}
```

## 6.4. Что делает strong skipping?

В актуальной модели compiler strong skipping включён по умолчанию начиная с Kotlin 2.0.20.

Он:

1. делает restartable composables потенциально skippable даже с unstable parameters;
2. автоматически memoizes lambdas внутри composable по captured values.

Сравнение:

- stable parameters — обычно `equals`;
- unstable parameters — identity (`===`).

Новый равный по содержимому unstable `List` считается изменившимся, а тот же instance может быть skipped.

## 6.5. Strong skipping делает тип stable?

Нет. Он меняет generated skipping strategy, но не исправляет mutable model и не делает внутренние мутации observable.

```kotlin
val list = mutableListOf("A")
Content(list)
list += "B"
```

Если ссылка та же и нет observable state write, UI может не получить invalidation вообще.

## 6.6. Нужно ли делать каждый composable skippable?

Нет. Проверка аргументов тоже имеет стоимость. Skipping мало полезен для:

- функции, которая редко recomposes;
- дешёвой обёртки над skippable children;
- функции с большим количеством дорогих `equals`;
- участка вне performance bottleneck.

Сначала измеряют frame time и источник работы, затем смотрят compiler metrics/stability reports.

**Пример, когда skipping не даёт выигрыша:**

```kotlin
@Composable
fun Divider(color: Color = DividerColor) { // дешёвая обёртка, вызывается редко
    Box(Modifier.fillMaxWidth().height(1.dp).background(color))
}
```

Проверка dirty flags и сравнение `color` может стоить дороже, чем просто выполнить тело заново — здесь skipping не критичен. Важнее skipping для composable, вызываемого часто (внутри списка) с дорогим телом.

## 6.7. Лямбды и strong skipping

Compiler memoizes lambdas внутри composable с keys по captured values. Это уменьшает случаи, когда новый callback ломает skipping child.

Но автоматическая мемоизация:

- не исправляет stale capture в неправильно спроектированном effect;
- не заменяет `rememberUpdatedState`;
- не делает event handler pure;
- может быть отключена для конкретной лямбды через специализированную аннотацию, если это действительно нужно.

## 6.8. Как диагностировать stability?

Инструменты:

- Layout Inspector recomposition/skip counts;
- Compose compiler reports;
- stability configuration/report;
- system trace и composition tracing;
- Macrobenchmark.

Не начинайте с `@Stable` на всех моделях. Сначала найдите пользовательскую проблему и докажите, что её причина — лишняя composition work.

**Как читать compiler report:** после сборки с включёнными Compose compiler metrics/reports генерируются файлы вида `*-classes.txt` и `*-composables.txt`, где для каждой функции указано `restartable`, `skippable`, `stable`/`unstable` для каждого параметра. Например:

```text
restartable skippable fun UserRow(
  stable user: UserUi
)
restartable fun Feed(
  unstable items: List<Item>
)
```

`Feed` — restartable, но не skippable из-за `unstable items`. Это прямой сигнал, что стоит проверить, действительно ли `Feed` часто recomposes с одинаковым `items`, прежде чем менять тип параметра.

---

# 7. State hoisting, UDF и ViewModel

State hoisting переносит state к минимальному общему владельцу. Основной контракт stateless component:

```kotlin
@Composable
fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
)
```

State идёт вниз, события — вверх. Parent остаётся единственным источником истины и может принять, преобразовать или отклонить событие.

## 7.1. Где должен жить state?

У владельца с нужным lifetime и ответственностью:

- ripple/animation — внутри компонента;
- раскрытие dropdown — локальный UI state;
- draft поля — `rememberSaveable` или UI state holder;
- query, влияющий на repository — `ViewModel`;
- настройки пользователя — persistent data layer.

«Всё в ViewModel» так же плохо, как «всё в remember».

## 7.2. Stateless и stateful overload

Reusable компонент может иметь:

- stateless core для контроля и тестирования;
- stateful convenience overload для простого случая.

Нужно избегать двух независимых sources of truth. Stateful overload должен делегировать stateless и ясно определять initial/default behavior.

## 7.3. Route и Screen

```kotlin
@Composable
fun ProfileRoute(
    viewModel: ProfileViewModel,
    onBack: () -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    ProfileScreen(
        state = state,
        onRetry = viewModel::retry,
        onBack = onBack,
    )
}

@Composable
fun ProfileScreen(
    state: ProfileUiState,
    onRetry: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // Pure UI
}
```

Route знает о ViewModel, lifecycle и navigation. Screen получает данные и intents, легко preview/test и переиспользуется.

## 7.4. Почему `collectAsStateWithLifecycle`?

В Android это рекомендованный способ преобразовать Flow в Compose `State` с учётом Lifecycle. Collection активна только в заданном состоянии, обычно `STARTED`, поэтому невидимый UI не поддерживает ненужную подписку.

`collectAsState()` подходит platform-independent Compose или источнику, lifetime которого уже ограничен иным способом.

## 7.5. Как экспортировать `StateFlow` из ViewModel?

```kotlin
val uiState: StateFlow<UiState> =
    combine(repository.items, filter) { items, currentFilter ->
        UiState.Content(items.filterBy(currentFilter))
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UiState.Loading,
    )
```

Выбор `SharingStarted` — часть контракта:

- `Eagerly` — upstream нужен сразу;
- `Lazily` — запускается первым subscriber и продолжает жить;
- `WhileSubscribed` — работает только при subscribers, возможно с timeout.

Timeout часто переживает короткое пересоздание collector при configuration change.

## 7.6. Один большой `UiState` или несколько?

Единый state полезен для атомарных переходов и невозможных комбинаций:

```kotlin
sealed interface ContentState {
    data object Loading : ContentState
    data class Data(val items: List<Item>) : ContentState
    data class Error(val message: UiText) : ContentState
}
```

Но god object смешивает независимые состояния и усложняет обновления. Dialog visibility, local animation и screen data не обязаны находиться в одном data class.

Граница определяется общими инвариантами и owner, а не правилом «один экран — один класс».

## 7.7. UDF и MVI

UDF — направление state down/events up. MVI — конкретная архитектурная форма с intents, reducer и effects.

Для простого экрана универсальный `onEvent(UiEvent)` может ухудшить discoverability. Типизированные callbacks `onRetry()`, `onItemClick(id)` дают более ясный API. Reducer оправдан, если атомарные переходы и история действий действительно важны.

## 7.8. UI state и one-off event

Сначала определите гарантию.

- State должен позволять восстановить текущий UI.
- Transient command может быть доставлен только активному consumer.
- Важный бизнес-результат нельзя терять при configuration change.

`SharedFlow(replay = 0)` может потерять navigation/snackbar event без subscriber. Критичное действие лучше представить как pending state с idempotent consumption или durable domain result.

## 7.9. Process death

`ViewModel` переживает configuration change, но не process death. Для восстановления:

- `rememberSaveable` — локальный небольшой UI state;
- `SavedStateHandle` — минимальные screen keys/filter/draft;
- Room/DataStore — durable business data;
- repository заново строит state по ID.

Не сохраняйте полный DTO или большой список в Bundle.

---

# 8. Side effects и lifecycle

Composable body должен описывать UI. Network request, registration listener, analytics и изменение внешнего объекта выполняются через effect API с явным lifetime.

## 8.1. `LaunchedEffect`

Запускает coroutine при входе в Composition. При смене key старая coroutine отменяется и запускается новая; при выходе — отменяется.

```kotlin
LaunchedEffect(userId) {
    controller.load(userId)
}
```

Бизнес-загрузка обычно принадлежит ViewModel, чтобы переживать UI recreation. `LaunchedEffect` лучше подходит для composition-bound задач: focus, scroll, snackbar, animation.

## 8.2. Как выбирать effect key?

Key описывает identity операции. Если операция зависит от `userId`, он должен быть key.

Слишком широкий key вызывает лишние отмены. Слишком узкий оставляет effect со stale dependency. `LaunchedEffect(Unit)` означает «на lifetime этого call site», а не «один раз на приложение».

```kotlin
// Слишком широкий key: отдельный filter не должен перезапускать загрузку профиля
LaunchedEffect(userId, filter) { // filter не влияет на загрузку профиля, лишняя отмена/перезапуск
    profileRepository.load(userId)
}

// Слишком узкий key: при смене userId старый coroutine не отменится
LaunchedEffect(Unit) { // Unit не зависит от userId -> stale данные при смене пользователя
    profileRepository.load(userId)
}

// Правильно: key точно описывает identity операции
LaunchedEffect(userId) {
    profileRepository.load(userId)
}
```

## 8.3. `rememberUpdatedState`

Позволяет long-lived effect видеть свежий callback без restart:

```kotlin
val currentOnTimeout by rememberUpdatedState(onTimeout)

LaunchedEffect(Unit) {
    delay(3_000)
    currentOnTimeout()
}
```

Он обновляет ссылку, но не изменяет identity effect.

## 8.4. `DisposableEffect`

Для регистрации ресурса с обязательным cleanup:

```kotlin
DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event ->
        analytics.onLifecycleEvent(event)
    }

    lifecycleOwner.lifecycle.addObserver(observer)

    onDispose {
        lifecycleOwner.lifecycle.removeObserver(observer)
    }
}
```

Все изменяемые dependencies должны быть key либо доступны через `rememberUpdatedState`.

## 8.5. `SideEffect`

Выполняется после каждой успешно применённой Composition. Подходит для публикации Compose state во внешний объект:

```kotlin
SideEffect {
    analytics.currentUserType = userType
}
```

Не предназначен для дорогого I/O и не имеет cleanup.

## 8.6. `rememberCoroutineScope`

Возвращает scope, отменяемый при выходе call site из Composition. Используется в callbacks:

```kotlin
val scope = rememberCoroutineScope()

Button(onClick = {
    scope.launch {
        snackbarHostState.showSnackbar("Saved")
    }
}) {
    Text("Save")
}
```

Не запускайте coroutine прямо во время composition.

## 8.7. `produceState`

Адаптирует suspend/callback источник к Compose `State`. Внутри использует remembered state и effect lifecycle.

```kotlin
val image by produceState<Result<Image>?>(null, url) {
    value = repository.load(url)
}
```

Для callback API применяют `awaitDispose` для unregister. Если источник уже Flow, обычно проще `collectAsStateWithLifecycle`.

## 8.8. `rememberUpdatedState` — не замена keys

Используйте его только если operation lifetime не должен меняться. Если смена `userId` означает другую подписку, прятать `userId` в `rememberUpdatedState` неверно: старую операцию нужно отменить и создать новую.

```kotlin
// Неверно: userId скрыт в rememberUpdatedState, LaunchedEffect не перезапускается при смене пользователя
val currentUserId by rememberUpdatedState(userId)
LaunchedEffect(Unit) {
    subscribeToUpdates(currentUserId) // подписался на первого userId и больше не переподпишется
}

// Правильно: userId — key, смена вызывает отмену старой подписки и новую подписку
LaunchedEffect(userId) {
    subscribeToUpdates(userId)
}

// rememberUpdatedState уместен, когда операция не должна прерываться, а меняется только callback:
val currentOnComplete by rememberUpdatedState(onComplete)
LaunchedEffect(Unit) { // один timer на lifetime composable, callback может меняться
    delay(5_000)
    currentOnComplete()
}
```

## 8.9. Effect API — краткая таблица выбора

- Coroutine на lifetime composable/key — `LaunchedEffect`.
- Coroutine из event callback — `rememberCoroutineScope`.
- Listener/resource с cleanup — `DisposableEffect`.
- Публикация после успешной composition — `SideEffect`.
- Свежая dependency без restart — `rememberUpdatedState`.
- Внешний async источник → State — `produceState`.
- Snapshot state → Flow — `snapshotFlow`.

---

# 9. Фазы Compose: composition, layout, draw

Compose UI обрабатывает кадр несколькими фазами:

1. Composition — определение структуры и параметров.
2. Layout:
   - measurement;
   - placement.
3. Draw.

Runtime отслеживает state reads отдельно по фазам и может инвалидировать только нужную работу.

## 9.1. Всегда ли выполняются все фазы?

Нет.

- изменение структуры обычно требует composition и далее необходимых фаз;
- изменение размера — layout и draw;
- изменение позиции через placement lambda — placement и draw;
- изменение цвета в draw lambda — draw.

Некоторые layouts, например `LazyColumn`, `BoxWithConstraints`, `SubcomposeLayout`, выполняют subcomposition во время layout.

## 9.2. Deferred state read

```kotlin
Modifier.offset {
    IntOffset(
        x = 0,
        y = scrollOffset.value,
    )
}
```

Lambda-версия читает state в placement phase. Если передать готовый `Dp` через обычный `offset(y = ...)`, state будет прочитан в composition.

Для draw:

```kotlin
Modifier.drawBehind {
    drawRect(animatedColor.value)
}
```

Изменение цвета может вызвать только redraw.

## 9.3. Всегда ли нужно переносить read в позднюю фазу?

Нет. Это корректно, только если изменение действительно не влияет на структуру или размер. Draw translation не меняет layout bounds, соседей, scroll range и иногда hit testing. Если геометрия должна участвовать в layout, нужна layout phase.

## 9.4. Что такое backward write между фазами?

Запись в state после его чтения в той же или более ранней фазе может создать цикл: composition → write → composition либо layout → write → layout.

Частая ошибка — безусловно писать координаты из `onGloballyPositioned` в state, который влияет на тот же layout. Сначала ищут решение через constraints, alignment lines или layout API.

## 9.5. Recomposition и redraw

Recomposition — повторное выполнение Kotlin-кода, а redraw — повторная отрисовка. Они не являются синонимами. Счётчик recomposition без frame trace не показывает источник jank.

---

# 10. Modifier и `Modifier.Node`

`Modifier` — упорядоченная immutable chain элементов, которые участвуют в layout, draw, input, focus, semantics и parent data. Порядок — часть поведения.

## 10.1. Почему порядок modifiers важен?

```kotlin
Modifier
    .padding(16.dp)
    .background(Color.Red)
```

Фон рисуется внутри padding.

```kotlin
Modifier
    .background(Color.Red)
    .padding(16.dp)
```

Фон включает padding area.

То же относится к `clickable`, `clip`, `size`, `offset`, `graphicsLayer` и semantics.

## 10.2. Modifier contract для компонента

Публичный composable обычно:

- принимает `modifier: Modifier = Modifier`;
- применяет его к корневому UI element;
- не заменяет modifier своим;
- не добавляет неожиданную внешнюю padding/size семантику;
- сохраняет порядок caller modifier относительно внутренней реализации.

```kotlin
@Composable
fun UserCard(
    user: UserUi,
    modifier: Modifier = Modifier,
) {
    Card(modifier = modifier) {
        // ...
    }
}
```

## 10.3. Можно ли переиспользовать modifier chain?

Да. Modifier immutable, поэтому длинную неизменную цепочку можно hoist и передавать повторно. Это уменьшает allocation/comparison work, особенно в animation или большом lazy list.

Не следует hoist-ить modifier, зависящий от element-specific state, density или scope-specific parent data.

## 10.4. Что такое `Modifier.Node`?

Современный низкоуровневый API custom modifiers:

- `ModifierNodeElement` описывает конфигурацию;
- `Modifier.Node` хранит долгоживущее состояние;
- node реализует capability-интерфейсы.

Примеры:

- `DrawModifierNode`;
- `LayoutModifierNode`;
- `PointerInputModifierNode`;
- `SemanticsModifierNode`;
- `ParentDataModifierNode`;
- `CompositionLocalConsumerModifierNode`;
- `DelegatingNode`.

## 10.5. Почему `Modifier.Node` предпочтительнее `Modifier.composed`?

Node:

- не добавляет composable-группу для каждого modifier;
- переиспользуется через `update`;
- имеет явный lifecycle `onAttach/onDetach/onReset`;
- может инвалидировать конкретную фазу;
- обычно создаёт меньше аллокаций.

`composed` остаётся legacy/специальным инструментом, но не должен быть default для нового custom modifier.

## 10.6. Упрощённый custom draw node

```kotlin
fun Modifier.fastBorder(
    color: Color,
    width: Dp,
): Modifier = this then BorderElement(color, width)

private data class BorderElement(
    val color: Color,
    val width: Dp,
) : ModifierNodeElement<BorderNode>() {

    override fun create() = BorderNode(color, width)

    override fun update(node: BorderNode) {
        node.color = color
        node.width = width
    }
}

private class BorderNode(
    var color: Color,
    var width: Dp,
) : Modifier.Node(), DrawModifierNode {

    override fun ContentDrawScope.draw() {
        drawContent()
        drawRect(
            color = color,
            style = Stroke(width.toPx()),
        )
    }
}
```

Корректные `equals/hashCode` element помогают определить обновление. Node нельзя переиспользовать одновременно в нескольких chains.

## 10.7. Parent data modifiers

`weight`, `align` и похожие scoped modifiers не измеряют ребёнка сами. Они передают parent-specific metadata layout-родителю. Поэтому `Modifier.weight` доступен только в подходящем scope и бессмысленен вне соответствующего parent.

---

# 11. Layout, constraints и custom layouts

Основное правило измерения:

> Parent передаёт constraints, child выбирает допустимый размер, parent размещает child.

Constraints задают:

```text
minWidth ≤ width ≤ maxWidth
minHeight ≤ height ≤ maxHeight
```

Размер в Compose не запрашивается ребёнком у родителя. Родитель контролирует диапазон, а ребёнок возвращает `Placeable`.

## 11.1. Measurement и placement

Во время measurement:

1. parent получает constraints;
2. измеряет children с выбранными constraints;
3. выбирает собственный размер;
4. возвращает placement block.

Во время placement parent назначает координаты children.

State read в placement block может перезапустить placement без полного measurement.

## 11.2. `size` и `requiredSize`

- `size` пытается установить размер, но уважает входящие constraints.
- `requiredSize` заставляет child измериться указанным размером, даже если он выходит за constraints.

При `requiredSize` parent всё равно может видеть coerced size в допустимых границах, а выходящий content будет размещён по правилам modifier. Это не означает, что parent действительно выделил дополнительное пространство.

## 11.3. Можно ли измерить child дважды?

В обычном layout pass — нет. Compose следует single-pass measurement и защищает контракт runtime-проверкой.

Если layout действительно требует другой стратегии, применяют:

- intrinsic measurements;
- `SubcomposeLayout`;
- специализированный lazy/container API;
- lookahead для планирования будущей геометрии.

Нельзя просто вызвать `measure()` повторно.

## 11.4. Пример custom layout

```kotlin
@Composable
fun SimpleColumn(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Layout(
        modifier = modifier,
        content = content,
    ) { measurables, constraints ->
        val childConstraints = constraints.copy(
            minWidth = 0,
            minHeight = 0,
        )

        val placeables = measurables.map {
            it.measure(childConstraints)
        }

        val width = constraints.constrainWidth(
            placeables.maxOfOrNull { it.width } ?: 0,
        )
        val height = constraints.constrainHeight(
            placeables.sumOf { it.height },
        )

        layout(width, height) {
            var y = 0
            placeables.forEach { placeable ->
                placeable.placeRelative(0, y)
                y += placeable.height
            }
        }
    }
}
```

`placeRelative` учитывает RTL. Arithmetic должен учитывать `Constraints.Infinity`, иначе возможен overflow.

## 11.5. Intrinsic measurements

Intrinsics позволяют запросить предполагаемые размеры до фактического measure:

- `minIntrinsicWidth`;
- `maxIntrinsicWidth`;
- `minIntrinsicHeight`;
- `maxIntrinsicHeight`.

```kotlin
Row(Modifier.height(IntrinsicSize.Min)) {
    Text("Left", Modifier.weight(1f))
    VerticalDivider(Modifier.fillMaxHeight())
    Text("Right", Modifier.weight(1f))
}
```

Intrinsic pass добавляет работу. Для custom layout default intrinsic implementation может быть приблизительной. Subcomposition-based layouts вроде lazy containers обычно не могут заранее знать полный набор children.

**Простое объяснение:** иногда родителю нужно знать размер ребёнка **до** того, как он его реально измерит, чтобы согласовать геометрию нескольких детей друг с другом — например, чтобы разделитель в `Row` был точно равной высоте самого высокого текста, а не растягивался на весь `fillMaxHeight()` экрана. Intrinsic отвечает на вопрос «какой был бы твой размер, если бы тебя измерили с такими и такими constraints?» без реального measure.

**Пример: без intrinsics и с ними**

```kotlin
// Без IntrinsicSize.Min разделитель с fillMaxHeight() растянется на всю высоту Row,
// потому что Row по умолчанию даёт детям maxHeight = Constraints.Infinity/экран
 Row {
    Text("Left", Modifier.weight(1f))
    VerticalDivider(Modifier.fillMaxHeight()) // растянется на весь экран
    Text("Right", Modifier.weight(1f))
}

// С IntrinsicSize.Min Row сначала спрашивает у каждого ребёнка minIntrinsicHeight,
// берёт максимум и только потом выставляет это значение как maxHeight для всех детей
Row(Modifier.height(IntrinsicSize.Min)) {
    Text("Left", Modifier.weight(1f))
    VerticalDivider(Modifier.fillMaxHeight()) // теперь равна высоте текста
    Text("Right", Modifier.weight(1f))
}
```

## 11.6. `BoxWithConstraints`

Предоставляет constraints в composable content и выполняет subcomposition во время layout. Полезен, когда структура UI действительно зависит от доступного места.

Не применяйте его в каждом item только для чтения ширины: subcomposition имеет overhead. Для adaptive screen-level решений чаще подходят window/adaptive APIs.

```kotlin
@Composable
fun AdaptiveCard(modifier: Modifier = Modifier) {
    BoxWithConstraints(modifier) {
        if (maxWidth < 360.dp) {
            CompactCardContent()
        } else {
            WideCardContent()
        }
    }
}
```

## 11.7. `SubcomposeLayout`

Позволяет сначала измерить один content, а затем скомпоновать другой на основе результата. Используется внутри сложных containers, lazy layouts и компонентов с зависимой структурой.

Это мощный, но дорогой и сложный API. Для обычного custom layout достаточно `Layout`.

```kotlin
@Composable
fun MatchParentWidthColumn(
    label: @Composable () -> Unit,
    content: @Composable () -> Unit,
) {
    SubcomposeLayout { constraints ->
        // сначала измеряем label, чтобы узнать его ширину
        val labelPlaceable = subcompose("label", label)
            .first()
            .measure(constraints.copy(minWidth = 0))

        // затем компонуем content с constraints, зависящими от результата первого измерения
        val contentPlaceable = subcompose("content", content)
            .first()
            .measure(constraints.copy(minWidth = labelPlaceable.width))

        layout(contentPlaceable.width, labelPlaceable.height + contentPlaceable.height) {
            labelPlaceable.placeRelative(0, 0)
            contentPlaceable.placeRelative(0, labelPlaceable.height)
        }
    }
}
```

## 11.8. Alignment lines

Child может передать parent логическую линию, например first/last text baseline. Parent использует её для выравнивания элементов с различной внутренней геометрией.

Это надёжнее ручного измерения текста через глобальные координаты.

```kotlin
@Composable
fun BaselineAlignedRow() {
    Row {
        Text(
            text = "12",
            style = MaterialTheme.typography.displayLarge,
            modifier = Modifier.alignByBaseline(), // выравнивает по last baseline текста, а не по центру/краю box
        )
        Text(
            text = "руб.",
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.alignByBaseline(),
        )
    }
}
```

Строки с разным размером шрифта выровняются по линии текста, а не по границам блока.

## 11.9. Lookahead

Lookahead APIs позволяют узнать будущие layout bounds и анимировать переход к ним. Они полезны для shared/structural layout transitions, но требуют понимания обычной и lookahead measurement/placement.

Если достаточно простой draw transform, сложный lookahead layout не нужен.

```kotlin
LookaheadScope {
    Box(
        Modifier.animateBounds(this@LookaheadScope), // плавно анимирует position/size элемента
        // к целевым lookahead bounds при смене структуры (например, shared element переход)
    ) {
        ItemContent()
    }
}
```

Смысл: обычный layout узнаёт новый размер/позицию только после фактического изменения структуры. Lookahead pass выполняется заранее и даёт целевые bounds, чтобы анимация между старым и новым layout была плавной, а не резким скачком.

---

# 12. Lazy collections и специальные state holders

Lazy layouts композируют и размещают только нужные элементы плюс служебное окно prefetch/reuse. Они не являются RecyclerView API, но решают похожую задачу через subcomposition и сохранение item identity.

Основные containers:

- `LazyColumn` / `LazyRow`;
- `LazyVerticalGrid` / `LazyHorizontalGrid`;
- staggered grid;
- `HorizontalPager` / `VerticalPager`;
- custom lazy layout APIs для специальных случаев.

## 12.1. `LazyListState`

```kotlin
val listState = rememberLazyListState()

LazyColumn(state = listState) {
    // ...
}
```

Предоставляет:

- текущий индекс и offset;
- `layoutInfo`;
- `scrollToItem`;
- `animateScrollToItem`;
- состояние прокрутки.

Поля scroll state меняются часто. Не читайте их высоко в composition без необходимости; используйте `derivedStateOf`, `snapshotFlow` или layout/draw lambda.

## 12.2. Зачем `key` в `items`?

```kotlin
LazyColumn {
    items(
        items = users,
        key = { user -> user.id },
    ) { user ->
        UserRow(user)
    }
}
```

Key связывает identity с business entity и помогает:

- сохранить remembered/saveable state;
- корректно обработать reorder;
- переиспользовать composition;
- анимировать перемещение;
- не перенести state на другой item.

Для `rememberSaveable` key должен поддерживаться механизмом saved state.

## 12.3. Для чего `contentType`?

```kotlin
LazyColumn {
    items(
        items = feed,
        key = { it.id },
        contentType = {
            when (it) {
                is FeedItem.Article -> "article"
                is FeedItem.Ad -> "ad"
                is FeedItem.Header -> "header"
            }
        },
    ) { item ->
        FeedRow(item)
    }
}
```

Runtime переиспользует item composition между совместимыми структурами. `contentType` особенно полезен для гетерогенной ленты.

## 12.4. `animateItem`

Item modifier может анимировать появление, исчезновение и placement при изменении набора. Для корректного сопоставления нужны стабильные keys.

Анимация не исправит неверную identity. При key по индексу runtime не понимает, какая бизнес-сущность реально переместилась.

## 12.5. Почему нельзя сортировать внутри `items`?

```kotlin
LazyColumn {
    items(users.sortedBy { it.name }) { /* ... */ }
}
```

Сортировка выполняется при достижении composable и создаёт новый список. Подготовьте данные:

- в ViewModel/Flow;
- через `remember(users)` для небольшого локального случая;
- в domain/data layer, если это часть запроса.

В hot UI path не должно быть тяжёлой фильтрации, сортировки или mapping.

## 12.6. Типичные lazy traps

- key по индексу;
- duplicate или случайный key;
- элементы с нулевой высотой — runtime может скомпоновать слишком много;
- `Column.verticalScroll` для большой коллекции;
- вложенные scrollables одного направления без ограниченного размера;
- ViewModel передаётся каждому item;
- image request зависит от позиции, а не ID;
- placeholder сильно отличается по размеру от content;
- чтение полного `layoutInfo` в широком composition scope;
- отсутствие `contentType` в сложной ленте.

## 12.7. Paging

Paging Compose предоставляет lazy integration с `LazyPagingItems`.

Senior должен учитывать:

- `itemKey` и `itemContentType`;
- load states;
- refresh против append/prepend error;
- placeholder size;
- retry;
- cached data lifetime;
- scroll restoration;
- недопустимость бизнес side effect из item composition.

## 12.8. Pager state

`rememberPagerState` хранит current/settled/target page и scroll progress. Для analytics лучше `snapshotFlow { pagerState.settledPage }`, а не side effect в каждом page composable.

Количество страниц передаётся как lambda, чтобы state видел актуальное значение без ненужного пересоздания.

---

# 13. Drawing, graphics и animations

Compose drawing построен вокруг `DrawScope` и Canvas. Draw phase может обновляться независимо от composition, что важно для частых визуальных изменений.

## 13.1. Draw modifiers

- `drawBehind` — рисует перед content.
- `drawWithContent` — позволяет управлять порядком и вызовом `drawContent()`.
- `drawWithCache` — кеширует `Path`, `Brush` и другие объекты по size/state dependencies.
- `graphicsLayer` — transform, alpha, clipping и compositing на уровне layer.

```kotlin
Modifier.drawWithCache {
    val path = Path().apply {
        moveTo(0f, size.height)
        lineTo(size.width / 2f, 0f)
        lineTo(size.width, size.height)
        close()
    }

    onDrawBehind {
        drawPath(path, Color.Blue)
    }
}
```

Cache сбрасывается при изменении размера или snapshot state, прочитанного в cache block.

## 13.2. Когда `drawWithCache` полезен?

Когда создаются дорогие объекты:

- `Path`;
- `Brush`;
- `Shader`;
- text measurement;
- сложная geometry.

Для простого `drawRect(color)` cache добавит сложность без выгоды.

## 13.3. `graphicsLayer`

```kotlin
Modifier.graphicsLayer {
    translationY = offset
    scaleX = scale
    scaleY = scale
    alpha = alphaValue
}
```

Transform влияет на draw, но layout продолжает считать element находящимся в старых bounds. Siblings и scroll range не меняются.

Layer может потребовать offscreen buffer. Избыточные layers, clipping, blend modes и alpha увеличивают память/compositing work.

## 13.4. Как выбрать animation API?

- одно target value — `animate*AsState`;
- несколько связанных значений — `updateTransition`;
- imperative control, velocity, cancellation — `Animatable`;
- enter/exit — `AnimatedVisibility`;
- смена content — `AnimatedContent`;
- бесконечная — `rememberInfiniteTransition`;
- изменение размера — `animateContentSize`;
- lazy item — `animateItem`.

Выбор определяется ownership и interrupt semantics, а не краткостью API.

```kotlin
// одно target value
val scale by animateFloatAsState(if (pressed) 0.9f else 1f, label = "scale")

// несколько связанных значений, меняющихся вместе постатейной машине
val transition = updateTransition(targetState = isSelected, label = "selection")
val color by transition.animateColor(label = "color") { selected ->
    if (selected) Color.Blue else Color.Gray
}
val elevation by transition.animateDp(label = "elevation") { selected ->
    if (selected) 8.dp else 0.dp
}

// смена content
AnimatedContent(targetState = page, label = "page") { targetPage ->
    PageContent(targetPage)
}
```

## 13.5. `Animatable`

Предоставляет:

- suspend animation;
- взаимное исключение — новая анимация отменяет старую;
- velocity continuity;
- bounds;
- `snapTo`, `animateTo`, `animateDecay`.

Запускается из effect или event coroutine, не из composable body.

```kotlin
val offsetY = remember { Animatable(0f) }
val scope = rememberCoroutineScope()

Modifier.pointerInput(Unit) {
    detectDragGestures(
        onDrag = { change, dragAmount ->
            change.consume()
            scope.launch {
                offsetY.snapTo(offsetY.value + dragAmount.y) // мгновенно следует за пальцем
            }
        },
        onDragEnd = {
            scope.launch {
                offsetY.animateTo(0f) // плавно возвращается на место, отменяя предыдущий запуск анимации
            }
        },
    )
}
```

Новый вызов `animateTo`/`snapTo` автоматически отменяет текущую анимацию этого `Animatable`, сохраняя текущую скорость — это и есть velocity continuity.

## 13.6. Layout animation или draw transform?

Draw transform обычно дешевле, потому что не требует remeasure siblings. Но он неверен, если:

- соседи должны сдвинуться;
- scroll range должен измениться;
- hit bounds должны соответствовать новому размеру;
- accessibility geometry должна измениться.

Performance не должен ломать semantics.

```kotlin
// Дешёво: только draw transform, siblings НЕ сдвигаются, hit area остаётся старой
Box(Modifier.graphicsLayer { scaleX = scale; scaleY = scale })

// Корректно, если soseди должны реагировать на изменение размера: layout-level анимация
Box(
    Modifier
        .animateContentSize() // участвует в measure/layout, соседи сдвигаются корректно
        .size(if (expanded) 200.dp else 80.dp),
)
```

## 13.7. Reduced motion

Анимация должна учитывать системный animation scale и accessibility expectations. Долгая бесконечная анимация вне видимого экрана тратит CPU/GPU и battery.

`alpha = 0f` не удаляет element: он остаётся в composition, layout, input и semantics. Для настоящего исчезновения используйте conditional composition или `AnimatedVisibility`.

```kotlin
val infiniteTransition = rememberInfiniteTransition(label = "pulse")
val alpha by infiniteTransition.animateFloat(
    initialValue = 0.3f,
    targetValue = 1f,
    animationSpec = infiniteRepeatable(tween(1000), RepeatMode.Reverse),
    label = "alpha",
)

// Неверно: анимация продолжается, даже когда элемент вне экрана или accessibility требует reduced motion
Box(Modifier.graphicsLayer { this.alpha = alpha })

// Лучше: учитывать настройки системы и видимость
val durationScale = LocalDensity.current.let { 1f /* читать из Settings.Global.ANIMATOR_DURATION_SCALE */ }
if (isVisibleOnScreen) {
    Box(Modifier.graphicsLayer { this.alpha = alpha })
} // иначе CPU/GPU работают впустую для невидимого элемента
```

---

# 14. Input, gestures, focus и text

Input в Compose проходит через modifier nodes и несколько pointer-event passes. Высокоуровневые компоненты предпочтительнее ручной обработки: они уже реализуют semantics, focus, keyboard и accessibility.

## 14.1. `clickable` или `pointerInput`?

`clickable`, `toggleable`, `selectable`, `draggable` предоставляют готовые:

- gesture recognition;
- interaction source;
- indication;
- semantics;
- keyboard/accessibility behavior.

`pointerInput` нужен для custom gesture.

```kotlin
Modifier.pointerInput(itemId) {
    detectTapGestures(
        onLongPress = onLongPress,
    )
}
```

Keys управляют перезапуском handler coroutine. Для свежего callback без restart может потребоваться `rememberUpdatedState`.

Выбирайте API по пользовательскому намерению:

- `Button`, `IconButton`, `Modifier.clickable` — обычная action;
- `combinedClickable` — tap вместе с long-click/double-click;
- `toggleable`, `triStateToggleable`, `selectable` — выбор или изменение состояния с правильной role/state semantics;
- `draggable`, `anchoredDraggable`, `scrollable` — одноосевое движение с готовой coordination;
- `transformable` — одновременные pan, zoom и rotation;
- `pointerInput` — жест, которого нет среди высокоуровневых modifiers.

`onClick` не следует эмулировать через `pointerInput`: готовый modifier уже поддерживает keyboard, focus, indication, `InteractionSource`, TalkBack и корректную semantics role.

```kotlin
Modifier.combinedClickable(
    onClick = onOpen,
    onLongClick = onShowContextMenu,
)
```

## 14.2. Gesture competition

Несколько handlers могут претендовать на события. Важно понимать consumption, nested scroll и приоритет высокого/низкого уровня.

Не комбинируйте несколько top-level detector calls последовательно в одном `pointerInput` block, если первый никогда не завершается. Используйте отдельные modifiers или низкоуровневый event loop.

Низкоуровневый API нужен, когда detector нельзя выразить готовым API. `awaitEachGesture` даёт lifecycle одного жеста; `awaitFirstDown` ждёт начало, а `awaitPointerEvent` читает последующие события. Событие проходит через `Initial`, `Main` и `Final` passes. Вызов `change.consume()` сообщает другим handlers, что эта часть изменения обработана, но не прекращает физическую доставку event.

```kotlin
Modifier.pointerInput(Unit) {
    awaitEachGesture {
        val down = awaitFirstDown()
        var totalDrag = Offset.Zero

        do {
            val event = awaitPointerEvent()
            val change = event.changes.firstOrNull { it.id == down.id } ?: break
            val delta = change.positionChange()
            if (delta != Offset.Zero) {
                totalDrag += delta
                change.consume()
            }
        } while (change.pressed)

        onCustomGesture(totalDrag)
    }
}
```

Для вложенного scrolling не перехватывайте вручную все pointer events. `nestedScroll` и `NestedScrollConnection` позволяют parent и child согласованно делить pre/post scroll и fling; `LazyColumn` уже участвует в этом протоколе. Custom gesture должен потреблять только ту дельту, за которую он действительно отвечает.

## 14.3. Focus

Основные инструменты:

- `FocusRequester`;
- `focusRequester`;
- `focusable`;
- `focusProperties`;
- `onFocusChanged`;
- `LocalFocusManager`.

`requestFocus()` является side effect и выполняется из event/effect, а не безусловно в composable body.

## 14.4. `Text` и `BasicText`

- `BasicText` — foundation primitive.
- Material `Text` интегрирован с typography/colors/defaults.

Text layout включает font resolving, shaping, bidi, line breaking и glyph layout. Нельзя считать, что один Unicode code unit равен одному символу или glyph.

## 14.5. State-based `TextField`

Современный API использует `TextFieldState`, содержащий:

- text;
- selection;
- IME composition.

`InputTransformation` преобразует ввод до сохранения, `OutputTransformation` меняет только отображение. Это надёжнее асинхронного фильтрования старого value-based callback, которое может конфликтовать с IME.

```kotlin
val textFieldState = rememberTextFieldState()

TextField(
    state = textFieldState,
    inputTransformation = InputTransformation.maxLength(32),
)
```

Проверяйте доступность конкретных transformations в версии Compose Foundation.

## 14.6. Text performance и correctness

- не задавайте жёсткую высоту без проверки большого font scale;
- учитывайте RTL, locale и fallback fonts;
- кешируйте сложный `AnnotatedString`, если его построение дорого;
- для custom draw используйте `rememberTextMeasurer`;
- не записывайте state безусловно из `onTextLayout`;
- не режьте строки по индексам без понимания grapheme clusters.

## 14.7. Insets и IME

Compose предоставляет WindowInsets API и modifiers:

- status/navigation bars padding;
- `imePadding`;
- consume/exclude insets;
- safe drawing/content/gestures.

Edge-to-edge screen должен определить, кто consume-ит каждый inset. Слепое добавление нескольких padding modifiers приводит к двойным отступам.

---

# 15. CompositionLocal, theming и design system

`CompositionLocal` передаёт tree-scoped значение без явного параметра через каждый уровень. Это ambient context, а не универсальный dependency injection container.

## 15.1. `compositionLocalOf` и `staticCompositionLocalOf`

- `compositionLocalOf` отслеживает конкретные readers; изменение инвалидирует их.
- `staticCompositionLocalOf` не отслеживает чтения; изменение provider invalidates весь subtree.

Static вариант подходит для практически неизменяемого значения, например набора design tokens.

```kotlin
val LocalContentSpacing = staticCompositionLocalOf { 16.dp }

@Composable
fun AppContent(compact: Boolean, content: @Composable () -> Unit) {
    CompositionLocalProvider(
        LocalContentSpacing provides if (compact) 12.dp else 24.dp,
    ) {
        content()
    }
}

@Composable
fun CardBody() {
    Column(Modifier.padding(LocalContentSpacing.current)) {
        // ...
    }
}
```

`current` можно читать только из composable context либо из `CompositionLocalConsumerModifierNode`. Provider действует только на своё subtree; значение не является глобальной mutable переменной.

## 15.2. Когда CompositionLocal оправдан?

Для cross-cutting tree-scoped данных:

- theme/colors/typography;
- density/layout direction;
- content alpha;
- локальная policy компонента;
- analytics context, если контракт действительно tree-scoped.

Repository, use case и ViewModel лучше передавать через явный owner/DI. Иначе зависимости становятся скрытыми и тесты труднее.

## 15.3. Design tokens

Используйте semantic tokens:

- `surfaceCritical`, а не `red500`;
- `textSecondary`, а не `gray600`;
- semantic spacing/shape/typography;
- light/dark/high-contrast mapping.

Это позволяет менять visual implementation без изменения component API.

## 15.4. Material wrappers

Собственные `AppButton`, `AppCard`, `AppTextField` помогают:

- централизовать tokens;
- поддерживать accessibility;
- ограничить варианты;
- обновлять design system.

Не делайте wrapper с десятками boolean flags. Лучше sealed/enum variant и slot APIs.

## 15.5. Dynamic color

Dynamic color является источником схемы, но design system должен:

- иметь fallback;
- проверять contrast;
- поддерживать brand-critical colors;
- учитывать светлую/тёмную тему;
- не кодировать смысл только цветом.

---

# 16. Navigation, adaptive UI и screen architecture

Compose Navigation управляет back stack и destination lifecycle. UI-компоненты не должны знать `NavController`, если им достаточно выразить intent callback.

## 16.1. Что передавать между destinations?

Передавайте минимальные устойчивые identifiers:

- `userId`;
- `orderId`;
- filter enum;
- небольшие primitive route arguments.

Не передавайте целый DTO:

- он устаревает;
- Bundle ограничен;
- deep link не имеет объекта;
- process recreation требует восстановления;
- destination должен загрузить актуальные данные.

## 16.2. Type-safe routes

Современные Navigation Compose APIs поддерживают типизированные route-модели. Это уменьшает строковые ошибки и централизует сериализацию аргументов.

Типобезопасность route не отменяет:

- валидацию внешнего deep link;
- проверку авторизации;
- обработку отсутствующего ID;
- идемпотентность действий.

## 16.3. ViewModel scope

- destination scope — один экран;
- nested graph scope — flow из нескольких экранов;
- activity scope — действительно общая координация.

Слишком широкий scope удерживает state и зависимости дольше нужного. После удаления back stack entry owner должен очищаться.

## 16.4. Почему не передавать `NavController` глубоко?

```kotlin
ProductScreen(
    onProductClick = { id ->
        navController.navigate(ProductRoute(id))
    },
)
```

Screen выражает пользовательское намерение, route решает механизм навигации. Это упрощает previews, UI tests и переиспользование.

## 16.5. Predictive back

Back — progress-aware gesture, а не только callback. Custom screen transitions должны:

- корректно реагировать на progress/cancel/commit;
- не ломать системную навигацию;
- сохранять state;
- учитывать nested navigation.

Конкретные APIs зависят от используемой версии navigation/adaptive библиотек.

## 16.6. Responsive и adaptive

Responsive UI меняет размеры и arrangement. Adaptive UI может менять способ взаимодействия:

- bottom navigation → rail/drawer;
- one pane → list-detail;
- modal → supporting pane.

Решение принимается по текущему window size/posture, а не по ярлыку «tablet». Планшет может находиться в compact split-screen.

## 16.7. Material 3 Adaptive

Полезные направления API:

- current window adaptive info;
- navigation suite scaffold;
- list-detail pane scaffold;
- supporting pane scaffold;
- posture/hinge-aware layout.

Нужно тестировать runtime resize, fold/unfold, multi-window, keyboard/mouse и большие font scales.

## 16.8. Как не потерять state при смене layout?

Если stateful child переезжает между условными ветками, его positional identity может измениться.

Решения:

- hoist state выше adaptive structure;
- держать state holder в стабильном месте;
- применять scaffold, сохраняющий pane identity;
- использовать stable keys;
- `movableContentOf` только для специального переноса самой Composition.

---

# 17. Accessibility и semantics

Semantics tree — логическое представление UI для accessibility, testing, autofill и других сервисов. Оно не обязано совпадать с layout tree.

## 17.1. Merged и unmerged semantics

Несколько визуальных children могут образовывать одну логическую control:

```kotlin
Modifier.semantics(mergeDescendants = true) {}
```

`Button`, `clickable`, `ListItem` и другие компоненты часто уже merge descendants. Вложенная интерактивная control обычно остаётся отдельной.

Compose tests по умолчанию часто работают с merged tree; при диагностике нужен unmerged tree.

## 17.2. Важные semantics properties

- `contentDescription`;
- `stateDescription`;
- `role`;
- `selected`, `disabled`;
- `heading`;
- `liveRegion`;
- `progressBarRangeInfo`;
- collection/item info;
- traversal group/index;
- custom actions.

Не дублируйте видимый текст через `contentDescription`: screen reader может озвучить его дважды.

## 17.3. Высокоуровневый modifier важнее ручной semantics

`toggleable` даёт input, keyboard, role и state semantics. Ручной `semantics { onClick }` не создаёт полноценное pointer/keyboard behavior.

```kotlin
Row(
    Modifier
        .toggleable(
            value = checked,
            role = Role.Switch,
            onValueChange = onCheckedChange,
        )
        .padding(16.dp),
) {
    Text("Notifications")
}
```

## 17.4. `clearAndSetSemantics` и скрытие

- hiding API убирает декоративный/redundant node из accessibility;
- `clearAndSetSemantics {}` очищает semantics узла и descendants для потребителей;
- `clearAndSetSemantics { ... }` заменяет их новым контрактом.

Агрессивная очистка может сломать tests, autofill и будущие accessibility services.

## 17.5. Что проверять вручную?

- TalkBack и Switch Access;
- keyboard/D-pad;
- touch target;
- font scale;
- RTL;
- contrast/high contrast;
- state, выраженный не только цветом;
- traversal order;
- custom gesture alternative.

---

# 18. View interoperability

Миграция редко происходит одним шагом. Compose поддерживает View внутри Composition и `ComposeView` внутри legacy hierarchy.

## 18.1. `AndroidView`

```kotlin
AndroidView(
    factory = { context ->
        LegacyChartView(context)
    },
    update = { view ->
        view.setData(data)
        view.isEnabled = enabled
    },
    onRelease = { view ->
        view.releaseResources()
    },
)
```

- `factory` создаёт View;
- `update` синхронизирует её с Compose state;
- `onRelease` освобождает ресурсы.

Не создавайте View через `remember` вне `factory`.

## 18.2. View reuse в lazy container

Для переиспользования нужен overload с `onReset`. Reset должен очистить item-specific state/listeners перед binding новой сущности. `onRelease` освобождает окончательные ресурсы.

Особенно важно для WebView, player, map и сложных custom Views.

## 18.3. `ComposeView` во Fragment

```kotlin
composeView.apply {
    setViewCompositionStrategy(
        ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed,
    )
    setContent {
        AppTheme {
            Screen()
        }
    }
}
```

Composition должна быть связана с lifecycle View Fragment, а не самого Fragment. Иначе уничтоженная View hierarchy может удерживаться.

## 18.4. Interop traps

- два независимых owner одного state;
- listener хранит stale callback;
- View пересоздаётся при recomposition;
- отсутствует cleanup adapter/WebView/player;
- неверная composition disposal strategy;
- несовместимые nested scroll/focus/insets;
- дублирующиеся semantics;
- View передаётся дольше Activity lifecycle.

---

# 19. Testing, previews и testability

Compose test взаимодействует не с composable-функциями, а с semantics nodes. Поэтому accessibility-friendly API обычно одновременно лучше тестируется.

## 19.1. Test pyramid

1. Unit:
   - reducer;
   - state holder/ViewModel;
   - Flow/coroutines.
2. Component Compose tests:
   - state → UI;
   - action → callback;
   - semantics.
3. Integration:
   - navigation;
   - fake repository;
   - restoration/deep links.
4. Screenshot:
   - themes/locales/window sizes/font scales.
5. Macrobenchmark:
   - startup;
   - scroll;
   - frame timing.

## 19.2. Поиск nodes

Предпочтительный порядок:

- видимый text;
- role/content description;
- semantic property;
- `testTag`, когда устойчивого пользовательского признака нет.

Тест, привязанный к внутренней hierarchy, ломается при harmless refactoring.

## 19.3. Synchronization

Compose test rule ждёт idleness runtime, но не знает о любой внешней фоновой системе. Для coroutines/Flow используют контролируемый dispatcher и fake data source.

`mainClock` позволяет управлять animation/delay, но нужно понимать, какая работа привязана к frame clock, а какая — к coroutine scheduler.

## 19.4. State restoration testing

`StateRestorationTester` проверяет `rememberSaveable`:

1. content создаётся;
2. state изменяется;
3. эмулируется save/restore;
4. проверяется восстановленное UI.

Критический process-death flow дополнительно тестируют на уровне Activity/navigation/data restoration.

## 19.5. Previews

Preview — development tool, не тест. Полезная матрица:

- loading/content/empty/error;
- light/dark;
- compact/expanded;
- длинные строки;
- RTL;
- большой font scale;
- различные данные через `PreviewParameterProvider`.

Previewable `Screen` не должен требовать настоящий ViewModel, network или production DI.

## 19.6. Screenshot tests

Хороши для visual regression design system, но чувствительны к:

- fonts;
- rendering backend;
- OS/device;
- animation;
- locale.

Они дополняют semantics/behavior tests, а не заменяют их.

---

# 20. Производительность и диагностика

Главная ошибка — оптимизировать количество recompositions вместо пользовательского результата. Кадр может тормозить из-за layout, draw, image decoding, GC, shader compilation, I/O или слишком большой main-thread работы.

## 20.1. Правильный план расследования

1. Воспроизвести в release/profileable build.
2. Зафиксировать конкретный сценарий и metric.
3. Измерить Macrobenchmark/frame timing.
4. Изучить Perfetto/system trace.
5. Определить фазу и thread bottleneck.
6. Проверить recomposition/skip counts, если подозрение на composition.
7. Проверить compiler stability reports.
8. Сформулировать одну гипотезу.
9. Внести локальное изменение.
10. Повторить измерение.

## 20.2. Почему debug build вводит в заблуждение?

Debug:

- содержит tooling/check overhead;
- иначе оптимизирован;
- может не использовать R8;
- имеет другую compilation/JIT картину;
- не отражает Baseline Profiles.

Layout Inspector полезен для причины recomposition, но не заменяет release benchmark.

## 20.3. Частые источники лишней работы

- state read слишком высоко;
- тяжёлая фильтрация/сортировка в composition;
- новые unstable collections;
- неверные lazy keys/content types;
- аллокации в draw/animation loop;
- intrinsics/subcomposition без необходимости;
- избыточные graphics layers;
- image decoding на main;
- layout feedback loop;
- бесконечная animation вне экрана.

## 20.4. Deferred reads

Для часто меняющихся значений:

- `offset {}` вместо готового offset;
- `graphicsLayer {}` для draw transforms;
- `drawBehind/drawWithContent` для visual state;
- `derivedStateOf` для threshold;
- `snapshotFlow` для async observation.

Переносите read только в фазу, соответствующую реальной семантике.

## 20.5. Baseline Profiles

Baseline Profile помогает ART заранее компилировать критические paths:

- startup;
- navigation;
- scroll;
- common UI interactions.

Он уменьшает warmup/JIT cost, но не исправляет плохой алгоритм, blocking I/O или огромный layout.

## 20.6. Recomposition counters

Количество вызовов не равно стоимости. Десять дешёвых recompositions могут быть незаметны, одна сортировка большого списка — сорвать кадр.

Смотрите:

- duration;
- skipped groups;
- layout/draw;
- allocations/GC;
- frame deadline;
- CPU/GPU trace.

## 20.7. Что делать с stability problem?

При доказанной проблеме:

- включить/использовать strong skipping;
- перестать создавать новый unstable object;
- перейти на immutable/persistent model;
- стабилизировать API;
- применить честную stability annotation/config;
- разделить composable boundaries.

Нельзя ложно поставить `@Stable`: stale UI хуже лишней recomposition.

---

# 21. Проектирование Compose API

Хороший Compose API выражает ownership и intent, минимизирует невозможные комбинации и остаётся тестируемым.

## 21.1. Рекомендуемый порядок параметров

Типично:

1. обязательные данные;
2. обязательные callbacks;
3. `modifier: Modifier = Modifier`;
4. optional параметры;
5. trailing content slot.

Конкретные conventions команды важнее механического правила, но modifier должен быть легко заметен и применяться к root.

## 21.2. Slot APIs

```kotlin
@Composable
fun AppCard(
    title: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    leading: (@Composable () -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    // ...
}
```

Slots позволяют caller управлять content без передачи десятков styling flags. Scope receiver можно использовать для parent data и ограниченного DSL.

## 21.3. Не передавать ViewModel в reusable component

Передавайте минимальные данные и callbacks. Иначе:

- dependency скрыта;
- preview требует DI;
- компонент нельзя применить с другим owner;
- child получает слишком широкие права;
- testing усложняется.

ViewModel получают на route/screen boundary.

## 21.4. Boolean explosion

```kotlin
AppButton(
    primary = true,
    destructive = true,
    compact = false,
    loading = true,
)
```

Создаёт противоречивые комбинации. Используйте:

- `ButtonVariant`;
- `ButtonSize`;
- явный `loading`;
- slots для icon/content.

## 21.5. Events как intent

Callback должен описывать намерение:

- `onRetry`;
- `onItemClick(id)`;
- `onQueryChange`.

Не передавайте callback `onNavigate(navController)` или `onMutableStateChanged`, раскрывающий детали реализации.

## 21.6. Когда custom state holder оправдан?

Custom state holder — это обычный Kotlin-класс (не `ViewModel`), который инкапсулирует несколько связанных `mutableStateOf` полей и операции над ними, и создаётся через `remember { ... }`. Это способ вынести «маленькую бизнес-логику компонента» из тела composable в тестируемый объект, оставаясь при этом внутри UI layer.

**Когда действительно оправдан:**

- несколько взаимосвязанных `MutableState`, которые должны изменяться атомарно (например, `query` + `suggestions` + `isSearching` в поиске должны быть согласованы между собой);
- есть suspend-команды с cancellation (debounce ввода, `Animatable`-переходы), которыми удобно управлять через методы, а не разбросанные `LaunchedEffect`;
- сложная UI-transition state machine (multi-step wizard, drag-to-dismiss с несколькими фазами);
- нужен отдельный unit-testable контракт без Compose runtime — тест создаёт `SearchBarState` напрямую и вызывает методы, не поднимая Composition.

**Когда НЕ оправдан (частая ошибка — overengineering):**

- один простой `var expanded by remember { mutableStateOf(false) }` — обёртывание в класс ради класса добавляет косвенность без пользы;
- state, который и так должен жить в `ViewModel`, потому что переживает recomposition экрана и связан с бизнес-данными — тогда holder дублирует ответственность `ViewModel`;
- если компонент используется один раз и не переиспользуется — тестируемость через отдельный класс не окупает сложность.

**Практическое правило:** если для описания состояния компонента нужно больше одного `remember { mutableStateOf(...) }`, и эти значения должны меняться согласованно — это сигнал для state holder. Если достаточно одного примитива — holder не нужен.

```kotlin
@Stable
class SearchBarState internal constructor(
    initialQuery: String,
) {
    var query by mutableStateOf(initialQuery)
        private set

    var suggestions by mutableStateOf<List<String>>(emptyList())
        private set

    fun updateQuery(value: String) {
        query = value              // атомарное обновление обоих полей в одном методе,
        suggestions = emptyList()  // а не в разных местах composable body
    }

    fun applySuggestions(result: List<String>) {
        suggestions = result
    }
}

@Composable
fun rememberSearchBarState(
    initialQuery: String = "",
): SearchBarState = remember {
    SearchBarState(initialQuery)
}
```

`@Stable` здесь честен, потому что все публичные свойства — snapshot state (`mutableStateOf`), и их изменение уведомляет Compose. Если бы `suggestions` был обычным `var` без `mutableStateOf`, `@Stable` был бы ложным обещанием (см. 22.11).

Нужно продумать keys для `remember` (если state должен сбрасываться при смене identity), `Saver` (если нужно пережить configuration change) и честность `@Stable`.

---

# 22. Частые вопросы и задачи с кодом

## 22.1. Почему UI не обновился?

```kotlin
data class UiState(
    val items: MutableList<Item>,
)

var state by mutableStateOf(UiState(mutableListOf()))
state.items += newItem
```

Изменилась внутренняя обычная коллекция, setter state не вызван. Compose не получил snapshot write.

Решение начинается не с `copy`, а со **смены типа поля**: `MutableList` в модели состояния — сама ошибка. Пока поле объявлено как `MutableList<Item>`, вариант с `copy` даже не скомпилируется, потому что `MutableList + Item` возвращает `List`:

```kotlin
data class UiState(
    val items: List<Item>,          // было MutableList<Item>
)

state = state.copy(items = state.items + newItem)
```

или локальная `SnapshotStateList` (`mutableStateListOf()`) с понятным owner — тогда мутация сама является snapshot write и `copy` не нужен. Выбор между двумя вариантами и есть содержательная часть ответа: immutable-модель проще для skipping и diff'а, `SnapshotStateList` дешевле при частых точечных вставках в длинный список.

## 22.2. Почему `LaunchedEffect` бесконечно рестартует?

```kotlin
LaunchedEffect(RequestParams(query)) {
    repository.search(query)
}
```

Если key object создаётся заново и не имеет подходящего equality, effect получает новую identity при каждой recomposition. Используйте стабильные primitive/data keys, реально определяющие операцию:

```kotlin
LaunchedEffect(query) {
    repository.search(query)
}
```

Бизнес search обычно лучше реализовать в ViewModel через Flow/debounce/flatMapLatest.

## 22.3. Почему item state переехал к другому элементу?

```kotlin
LazyColumn {
    items(users) { user ->
        var expanded by remember { mutableStateOf(false) }
        UserRow(user, expanded)
    }
}
```

После reorder positional identity может сопоставиться с другой сущностью. Нужен:

```kotlin
items(
    items = users,
    key = { it.id },
) { user ->
    // ...
}
```

Если expanded — business state, его лучше hoist по ID.

## 22.4. Что не так с `derivedStateOf`?

```kotlin
val fullName by remember {
    derivedStateOf { "$firstName $lastName" }
}
```

Здесь не «избыточность», а бага корректности, и это важно проговорить именно так. Если `firstName`/`lastName` — обычные параметры, а не snapshot state, то `remember` без ключей вычислит блок один раз, а `derivedStateOf` не сможет отследить чтение не-snapshot значений. В результате `fullName` навсегда останется первой версией: классический stale UI, который не воспроизводится в превью и вылезает на втором экране.

Правильно так:

```kotlin
val fullName = "$firstName $lastName"                       // параметры: просто выражение
val fullName by remember(firstName, lastName) { ... }        // если нужно кэшировать дорогое вычисление
```

`derivedStateOf` уместен только тогда, когда входы — snapshot state и производное значение меняется **реже** входов (канонический пример — `listState.firstVisibleItemIndex > 0`): он гасит лишние инвалидации. Если результат меняется синхронно с входами, выигрыша нет, а лишняя косвенность есть.

## 22.5. Почему `remember` хранит старый объект?

```kotlin
val presenter = remember {
    Presenter(repository, userId)
}
```

При смене `repository` или `userId` calculation не повторяется. Нужны keys:

```kotlin
val presenter = remember(repository, userId) {
    Presenter(repository, userId)
}
```

Либо owner presenter находится вне Composition.

## 22.6. Почему analytics отправляется много раз?

```kotlin
@Composable
fun Screen(state: State) {
    analytics.screenShown()
    Content(state)
}
```

Side effect находится в composable body и выполняется при каждой recomposition. Используйте effect с корректной identity или перенесите screen analytics в navigation/lifecycle layer.

## 22.7. Почему `alpha = 0f` не скрывает control для TalkBack?

```kotlin
// Неверно: node остаётся в semantics/input, TalkBack всё равно может его озвучить/сфокусировать
Box(Modifier.graphicsLayer { alpha = if (visible) 1f else 0f }) {
    Button(onClick = onClick) { Text("Save") }
}
```

Alpha меняет drawing, но node остаётся в semantics и input. Для удаления используйте условную Composition/`AnimatedVisibility`, либо отдельно задайте корректную semantics policy, если невидимый node действительно должен оставаться.

```kotlin
// Правильно: компонент полностью исчезает из composition/semantics/input, когда не виден
AnimatedVisibility(visible = visible) {
    Button(onClick = onClick) { Text("Save") }
}

// Альтернатива, если нужно сохранить место в layout, но убрать из accessibility/input:
Box(
    Modifier
        .graphicsLayer { alpha = if (visible) 1f else 0f }
        .then(if (visible) Modifier else Modifier.clearAndSetSemantics {})
        .let { if (visible) it else it } // собственно clickable должен 42быть отключён при !visible
) {
    Button(onClick = onClick, enabled = visible) { Text("Save") }
}
```

## 22.8. Почему `graphicsLayer` наложил element на соседа?

```kotlin
// Неверно, если ожидается, что соседи раздвинутся при увеличении карточки
Row {
    Box(Modifier.graphicsLayer { scaleX = scale; scaleY = scale }) { Card() } // только visual scale
    Text("Next item") // layout bounds Card не изменились, поэтому при большом scale карточка налезает на текст
}
```

Scale/translation не меняют layout bounds. Parent разместил siblings по старой геометрии. Если они должны раздвигаться, анимируйте layout size/placement:

```kotlin
// Правильно: animateContentSize участвует в layout, соседи корректно сдвигаются
Row {
    Box(
        Modifier
            .animateContentSize()
            .size(if (expanded) 120.dp else 80.dp),
    ) { Card() }
    Text("Next item")
}
```

## 22.9. Что не так с этим Flow collection?

```kotlin
val state by viewModel.state.collectAsState()
```

В Android screen collection не учитывает Lifecycle и может поддерживать upstream в фоне. Обычно нужен:

```kotlin
val state by viewModel.state.collectAsStateWithLifecycle()
```

Для multiplatform UI `collectAsState` может быть правильным.

## 22.10. Почему `rememberCoroutineScope` не подходит ViewModel?

```kotlin
// Неверно: бизнес-операция запущена из UI-связанного scope
@Composable
fun CheckoutButton(onOrderPlaced: () -> Unit) {
    val scope = rememberCoroutineScope()
    Button(onClick = {
        scope.launch {
            repository.placeOrder() // отменится, если экран пересоздаётся (rotation) до завершения
            onOrderPlaced()
        }
    }) { Text("Place order") }
}
```

Его lifetime связан с call site в Composition. При уходе UI scope отменяется. Business operation, которая должна пережить configuration change, принадлежит `viewModelScope`/repository:

```kotlin
// Правильно: операция живёт в ViewModel и переживает configuration change
class CheckoutViewModel(private val repository: OrderRepository) : ViewModel() {
    fun placeOrder() {
        viewModelScope.launch {
            repository.placeOrder()
        }
    }
}

@Composable
fun CheckoutButton(viewModel: CheckoutViewModel) {
    Button(onClick = viewModel::placeOrder) { Text("Place order") }
}
```

`rememberCoroutineScope` остаётся правильным выбором для UI-mechanics (snackbar, scroll, короткая анимация), но не для бизнес-операций.

## 22.11. Что не так с ложным `@Immutable`?

```kotlin
@Immutable
data class FeedState(
    val items: MutableList<Item>,
)
```

Аннотация обещает неизменность, которую тип нарушает. Compiler может принять skipping decision и не показать внутреннюю мутацию. Аннотации stability — unsafe contract при неправильном применении.

```kotlin
// Правильно: поле действительно неизменно, аннотация честна
data class FeedState(
    val items: List<Item>, // read-only List, обновление — только через copy(items = newList)
)
// @Immutable здесь даже не обязателен: data class с val Listами стабильных типов compiler
// всё равно считает unstable из-за List (см. 6.3), поэтому при необходимости добавляют явно:
@Immutable
data class FeedStateExplicit(
    val items: ImmutableList<Item>, // kotlinx.collections.immutable — честный контракт для compiler
)
```

## 22.12. Как реализовать scroll analytics?

Не отправлять событие из item composition и не читать offset высоко:

```kotlin
LaunchedEffect(listState) {
    snapshotFlow {
        listState.firstVisibleItemIndex
    }
        .map { index -> index > 0 }
        .distinctUntilChanged()
        .filter { it }
        .collect {
            analytics.onListScrolled()
        }
}
```

Block `snapshotFlow` чистый, side effect находится в collector.

## 22.13. Как диагностировать jank списка?

Senior-ответ:

1. воспроизвести release/profileable;
2. Macrobenchmark scroll scenario;
3. Perfetto frame trace;
4. определить CPU/GPU/composition/layout/draw/image bottleneck;
5. проверить keys/content types/item size;
6. проверить allocations и image decoding;
7. проверить state read/stability;
8. изменить одну причину;
9. повторить benchmark.

Ответ «добавлю remember» недостаточен.

## 22.14. Почему `rememberCoroutineScope` внутри `LaunchedEffect` ломает lifetime?

```kotlin
val scope = rememberCoroutineScope()

LaunchedEffect(userId) {
    scope.launch { repository.load(userId) } // неверно
}
```

`LaunchedEffect` уже выполняет suspend-код в coroutine, привязанной к его key. Вложенный `scope.launch`
не становится её child: он принадлежит scope call site и переживёт смену `userId`, хотя effect для старого
пользователя уже отменён. Это создаёт stale work и может записать на экран устаревший результат.

```kotlin
LaunchedEffect(userId) {
    repository.load(userId) // отменяется и перезапускается вместе с effect
}
```

`rememberCoroutineScope` нужен для coroutine, начатой из event callback (`onClick`, drag, snackbar), когда
нельзя вызвать suspend-функцию непосредственно. Не используйте его как универсальный способ запустить
работу из composable.

---

# 23. Senior-level вопросы на рассуждение

## 23.1. Recomposition — это плохо?

Нет. Это штатный механизм поддержания UI. Плохо:

- выполнять дорогую работу внутри;
- читать часто меняющийся state слишком высоко;
- создавать feedback loop;
- ломать identity;
- вызывать ненужные layout/draw;
- пропускать frame deadline.

Оптимизируют измеренный пользовательский bottleneck, а не сам факт повторного вызова.

## 23.2. Где граница Compose и ViewModel?

Compose владеет ephemeral UI mechanics и composition-bound resources. ViewModel владеет screen state и бизнес-операциями, которые должны переживать configuration change. Data layer владеет durable source of truth.

Граница определяется lifetime и ответственностью, а не тем, можно ли технически вызвать API.

## 23.3. State или event?

Если пользователь должен увидеть результат после recreation, это state. Если значение имеет смысл только активному consumer и допустима потеря, это event. Если потеря недопустима, нужен acknowledgement/durable representation.

Название `SharedFlow` не решает семантику доставки.

## 23.4. Как оценить Compose abstraction?

Хорошая abstraction:

- сохраняет modifier contract;
- имеет ясный state owner;
- выражает intent callbacks;
- поддерживает semantics;
- допускает slots;
- не скрывает дорогой side effect;
- не требует ViewModel внутри reusable UI;
- измеримо не ухудшает performance.

## 23.5. Когда писать custom layout/modifier?

Когда стандартные primitives не выражают необходимое поведение, а задача естественно относится к layout/draw/input node.

Не следует писать custom low-level API только ради «меньшего числа composables». Высокоуровневые primitives обычно лучше протестированы, доступны и оптимизированы.

## 23.6. Какой ответ ожидают про «Compose под капотом»?

Достаточная цепочка:

```text
Compose Compiler transforms @Composable
→ Composer records groups/slots
→ snapshot reads bind State to scopes/phases
→ writes create invalidations
→ Recomposer schedules work
→ affected scopes execute
→ unchanged groups may be skipped
→ Applier updates UI nodes
→ layout and draw run only as needed
```

Senior должен дополнить её identity/keys, stability и phase-specific reads.

---

# 24. Чек-лист перед интервью

## Обязательно знать

- declarative model, Composition и recomposition;
- compiler transformation, Composer/Recomposer/SlotTable;
- restartable, skippable, strong skipping;
- positional identity, `key`, lazy keys;
- snapshot system и mutation policies;
- `remember`, `rememberSaveable`, Saver;
- `derivedStateOf`, `snapshotFlow`;
- state lists/maps/primitive state;
- state hoisting, UDF, Route/Screen;
- lifecycle-aware Flow collection;
- effect APIs и key semantics;
- composition/layout/draw phases;
- constraints и custom layout;
- modifier order и `Modifier.Node`;
- lazy `contentType`, Paging, pager;
- drawing, graphics layers и animation choice;
- text/input/focus/gestures;
- CompositionLocal и design system;
- navigation/adaptive UI;
- semantics/accessibility;
- View interop;
- testing и performance diagnostics.

## Нужно уметь объяснить на примере

1. Почему mutable list внутри state не обновляет UI.
2. Как state read определяет invalidation scope.
3. Почему key — correctness, а не только performance.
4. Когда effect restart нужен, а когда `rememberUpdatedState`.
5. Чем `remember` отличается от `rememberSaveable` и ViewModel.
6. Почему strong skipping не делает модель immutable.
7. Как перенести read из composition в layout/draw.
8. Почему modifier order меняет hit area и drawing.
9. Как устроить reusable stateless component.
10. Как восстановить screen после process death.
11. Как расследовать lazy-list jank.
12. Как протестировать state restoration и semantics.

## Формула хорошего Senior-ответа

Для любой Compose-конструкции раскройте:

1. какую проблему она решает;
2. кто владеет её state/resource;
3. какой lifetime;
4. что является key/identity;
5. какая фаза инвалидируется;
6. что происходит при cancellation/recreation;
7. какие есть performance и correctness traps;
8. как проверить поведение тестом или trace.

---

# 25. Официальные материалы

- [Thinking in Compose](https://developer.android.com/develop/ui/compose/mental-model)
- [Lifecycle of composables](https://developer.android.com/develop/ui/compose/lifecycle)
- [State and Jetpack Compose](https://developer.android.com/develop/ui/compose/state)
- [State hoisting](https://developer.android.com/develop/ui/compose/state-hoisting)
- [Side effects](https://developer.android.com/develop/ui/compose/side-effects)
- [Compose phases](https://developer.android.com/develop/ui/compose/phases)
- [Stability](https://developer.android.com/develop/ui/compose/performance/stability)
- [Strong skipping](https://developer.android.com/develop/ui/compose/performance/stability/strongskipping)
- [Performance best practices](https://developer.android.com/develop/ui/compose/performance/bestpractices)
- [Custom layouts](https://developer.android.com/develop/ui/compose/layouts/custom)
- [Custom modifiers](https://developer.android.com/develop/ui/compose/custom-modifiers)
- [Lazy layouts](https://developer.android.com/develop/ui/compose/lists)
- [Accessibility and semantics](https://developer.android.com/develop/ui/compose/accessibility)
- [Navigation Compose](https://developer.android.com/develop/ui/compose/navigation)
- [Compose testing](https://developer.android.com/develop/ui/compose/testing)
- [View interoperability](https://developer.android.com/develop/ui/compose/migrate/interoperability-apis)
- [Compose Runtime design: How Composition Works](https://android.googlesource.com/platform/frameworks/support/+/HEAD/compose/runtime/design/how-compose-works.md)
- [Compose Runtime release notes](https://developer.android.com/jetpack/androidx/releases/compose-runtime)

