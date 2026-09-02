# 20 задач для собеседования: Kotlin как язык, коллекции и hash-коллизии

Задачи по структуре продолжают `19-coroutines-interview-tasks.md`: от middle-разминки до senior-уровня, с акцентом на специфику языка - `data class`, `sealed class`, extension-функции, `inline`/`crossinline`/`reified`, делегаты через `by`, деструктуризацию - и отдельным блоком на `HashMap`/`HashSet`: как они резолвят коллизию хешей, когда коллизия существует, но это не баг, а когда она разрушает корректность кода.

Обозначения: **[Исправить]** - найти дефект в коде; **[Разобрать]** - предсказать выполнение; **[Реализовать]** - дописать решение. Часть задач комбинирует пометки, например «Разобрать и исправить».

Предполагаются стандартные импорты Kotlin stdlib; для делегатов - `kotlin.properties.ReadWriteProperty`, `kotlin.properties.Delegates` и `kotlin.reflect.KProperty`.

---

## Задачи

### 1. `data class`: equals, copy и hashCode

**[Разобрать, middle]** Что напечатает код?

```kotlin
data class Money(val amount: Int, val currency: String)

fun main() {
    val a = Money(100, "USD")
    val b = a.copy(amount = 150)
    println(a == b)
    println(a === b)
    println(a == Money(100, "USD"))
    println(a.hashCode() == Money(100, "USD").hashCode())
}
```

### 2. Extension-функции резолвятся статически

**[Исправить, middle]** Ожидалось, что вызов выведет `"circle"`, но выводится `"generic shape"`. Объясните причину и исправьте так, чтобы поведение было полиморфным.

```kotlin
open class Shape
class Circle : Shape()

fun Shape.describe() = "generic shape"
fun Circle.describe() = "circle"

fun printDescription(shape: Shape) {
    println(shape.describe())
}

fun main() {
    printDescription(Circle())
}
```

### 3. Sealed class и исчерпывающий `when`

**[Разобрать, middle]** Функция ниже компилируется без `else`. Что произойдёт, если через полгода кто-то добавит `data class Failed(val reason: String) : PaymentState()` в отдельном файле того же модуля? А если в `when` изначально был бы `else -> "unknown"`?

```kotlin
sealed class PaymentState {
    object Pending : PaymentState()
    object Completed : PaymentState()
}

fun describe(state: PaymentState): String = when (state) {
    PaymentState.Pending -> "pending"
    PaymentState.Completed -> "completed"
}
```

### 4. Коллизия хеша без бага

**[Разобрать, middle+]** У обоих ключей одинаковый `hashCode()`. Это баг? Что выведет код и почему?

```kotlin
data class Point(val x: Int, val y: Int) {
    override fun hashCode(): Int = 1 // намеренно "плохой" хеш для примера
}

fun main() {
    val map = hashMapOf<Point, String>()
    map[Point(1, 2)] = "a"
    map[Point(3, 4)] = "b"

    println(map[Point(1, 2)])
    println(map[Point(3, 4)])
    println(map.size)
}
```

### 5. `equals` без `hashCode`

**[Исправить, senior]** `contains` неожиданно возвращает `false`.

```kotlin
class UserId(val value: String) {
    override fun equals(other: Any?): Boolean {
        return other is UserId && other.value == value
    }
}

fun main() {
    val seen = hashSetOf<UserId>()
    seen += UserId("42")
    println(seen.contains(UserId("42")))
}
```

### 6. Мутация ключа после вставки

**[Исправить, senior]** После изменения `tag` элемент "теряется" в `HashMap`, хотя физически из неё не удалялся.

```kotlin
data class CacheKey(var tag: String)

fun main() {
    val cache = hashMapOf<CacheKey, ByteArray>()
    val key = CacheKey("initial")
    cache[key] = byteArrayOf(1, 2, 3)

    key.tag = "changed"

    println(cache[key])
    println(cache[CacheKey("changed")])
    println(cache.containsKey(key))
}
```

### 7. Коллизия есть, бага нет - только производительность

**[Разобрать, senior]** Корректно ли работает этот код на 100 000 элементов? Что произойдёт с производительностью и почему?

```kotlin
class LogEntry(val id: Long, val message: String) {
    override fun equals(other: Any?): Boolean =
        other is LogEntry && other.id == id && other.message == message

    override fun hashCode(): Int = 0
}

fun main() {
    val index = HashMap<LogEntry, Int>()
    repeat(100_000) { i -> index[LogEntry(i.toLong(), "msg$i")] = i }
    println(index.size)
    println(index[LogEntry(42, "msg42")])
}
```

### 8. `data class` с `Array`-полем

**[Исправить, senior]** `contains` возвращает `false`, хотя содержимое массива одинаковое.

```kotlin
data class Frame(val id: Int, val bytes: ByteArray)

fun main() {
    val cache = hashSetOf<Frame>()
    cache += Frame(1, byteArrayOf(1, 2, 3))

    println(cache.contains(Frame(1, byteArrayOf(1, 2, 3))))
}
```

### 9. `associateBy` тихо теряет дубликаты

**[Разобрать, senior]** Что выведет код и какой оператор стоило использовать, если нужны все заказы клиента?

```kotlin
data class Order(val customerId: Int, val amount: Int)

fun main() {
    val orders = listOf(Order(1, 100), Order(2, 50), Order(1, 30))
    val byCustomer = orders.associateBy { it.customerId }
    println(byCustomer)
    println(byCustomer.size)
}
```

### 10. Мутация коллекции во время итерации

**[Исправить, senior]** Код падает с `ConcurrentModificationException`.

```kotlin
fun purgeExpired(sessions: MutableList<Session>) {
    for (session in sessions) {
        if (session.isExpired()) {
            sessions.remove(session)
        }
    }
}
```

### 11. `Sequence` против `List`: порядок вычислений

**[Разобрать, senior]** В каком порядке выполнятся `println`? Сколько раз вызовется `map`, сколько `filter`, и почему не для всех пяти элементов?

```kotlin
fun main() {
    val result = listOf(1, 2, 3, 4, 5)
        .asSequence()
        .map { println("map $it"); it * 2 }
        .filter { println("filter $it"); it > 4 }
        .first()
    println("result = $result")
}
```

### 12. `compareTo`, несогласованный с `equals`

**[Исправить, senior]** В `TreeSet` пропадает один из элементов, хотя все три объекта не равны друг другу.

```kotlin
data class Version(val major: Int, val minor: Int) : Comparable<Version> {
    override fun compareTo(other: Version): Int = major.compareTo(other.major)
}

fun main() {
    val versions = sortedSetOf(Version(1, 0), Version(1, 5), Version(2, 0))
    println(versions.size)
    println(versions)
}
```

### 13. Неверный режим `lazy` для общего состояния

**[Исправить, middle+]** `ConfigLoader` - синглтон, к которому параллельно обращаются несколько потоков (например, из разных корутин на `Dispatchers.Default`). Иногда `source()` вызывается больше одного раза, а разные потоки видят разные объекты `Config` до стабилизации. Исправьте.

```kotlin
class ConfigLoader(private val source: () -> Config) {
    val config: Config by lazy(LazyThreadSafetyMode.NONE) { source() }
}
```

### 14. `inline`, `crossinline` и non-local return

**[Исправить, senior]** Код не компилируется. Прочитайте сообщение компилятора («Can't inline 'action' here: it may contain non-local returns...») и исправьте объявление `retrying`, сохранив возможность звать `action()` изнутри `Runnable`.

```kotlin
inline fun retrying(times: Int, action: () -> Unit) {
    val task = Runnable {
        repeat(times) { action() }
    }
    task.run()
}
```

### 15. `reified` и стирание типов

**[Разобрать и исправить, senior]** Функция не компилируется с ошибкой `Cannot check for instance of erased type: T`. Объясните причину и исправьте.

```kotlin
fun <T> List<Any?>.firstInstanceOf(): T? {
    for (item in this) {
        if (item is T) return item
    }
    return null
}
```

### 16. Боксинг `value class`

**[Разобрать, senior]** Где здесь `UserId` останется примитивом `Int`, а где будет упакован (boxed) в реальный объект, и почему?

```kotlin
@JvmInline
value class UserId(val value: Int)

fun printAll(ids: List<UserId>) {
    for (id in ids) println(id.value)
}

fun main() {
    val ids: List<UserId> = listOf(UserId(1), UserId(2))
    printAll(ids)

    val nullable: UserId? = null
    println(nullable)
}
```

### 17. Свой property delegate

**[Реализовать, senior]** Реализуйте `NonBlank` - `ReadWriteProperty<Any?, String>`, который бросает `IllegalArgumentException`, если новое значение пустое или состоит только из пробелов, и хранит текущее значение между обращениями.

```kotlin
class Form {
    var email: String by NonBlank()
}

class NonBlank(initial: String = "") : ReadWriteProperty<Any?, String> {
    // TODO
}
```

### 18. Корректные equals/hashCode для доменного дедупа

**[Реализовать, senior]** `id` - неизменяемый бизнес-ключ, `salary` может измениться у уже загруженных объектов после вызова функции. Реализуйте `distinctById` так, чтобы результат был устойчив к последующей мутации `salary`, сохранял порядок первого вхождения и работал за линейное время.

```kotlin
class Employee(val id: Int, val name: String, var salary: Double)

fun distinctById(employees: List<Employee>): List<Employee> = TODO()
```

### 19. Деструктуризация - позиционная, не по имени

**[Исправить, senior+]** Код компилируется без предупреждений, но выводит `city` и `country` местами.

```kotlin
data class ShippingLabel(val city: String, val country: String, val postalCode: String)

fun printAddress(label: ShippingLabel) {
    val (country, city, postalCode) = label
    println("$city, $country $postalCode")
}
```

### 20. Мутируемый ключ как архитектурная ошибка

**[Разобрать и исправить, senior+]** Объясните, что произойдёт после мутации `shared.labels`, и предложите архитектурное исправление `TagIndex` (не точечный патч конкретного места использования).

```kotlin
data class Tag(val labels: MutableList<String>)

class TagIndex {
    private val countByTag = HashMap<Tag, Int>()

    fun increment(tag: Tag) {
        countByTag[tag] = (countByTag[tag] ?: 0) + 1
    }

    fun count(tag: Tag): Int = countByTag[tag] ?: 0
}

fun main() {
    val shared = Tag(mutableListOf("beta"))
    val index = TagIndex()
    index.increment(shared)
    index.increment(shared)

    shared.labels += "gamma" // где-то в другом месте кода эту же ссылку мутируют

    println(index.count(shared))
    println(index.count(Tag(mutableListOf("beta"))))
}
```

---

# Решения и разбор

## 1. `data class`: equals, copy и hashCode

`false`, `false`, `true`, `true`. `copy(amount = 150)` создаёт новый объект с изменённым полем и не совпадает с исходным ни структурно, ни по ссылке. `data class` генерирует `equals`/`hashCode` по всем свойствам primary-конструктора: два разных экземпляра с одинаковыми `amount`/`currency` структурно равны и имеют одинаковый хеш - это и есть основной контракт `equals`/`hashCode` (равные объекты обязаны иметь равный хеш), который дальше ломается в задачах 5-8.

## 2. Extension-функции резолвятся статически

Extension-функция - это синтаксический сахар над обычной статической функцией с дополнительным параметром-receiver; какая именно перегрузка вызовется, компилятор решает по **объявленному (статическому) типу** выражения-receiver, а не по фактическому классу объекта в рантайме. Внутри `printDescription(shape: Shape)` тип `shape` объявлен как `Shape`, поэтому `shape.describe()` всегда резолвится в `Shape.describe()`, даже если реально передан `Circle`. Это принципиально отличается от переопределения обычного члена класса, которое диспетчеризуется динамически (virtual call).

```kotlin
open class Shape {
    open fun describe() = "generic shape"
}

class Circle : Shape() {
    override fun describe() = "circle"
}

fun printDescription(shape: Shape) {
    println(shape.describe())
}
```

Альтернатива, если `Shape` - чужой закрытый класс и добавить `open`-метод нельзя: `when (shape) { is Circle -> ...; else -> ... }` вместо extension-диспетчеризации, либо паттерн visitor.

## 3. Sealed class и исчерпывающий `when`

С Kotlin 1.5 прямые наследники `sealed class` могут быть в разных файлах, но обязаны быть в том же модуле и пакете. Если `Failed` добавят в соседнем файле того же модуля, любой исчерпывающий `when` над `PaymentState` без `else` (включая уже написанный `describe`) перестанет компилироваться: компилятор потребует добавить ветку `is Failed -> ...`. Это осознанная особенность: `sealed class` превращает добавление нового варианта в компилируемую ошибку везде, где о нём забыли, - в отличие от `open class`/`enum` с `else`-веткой, где новый случай тихо провалился бы в общий сценарий.

**Ловушка**: если бы в `describe` изначально был `else -> "unknown"`, добавление `Failed` вообще не привело бы к ошибке компиляции - новый случай молча обработался бы как `"unknown"`, что обычно неверно бизнес-логически. Поэтому `else` в exhaustive `when` над `sealed class` стоит добавлять только тогда, когда это действительно осмысленный catch-all, а не "чтобы компилятор не ругался".

## 4. Коллизия хеша без бага

Не баг. Вывод: `a`, `b`, `2`. `HashMap` хранит записи в бакетах по номеру, вычисленному из `hashCode()`; оба `Point` попадают в один и тот же бакет из-за `hashCode() = 1`. Но внутри бакета `HashMap` дополнительно сравнивает кандидатов через `equals()`, а автосгенерированный `equals` у `data class Point` корректно различает `(1,2)` и `(3,4)` - поэтому обе записи физически сохраняются и обе находятся правильно. Единственная цена такой коллизии - деградация поиска внутри бакета с O(1) до O(n) (или до O(log n), если у ключей есть естественный порядок и JDK решит превратить длинный бакет в дерево - см. задачу 7), а не потеря или порча данных.

## 5. `equals` без `hashCode`

`contains` вернёт `false` (или в целом непредсказуемый результат). `HashSet`/`HashMap` сначала вычисляют `hashCode()`, чтобы найти нужный бакет, и только потом сравнивают через `equals()` кандидатов внутри него. Раз `hashCode()` не переопределён, `UserId` использует унаследованный identity-хеш `Any` - у двух разных экземпляров он почти наверняка разный, даже если наш `equals` считает их равными. Поиск попадает в чужой (обычно пустой) бакет и не находит элемент, хотя семантически он там "есть". Это прямое нарушение контракта: `a.equals(b) == true` обязывает `a.hashCode() == b.hashCode()`.

```kotlin
class UserId(val value: String) {
    override fun equals(other: Any?): Boolean = other is UserId && other.value == value
    override fun hashCode(): Int = value.hashCode()
}
```

Альтернатива - сделать `UserId` обычным `data class(val value: String)`: компилятор сгенерирует согласованные `equals`/`hashCode`/`toString` бесплатно, и вручную поддерживать контракт не придётся.

## 6. Мутация ключа после вставки

Все три вызова вернут `null`, `null`, `false`. При `cache[key] = ...` хеш вычисляется от `tag = "initial"`, и запись физически ложится в соответствующий бакет. После `key.tag = "changed"` тот же объект `key` теперь возвращает другой `hashCode()`. Любой последующий `get`/`containsKey` пересчитывает хеш **по текущему** состоянию ключа и ищет уже в другом бакете - там записи нет, хотя физически она никуда не делась и продолжает занимать память в старом бакете (утечка "мёртвых" данных, недостижимых ни одним будущим ключом).

```kotlin
data class CacheKey(val tag: String) // val, а не var - ключ обязан быть неизменяемым
```

Если мутация действительно нужна где-то в другом месте программы, единственный безопасный вариант - явный remove/re-insert вокруг мутации:

```kotlin
val value = cache.remove(key)
key.tag = "changed"
if (value != null) cache[key] = value
```

## 7. Коллизия есть, бага нет - только производительность

Корректность полностью сохраняется: `index.size == 100000` (каждый ключ действительно уникален по `equals`), `index[LogEntry(42, "msg42")]` находит нужную запись и возвращает `42`. Проблема - только производительность: раз `hashCode()` всегда `0`, абсолютно все записи попадают в один и тот же бакет, и `HashMap` вырождается в связанный список на 100 000 элементов - каждый `get`/`put` становится O(n) вместо ожидаемого амортизированного O(1). Более того, начиная с Java 8 длинный бакет (от 8 элементов) превращается во внутреннее дерево (red-black tree) для O(log n) поиска, **но только если ключи взаимно `Comparable`** - `LogEntry` таковым не является, поэтому даже эта оптимизация не сработает, и бакет останется чистым O(n) списком.

```kotlin
class LogEntry(val id: Long, val message: String) {
    override fun equals(other: Any?): Boolean =
        other is LogEntry && other.id == id && other.message == message

    override fun hashCode(): Int = 31 * id.hashCode() + message.hashCode()
}
```

## 8. `data class` с `Array`-полем

`contains` вернёт `false`. Автосгенерированные `equals`/`hashCode` для `data class` вызывают `equals()`/`hashCode()` каждого свойства по отдельности; у `Array` (в том числе `ByteArray`) на JVM нет переопределённых `equals`/`hashCode` - используются унаследованные от `Any`, то есть сравнение по ссылке. Два разных массива с одинаковым содержимым - разные объекты, поэтому "одинаковый" `Frame` на самом деле не равен и имеет другой хеш. (Kotlin-компилятор не просто так предупреждает про `Array`-свойства в `data class` - это ровно этот случай.)

```kotlin
data class Frame(val id: Int, val bytes: List<Byte>) // List имеет структурные equals/hashCode
```

Альтернатива, если формат `ByteArray` обязателен (например, для интеропа с API): переопределить `equals`/`hashCode` вручную через `contentEquals`/`contentHashCode`, оставив класс `data class` (свои реализации просто заменяют автосгенерированные):

```kotlin
data class Frame(val id: Int, val bytes: ByteArray) {
    override fun equals(other: Any?): Boolean =
        other is Frame && id == other.id && bytes.contentEquals(other.bytes)

    override fun hashCode(): Int = 31 * id + bytes.contentHashCode()
}
```

## 9. `associateBy` тихо теряет дубликаты

Выведет `{1=Order(customerId=1, amount=30), 2=Order(customerId=2, amount=50)}` и размер `2`. `associateBy` при повторяющемся ключе молча оставляет **последний** встреченный элемент - без исключения и без предупреждения. Если цель - собрать все заказы клиента, а не последний, нужен `groupBy`:

```kotlin
val grouped: Map<Int, List<Order>> = orders.groupBy { it.customerId }
```

Если нужен именно один заказ на клиента, но по другому правилу (например, максимальный), `associateBy` с явной агрегацией через `groupBy(...).mapValues { ... }` безопаснее, чем полагаться на порядок исходного списка.

## 10. Мутация коллекции во время итерации

`for (session in sessions)` под капотом использует `Iterator`; `sessions.remove(session)` меняет список напрямую, в обход итератора, и увеличивает внутренний `modCount` у `ArrayList`. При следующем `next()`/`hasNext()` итератор обнаруживает рассинхронизацию и бросает `ConcurrentModificationException`. Исправление - убирать элементы либо через сам итератор, либо через операцию, которая не итерирует и не мутирует одновременно:

```kotlin
fun purgeExpired(sessions: MutableList<Session>) {
    sessions.removeAll { it.isExpired() }
}
```

Альтернатива - явный `MutableIterator`:

```kotlin
val iterator = sessions.iterator()
while (iterator.hasNext()) {
    if (iterator.next().isExpired()) iterator.remove()
}
```

## 11. `Sequence` против `List`: порядок вычислений

Порядок печати: `map 1`, `filter 2`, `map 2`, `filter 4`, `map 3`, `filter 6`, затем `result = 6`. `Sequence` - ленивая цепочка, которая продвигает **один элемент целиком через весь пайплайн** (map → filter), прежде чем запросить у источника следующий, а не выполняет каждый оператор целиком над всей коллекцией по очереди. Терминальная операция `first()` останавливает вычисление сразу, как только найден подходящий элемент - поэтому `4` и `5` из исходного списка вообще не обрабатываются: `map` и `filter` вызываются только 3 раза, а не 5.

Если убрать `.asSequence()` и работать с обычным `List`, операторы стали бы промежуточными: сначала выполнился бы `map` над всеми пятью элементами (создав промежуточный `List<Int>` из 5 значений с пятью строками `"map 1".."map 5"`), затем `filter` целиком просканировал бы этот список (пять строк `"filter ..."`), и только потом `first()` взял бы первый подходящий элемент готового результата - тот же ответ `6`, но с большим числом вызовов и лишней промежуточной аллокацией.

## 12. `compareTo`, несогласованный с `equals`

Выведет `2` и `[Version(major=1, minor=0), Version(major=2, minor=0)]` - `Version(1, 5)` пропадёт. `TreeSet`/`sortedSetOf` определяют уникальность элементов через `compareTo`, а не через `equals`/`hashCode`: если `compareTo` вернул `0`, множество считает элемент дубликатом и не добавляет его, даже если `equals` говорит, что объекты разные. Здесь `compareTo` сравнивает только `major`, поэтому `Version(1,0)` и `Version(1,5)` "равны" с точки зрения дерева.

```kotlin
data class Version(val major: Int, val minor: Int) : Comparable<Version> {
    override fun compareTo(other: Version): Int = compareValuesBy(this, other, Version::major, Version::minor)
}
```

Альтернатива, если частичный порядок по `major` нужен только для сортировки, а не для дедупликации по нему: не использовать сортированное множество вообще, а отсортировать обычный список - `versions.sortedBy { it.major }` - сохранив все элементы.

## 13. Неверный режим `lazy` для общего состояния

`LazyThreadSafetyMode.NONE` вообще не использует блокировку и годится только для сценариев с гарантированным доступом из одного потока. При обращении из нескольких потоков одновременно `source()` может быть вызван параллельно несколько раз, и если он не идемпотентен (например, читает мутируемое внешнее состояние или считает побочный эффект), разные потоки способны увидеть разные, не до конца согласованные значения `config` - классический data race поверх видимости памяти. Исправление - вернуть режим по умолчанию (полная блокировка, значение вычисляется ровно один раз):

```kotlin
class ConfigLoader(private val source: () -> Config) {
    val config: Config by lazy { source() }
}
```

Альтернатива - `LazyThreadSafetyMode.PUBLICATION`, если `source()` чистая и безопасно вызывается конкурентно несколько раз (несколько потоков могут одновременно посчитать значение, но все в итоге получат один и тот же "победивший" объект без явной блокировки) - дешевле `SYNCHRONIZED`, но требует, чтобы повторный параллельный вызов `source()` не имел побочных эффектов.

## 14. `inline`, `crossinline` и non-local return

Компилятор запрещает вызывать `action()` внутри `Runnable { ... }`, потому что `action` объявлен как обычный inline-параметр, который по умолчанию поддерживает non-local `return` (выход прямо из вызывающей функции). Но `Runnable { ... }` - самостоятельный, не инлайнящийся объект: если бы внутри него был `return`, было бы непонятно, куда именно возвращаться, ведь `Runnable.run()` может быть вызван значительно позже и в другом контексте. Поэтому такой "переход" параметра в чужой не-инлайновый лямбда-контекст требует явного `crossinline`, который убирает саму возможность non-local return для этого параметра - и снимает ограничение компилятора.

```kotlin
inline fun retrying(times: Int, crossinline action: () -> Unit) {
    val task = Runnable {
        repeat(times) { action() }
    }
    task.run()
}
```

Важная оговорка: после `crossinline` внутри `action { ... }` на месте вызова больше нельзя использовать обычный (non-local) `return` - разрешён только локальный `return@retrying` или отсутствие `return` вовсе; тело лямбды при этом всё равно инлайнится по месту вызова (в отличие от `noinline`, который превращает параметр в настоящий объект функции).

## 15. `reified` и стирание типов

На JVM параметр типа обычного `fun <T>` стирается в рантайме - метод не может проверить `item is T`, потому что байткод буквально не знает, что такое `T` на момент выполнения (ошибка `Cannot check for instance of erased type`). `reified` работает только для параметров типа `inline`-функций: компилятор подставляет конкретный тип в тело функции отдельно на каждом месте вызова, то есть фактически копирует тело с уже известным типом - поэтому `is T` внутри становится обычной проверкой на конкретный класс.

```kotlin
inline fun <reified T> List<Any?>.firstInstanceOf(): T? {
    for (item in this) {
        if (item is T) return item
    }
    return null
}

// val name = listOf(1, "two", 3.0).firstInstanceOf<String>() // "two"
```

Благодаря смарт-касту после успешной проверки `item is T` компилятор уже видит `item` как `T` в этой ветке, явный `as T` не нужен.

## 16. Боксинг `value class`

`value class` (inline class) разворачивается в "голый" `Int` без обёртки только там, где статический тип известен напрямую и не требует представления `null` - например, параметр `UserId` в обычной нестандартной функции или переменная, типизированная конкретно `UserId`. Но в этом коде боксинг реально происходит в двух местах:

1. `List<UserId>` - на JVM дженерики стираются до `Object`, поэтому каждый элемент внутри `List` не может остаться "плоским" `Int` - он оборачивается в настоящий объект-обёртку `UserId`, чтобы соответствовать стёртому представлению коллекции.
2. `UserId?` (nullable) - примитив `Int` физически не может представлять `null`, поэтому nullable `value class` тоже требует обёртки, даже вне дженериков.

Итог: "value class никогда не боксится" - миф; он не боксится только в самом частом, но не во всех случаях.

## 17. Свой property delegate

```kotlin
class NonBlank(initial: String = "") : ReadWriteProperty<Any?, String> {
    private var value: String = initial

    override fun getValue(thisRef: Any?, property: KProperty<*>): String = value

    override fun setValue(thisRef: Any?, property: KProperty<*>, value: String) {
        require(value.isNotBlank()) { "${property.name} must not be blank" }
        this.value = value
    }
}
```

Альтернатива - готовый `Delegates.vetoable` из stdlib, если нужна валидация "принять/отклонить" без своего класса; чтобы получить именно исключение (а не тихий откат к старому значению, как это делает `vetoable` по умолчанию), исключение бросают прямо внутри callback:

```kotlin
var email: String by Delegates.vetoable("") { property, _, newValue ->
    if (newValue.isBlank()) throw IllegalArgumentException("${property.name} must not be blank")
    true
}
```

## 18. Корректные equals/hashCode для доменного дедупа

```kotlin
fun distinctById(employees: List<Employee>): List<Employee> {
    val seenIds = HashSet<Int>()
    val result = ArrayList<Employee>(employees.size)
    for (employee in employees) {
        if (seenIds.add(employee.id)) {
            result += employee
        }
    }
    return result
}
```

Ключевое решение - хешировать по неизменяемому бизнес-ключу `id: Int`, а не по самому `Employee` целиком: `Int.hashCode()`/`equals` не зависят от состояния и никогда не "испортятся" из-за последующей мутации `salary` (в отличие от задач 6 и 20). Проход за один линейный проход с `HashSet<Int>.add()` даёт O(n) в среднем и сохраняет порядок первого вхождения. Идиоматичная альтернатива - готовая stdlib-функция, которая делает ровно то же самое внутри: `employees.distinctBy { it.id }`.

## 19. Деструктуризация - позиционная, не по имени

Выведет перепутанные значения: `country` получит `label.component1()` (то есть `city`), а `city` получит `label.component2()` (то есть `country`) - Kotlin сопоставляет переменные деструктуризации **по позиции**, а не по совпадению имени с именем свойства. Имена локальных переменных в `val (country, city, postalCode) = label` - это просто выбор автора, они никак не проверяются компилятором против реального порядка полей `data class`.

```kotlin
fun printAddress(label: ShippingLabel) {
    val (city, country, postalCode) = label // порядок должен совпадать с объявлением класса
    println("$city, $country $postalCode")
}
```

Более надёжная альтернатива - вообще не деструктурировать объект с несколькими полями одного типа, а читать именованные свойства напрямую:

```kotlin
fun printAddress(label: ShippingLabel) {
    println("${label.city}, ${label.country} ${label.postalCode}")
}
```

## 20. Мутируемый ключ как архитектурная ошибка

После `shared.labels += "gamma"` у `shared` меняется хеш (`data class` генерирует `hashCode` из `labels`, а `MutableList` сравнивается/хешируется по своему текущему содержимому). Оба вызова `count` вернут `0`: `count(shared)` пересчитывает хеш по уже изменённому состоянию и не находит запись в старом бакете, а `count(Tag(mutableListOf("beta")))` создаёт новый объект, чей хеш совпадает со старым бакетом ключа, но записи там либо нет (если старый ключ туда физически не попадал из-за коллизий), либо `equals` не совпадёт с давно устаревшим состоянием `shared`. Реальная запись `"beta" -> 2` при этом никуда не делась - она "осиротела" в старом бакете и больше не будет найдена ни одним будущим ключом. Это тот же дефект, что в задачах 6 и 8, но на уровне архитектуры: проблема не в одной строке кода, а в том, что `Tag` в принципе не должен быть пригоден для использования как изменяемый ключ.

```kotlin
data class Tag(val labels: List<String>) // неизменяемый снимок, а не MutableList
```

Любое место, где раньше "дописывали лейбл" в существующий `Tag`, должно создавать **новый** `Tag` (например, через `copy(labels = labels + "gamma")`), а не мутировать использованный как ключ экземпляр. Общее архитектурное правило: тип, который используется как ключ хеш-коллекции, обязан быть эффективно неизменяемым на всё время, пока он состоит в этой коллекции - если нужна мутируемая сущность, у неё должен быть отдельный неизменяемый идентификатор (как в задаче 18), а не "сырое" содержимое в качестве ключа.

---

## Карта навыков

| Задачи | Навык |
| --- | --- |
| 1-3 | `data class`, extension-функции, sealed-иерархии и exhaustive `when` |
| 4-9 | `HashMap`/`HashSet`: бакеты и коллизии, контракт `equals`/`hashCode`, `Array` в `data class`, `associateBy` vs `groupBy` |
| 10-12 | Мутация коллекции во время итерации, `Sequence` vs `List`, `Comparable` против `equals` в сортированных множествах |
| 13-16 | `lazy` и потокобезопасность, `inline`/`crossinline`, `reified`-дженерики, боксинг `value class` |
| 17-20 | Свои делегаты через `by`, проектирование `equals`/`hashCode` для доменных объектов, деструктуризация, архитектура вокруг мутируемых ключей |

Для более глубокой теории по языку - `Kotlin_Senior_Android_Guide.markdown`; по конкурентному доступу к `lazy`/делегатам - `11-concurrency-deep.md`.
