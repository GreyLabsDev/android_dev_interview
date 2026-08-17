# Kotlin для собеседования Senior Android Developer

Комплексный набор тем, вопросов и кратких ответов. Материал сфокусирован на Kotlin/JVM и тех особенностях языка, которые особенно важны в Android-разработке.

> «Полный список» не может быть буквально исчерпывающим: интервьюер может спросить любую деталь языка или конкретной версии компилятора. Ниже покрыто практическое ядро senior-интервью и наиболее частые вопросы с уточнениями.

## Как пользоваться

- Сначала ответьте на вопрос вслух за 1–2 минуты.
- Затем сравните ответ с конспектом.
- Для senior-уровня объясняйте не только **что** делает конструкция, но и **почему**, какие есть ограничения, цена и альтернативы.
- Примеры предполагают Kotlin/JVM; поведение Kotlin/Native и Kotlin/JS может отличаться.

---

# 1. Базовая модель Kotlin

Kotlin предоставляет более строгую и выразительную модель исходного кода, но на Android исполняется не сам Kotlin. Исходники проходят через Kotlin compiler, превращаются в JVM bytecode, затем Android Gradle Plugin, D8/R8 и ART преобразуют и оптимизируют их для устройства. Поэтому языковая конструкция и её runtime-представление — не одно и то же: `object` становится классом с singleton-полем, лямбда — объектом или `invokedynamic`-выражением, а `suspend`-функция — state machine.

Часть информации, которой нет в обычной JVM-модели, сохраняется в аннотации `@Metadata`: nullability, declaration-site variance, имена Kotlin-деклараций и другие сведения. Компилятор Kotlin и некоторые библиотеки используют metadata, чтобы восстановить исходную семантику. На собеседовании полезно разделять три уровня: гарантия языка, сгенерированный bytecode и поведение Android runtime.

Ещё одно важное различие — compile-time и runtime. Например, `const val` встраивается в код потребителя. Если библиотека изменила публичную константу, уже скомпилированный клиент может продолжить использовать старое значение до перекомпиляции. Поэтому изменяемая настройка или feature flag не должна становиться публичной compile-time константой.

## 1.1. Kotlin — компилируемый или интерпретируемый язык?

Kotlin — компилируемый язык. Для Android/JVM компилятор обычно создаёт JVM bytecode, который Android toolchain затем преобразует в DEX. Kotlin также умеет компилироваться в JavaScript, native-код и другие целевые платформы.

Важно различать:

- язык Kotlin;
- компилятор и его frontend/backend;
- стандартную библиотеку;
- целевую платформу и её runtime.

## 1.2. Что такое `Any`, `Any?`, `Unit`, `Nothing` и `Nothing?`?

- `Any` — корень иерархии **не-null** типов Kotlin. Объявляет `equals`, `hashCode`, `toString`.
- `Any?` — любой объект, включая `null`.
- `Unit` — тип «осмысленного значения нет». У него есть единственное значение `Unit`; похож на `void`, но является настоящим типом.
- `Nothing` — тип без значений, нижний тип иерархии. Используется для функций, которые никогда нормально не завершаются: `throw`, бесконечный цикл.
- `Nothing?` имеет единственное допустимое значение `null` и является подтипом всех nullable-типов.

```kotlin
fun fail(message: String): Nothing = throw IllegalStateException(message)

fun printName(name: String): Unit {
    println(name)
}
```

## 1.3. Чем `val` отличается от неизменяемого объекта?

`val` запрещает переназначить ссылку, но не делает объект immutable.

```kotlin
val users = mutableListOf("Ann")
users += "Bob"       // допустимо
// users = mutableListOf() // недопустимо
```

Настоящая неизменяемость требует неизменяемого состояния объекта, отсутствия изменяющих API и безопасной работы с вложенными объектами.

## 1.4. Чем `const val` отличается от `val`?

`const val` — compile-time constant:

- только на верхнем уровне, в `object` или `companion object`;
- только `String` и примитивные типы;
- без custom getter;
- значение известно компилятору и может использоваться в аннотациях.

Обычный `val` может вычисляться во время выполнения и иметь getter.

## 1.5. Что такое expression-oriented синтаксис?

Многие конструкции Kotlin возвращают значение: `if`, `when`, `try`, лямбда и блок-функция. Отдельного тернарного оператора нет, потому что его роль выполняет `if`.

```kotlin
val label = if (isOnline) "Online" else "Offline"
val result = try {
    repository.load()
} catch (e: IOException) {
    emptyList()
}
```

---

# 2. Система типов и null safety

Null safety в Kotlin — это прежде всего статическая проверка компилятора. Тип сообщает, допустим ли `null`, а data-flow analysis отслеживает проверки и smart casts. На JVM `String` и `String?` не являются двумя разными runtime-классами, поэтому часть гарантий существует только во время компиляции, а на границах могут добавляться runtime-проверки.

Система не является абсолютно «непробиваемой». Java, JNI, reflection, platform types, некорректная десериализация и нарушение generic-контракта способны передать `null` туда, где Kotlin ожидает non-null значение. Поэтому NPE возможен даже без `!!`. Senior-разработчик не просто избегает `!!`, а локализует небезопасные платформенные границы и переводит данные в честные Kotlin-типы как можно раньше.

У generic-параметра `<T>` верхняя граница по умолчанию — `Any?`, то есть `T` может быть nullable. Если функция требует настоящее значение, это следует выразить как `<T : Any>`. При этом `T?` не создаёт «двойную nullable-обёртку»: если `T` уже равен `String?`, результат всё равно имеет семантику `String?`.

## 2.1. Как Kotlin обеспечивает null safety?

Nullable и non-null типы различаются на уровне системы типов: `String` и `String?`. Компилятор требует явной обработки nullable-значений.

Основные инструменты:

- safe call: `user?.name`;
- Elvis: `name ?: "Unknown"`;
- safe cast: `value as? User`;
- проверка: `if (value != null)`;
- `let` и другие функции высшего порядка;
- `requireNotNull` / `checkNotNull`;
- небезопасный оператор `!!`.

`!!` не устраняет возможность ошибки, а превращает её в исключение во время выполнения. В production-коде его стоит применять только при доказанном инварианте.

## 2.2. Что такое smart cast и когда он не работает?

После проверки типа или `null` компилятор может автоматически рассматривать значение как более узкий тип.

### Когда smart cast работает

Локальный `val` стабилен: после проверки его ссылка не может быть заменена.

```kotlin
fun printLength(value: Any?) {
    if (value is String) {
        // value автоматически имеет тип String
        println(value.length)
    }
}
```

Проверка на `null` аналогично сужает nullable-тип до non-null:

```kotlin
fun render(name: String?) {
    if (name != null) {
        // name имеет тип String
        println(name.uppercase())
    }
}
```

Data-flow analysis учитывает логические операторы, ранний выход и ветки `when`:

```kotlin
fun handle(value: Any?) {
    if (value is String && value.isNotBlank()) {
        println(value.length)
    }

    if (value !is String) return

    // Из отрицательной проверки можно попасть сюда
    // только если value имеет тип String.
    println(value.lowercase())
}
```

```kotlin
fun describe(value: Any): String = when (value) {
    is String -> "String length = ${value.length}"
    is List<*> -> "List size = ${value.size}"
    else -> "Unknown"
}
```

Локальная `var` тоже может быть smart-cast, если компилятор видит, что между проверкой и использованием она не изменяется:

```kotlin
fun consume(input: String?) {
    var text = input

    if (text != null) {
        // Работает: после проверки text не переназначается.
        println(text.length)
    }

    text = null
}
```

Для property типа `val` smart cast возможен только тогда, когда компилятор способен доказать стабильность чтения: property не `open`, не имеет custom getter и доступна для такого анализа в пределах соответствующей области/модуля. Локальный `val` обычно является более очевидной и надёжной границей.

### Когда smart cast не работает

Smart cast невозможен, если повторное чтение теоретически может вернуть другое значение. Классический случай — mutable property:

```kotlin
class Profile {
    var nickname: String? = null

    fun printNickname() {
        if (nickname != null) {
            // Не компилируется:
            // smart cast to String is impossible,
            // because nickname is a mutable property.
            println(nickname.length)
        }
    }
}
```

Между проверкой и чтением property мог быть вызван другой код, setter или конкурентная запись. Решение — один раз прочитать значение в локальный стабильный snapshot:

```kotlin
class Profile {
    var nickname: String? = null

    fun printNickname() {
        val currentNickname = nickname
        if (currentNickname != null) {
            println(currentNickname.length)
        }
    }
}
```

Даже `val` не гарантирует одинаковый результат каждого чтения, если property вычисляемая:

```kotlin
class TokenProvider {
    val token: String?
        get() = loadTokenFromStorage()

    fun printToken() {
        if (token != null) {
            // Не компилируется: getter вызывается заново
            // и может вернуть уже другое значение.
            println(token.length)
        }
    }
}
```

`open val` также нельзя считать стабильным: override в наследнике может реализовать custom getter.

```kotlin
open class Response {
    open val body: Any? = null

    fun printBody() {
        if (body is String) {
            // Не компилируется: body — open property.
            println(body.length)
        }
    }
}
```

Локальная `var` теряет возможность smart cast, если её захватывает lambda, способная изменить значение:

```kotlin
fun process(input: String?) {
    var text = input
    val clear = { text = null }

    if (text != null) {
        clear()
        // Не компилируется и было бы небезопасно:
        // text уже может быть null.
        println(text.length)
    }
}
```

Обычная пользовательская функция-предикат тоже не передаёт компилятору знание о типе:

```kotlin
fun isString(value: Any?): Boolean = value is String

fun printValue(value: Any?) {
    if (isString(value)) {
        // Не компилируется: компилятор не выводит из произвольного
        // Boolean-результата, что value имеет тип String.
        println(value.length)
    }
}
```

Такой факт можно описать Kotlin contract, но контракт должен точно соответствовать реализации. В обычном коде прямой `is` либо safe cast проще:

```kotlin
fun printValue(value: Any?) {
    val text = value as? String ?: return
    println(text.length)
}
```

Итого: smart cast работает не потому, что разработчик «уже проверил» значение, а потому, что data-flow analysis компилятора одновременно доказал проверку типа и стабильность значения до места использования.

## 2.3. Что такое platform type?

При вызове Java-кода Kotlin часто видит тип с неизвестной nullable-семантикой, условно `String!`. Его можно присвоить как `String` или `String?`, поэтому ответственность переносится на разработчика.

Platform type нельзя явно записать в Kotlin source code: `String!` — обозначение, которое IDE и документация используют для типа, пришедшего с небезопасной платформенной границы. Компилятор разрешает обращаться с ним и как с nullable, и как с non-null значением.

Например, Java-метод не сообщает ничего о nullability:

```java
public final class JavaUserApi {
    public static String loadName() {
        return null;
    }
}
```

В Kotlin результат имеет platform type `String!`:

```kotlin
val inferredName = JavaUserApi.loadName() // String!

// Разрешено, но при фактическом null возникнет NPE
// на сгенерированной runtime-проверке.
val requiredName: String = JavaUserApi.loadName()

// Безопасный и честный выбор, если контракт Java API неизвестен.
val optionalName: String? = JavaUserApi.loadName()
```

Главная опасность в том, что platform type разрешено dereference без safe call:

```kotlin
val name = JavaUserApi.loadName()

// Компилируется, но упадёт, если Java вернула null.
println(name.length)
```

Поэтому platform type желательно нормализовать сразу на границе, а не передавать дальше по слоям приложения:

```kotlin
class UserRepository {
    fun findNameOrNull(): String? =
        JavaUserApi.loadName()

    fun requireName(): String =
        requireNotNull(JavaUserApi.loadName()) {
            "JavaUserApi returned null name"
        }
}
```

В первом варианте nullable-семантика становится частью Kotlin API. Во втором нарушение внешнего контракта обнаруживается в одном понятном месте с осмысленной ошибкой.

Источники риска:

- Java API без nullability-аннотаций;
- некорректные аннотации;
- generic-типы из Java;
- Java-код, нарушающий Kotlin-контракт.

Platform type может находиться не только на верхнем уровне, но и внутри Java generic:

```java
public static List<String> loadNames() {
    return Arrays.asList("Alice", null, "Bob");
}
```

Упрощённо Kotlin видит и саму коллекцию, и её элементы как типы с неизвестной nullability. Наивный код может упасть:

```kotlin
val names = JavaUserApi.loadNames()

for (name in names) {
    // Компилируется, но null-элемент приводит к NPE.
    println(name.uppercase())
}
```

На внешней границе можно явно выбрать безопасную модель:

```kotlin
fun loadValidNames(): List<String> =
    JavaUserApi.loadNames()
        .orEmpty()
        .filterNotNull()
```

Распознанные nullability-аннотации делают контракт точнее:

```java
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public final class AnnotatedApi {
    @Nullable
    public static String findName() {
        return null;
    }

    @NonNull
    public static String requireName() {
        return "Alice";
    }
}
```

Тогда Kotlin обычно видит `findName()` как `String?`, а `requireName()` как `String`. Конкретный набор поддерживаемых аннотаций и строгость диагностики зависят от compiler settings и используемых annotation packages. Аннотация не является runtime-защитой: если Java-реализация нарушила `@NonNull`-контракт, Kotlin-код всё равно может получить NPE.

```kotlin
val optional: String? = AnnotatedApi.findName()
val required: String = AnnotatedApi.requireName()
```

На границе с Java следует:

1. определить реальный контракт по документации, annotations и поведению API;
2. один раз преобразовать значение в честный `T` или `T?`;
3. проверить обязательное значение через `requireNotNull`/явную ошибку;
4. не распространять inferred platform type глубоко в domain и UI слои.

## 2.4. Чем `?.let {}` отличается от обычной проверки на `null`?

`value?.let { ... }` выполняет блок только для non-null значения и удобно создаёт локальную область. Это не всегда лучше `if`: вложенные `let`, неясные `it` и нелокальные возвраты ухудшают читаемость.

```kotlin
val user = cachedUser
if (user != null) {
    render(user)
}
```

Для нескольких операций и осмысленного имени обычный `if` часто понятнее.

## 2.5. Что делает Elvis с `return` или `throw`?

`return` и `throw` имеют тип `Nothing`, поэтому могут стоять справа от Elvis.

```kotlin
val user = repository.find(id) ?: return
val token = response.token ?: error("Token is required")
```

## 2.6. Что такое definitely non-nullable type `T & Any`?

Это generic-тип, который явно обозначает non-null значение параметра `T`, даже если сам `T` потенциально nullable. Чаще нужен при строгом Java interop и переопределении API с аннотациями `@NotNull`, а в обычном прикладном коде встречается редко.

---

# 3. Классы и объектная модель

Классы Kotlin строятся поверх объектной модели целевой платформы, но язык добавляет более строгие правила: final-by-default, primary constructor, properties, delegation и специальные виды классов. Важно понимать, что property — это языковая декларация, которая может компилироваться в поле, getter/setter или только вычисляемый метод. Поэтому «свойство Kotlin» и «поле JVM» не всегда совпадают.

Инициализация идёт от базового класса к наследнику, а внутри класса — в текстовом порядке. Пока конструктор базового класса выполняется, состояние наследника ещё не готово. Вызов `open`-метода из `init`, property initializer или конструктора базового класса может попасть в override наследника и прочитать default JVM-значение вместо ожидаемого. Это одна из причин закрытости методов по умолчанию.

Singleton тоже имеет жизненный цикл и возможность ошибки. Если initializer JVM-класса, соответствующего `object`, бросил исключение, первый доступ обычно получает `ExceptionInInitializerError`, а последующие могут завершиться `NoClassDefFoundError` для этого ClassLoader. Поэтому Android singleton не должен выполнять тяжёлый I/O или зависеть от ещё не инициализированного `Context` прямо в initializer.

## 3.1. Почему классы и методы по умолчанию `final`?

Kotlin следует принципу «закрыто по умолчанию». Для наследования нужны `open` или `abstract`. Это:

- делает контракты устойчивее;
- предотвращает случайное переопределение;
- помогает оптимизациям;
- подталкивает к композиции.

## 3.2. Порядок инициализации класса

Упрощённо:

1. вычисляются аргументы конструктора базового класса;
2. инициализируется базовый класс;
3. в текстовом порядке выполняются property initializers и `init`-блоки текущего класса;
4. выполняется тело secondary constructor, если он вызван.

Опасность: вызов `open`-метода из конструктора базового класса может обратиться к ещё не инициализированному состоянию наследника.

## 3.3. Primary и secondary constructor

Primary constructor находится в заголовке класса и участвует в общей инициализации. Secondary constructor объявляется через `constructor` и обязан прямо или косвенно делегировать primary constructor через `this(...)`, если тот существует.

У primary constructor нет отдельного тела: его код выполняется через property initializers и `init`-блоки в текстовом порядке. Параметр с `val` или `var` одновременно объявляет property. Обычный параметр доступен во время инициализации, но не становится членом объекта:

```kotlin
class User(
    rawName: String,       // только параметр конструктора
    val age: Int,          // read-only property
    var isActive: Boolean, // mutable property
) {
    val name = rawName.trim()

    init {
        require(name.isNotEmpty()) { "Name must not be blank" }
        require(age >= 0) { "Age must be non-negative" }
    }

    fun description(): String = "$name, $age"
    // rawName здесь использовать нельзя: property с таким именем нет
}
```

Ключевое слово `constructor` у primary constructor обычно опускается. Оно требуется, если у конструктора есть annotation или visibility modifier:

```kotlin
class Session private constructor(
    val token: String,
) {
    companion object {
        fun authenticated(token: String): Session {
            require(token.isNotBlank())
            return Session(token)
        }
    }
}
```

Secondary constructor удобен, когда действительно нужны разные JVM-конструкторы, например для Java interop или framework API:

```kotlin
class Connection private constructor(
    val host: String,
    val port: Int,
) {
    init {
        require(host.isNotBlank())
        require(port in 1..65_535)
        println("init: $host:$port")
    }

    constructor(host: String) : this(
        host = host,
        port = 443,
    ) {
        println("secondary constructor body")
    }
}
```

При вызове `Connection("example.com")` сначала вычисляются аргументы `this(...)`, затем выполняются property initializers и `init` primary constructor, и только после этого — тело secondary constructor. Поэтому secondary constructor не может обойти инварианты, проверяемые в `init`.

Если у класса нет primary constructor, каждый secondary constructor должен делегировать конструктору базового класса через `super(...)` либо другому secondary constructor через `this(...)`:

```kotlin
open class Entity(val id: Long)

class UserEntity : Entity {
    constructor(id: Long) : super(id)

    constructor(rawId: String) : this(
        id = rawId.toLong(),
    )
}
```

Часто secondary constructor вообще не нужен: default и named arguments дают более компактный Kotlin API без набора overload:

```kotlin
class ApiClient(
    val baseUrl: String,
    val timeoutMillis: Long = 5_000,
)

val defaultClient = ApiClient("https://example.com")
val slowClient = ApiClient(
    baseUrl = "https://example.com",
    timeoutMillis = 30_000,
)
```

Для сложного создания объектов обычно предпочтительны именованные factory-функции: они объясняют сценарий создания, могут валидировать и преобразовывать входные данные, вернуть subtype, кешированный объект или ошибку. Secondary constructor всегда должен завершиться созданием экземпляра объявленного класса и не имеет собственного имени.

## 3.4. Что генерирует `data class`?

Для свойств primary constructor генерируются:

- `equals` / `hashCode`;
- `toString`;
- `componentN`;
- `copy`.

Ограничения и ловушки:

- свойства из тела класса не участвуют в этих методах;
- `copy` выполняет **поверхностное**, а не глубокое копирование;
- массивы сравниваются по своей семантике, а не автоматически по содержимому;
- изменяемые поля делают value-семантику ненадёжной.

## 3.5. Чем `sealed class` отличается от `enum class`?

`enum` задаёт фиксированный набор экземпляров одного класса. У каждого элемента может быть состояние, но форма состояния общая.

`sealed`-иерархия задаёт закрытый набор подтипов, каждый из которых может иметь собственные данные и поведение.

```kotlin
sealed interface UiState {
    data object Loading : UiState
    data class Content(val items: List<Item>) : UiState
    data class Error(val cause: Throwable) : UiState
}
```

`when` по sealed-типу может быть исчерпывающим без `else`. Прямые наследники должны удовлетворять ограничениям компилятора по модулю и пакету.

## 3.6. `object`, companion object и anonymous object

- `object Foo` — singleton declaration, лениво и потокобезопасно инициализируется при первом доступе.
- `companion object` — объект, связанный с классом; это не Java `static`, хотя JVM-аннотации могут создать static bridge.
- `object : Interface { ... }` — анонимный объект/выражение, создаваемое в месте вызова.
- `data object` добавляет стабильную value-подобную семантику для singleton и удобен в sealed-иерархиях.

Глобальный mutable singleton усложняет тестирование и синхронизацию.

## 3.7. Что такое value class?

`@JvmInline value class` оборачивает одно значение и часто позволяет избежать отдельного объекта в runtime.

```kotlin
@JvmInline
value class UserId(val value: String)
```

Преимущества:

- типобезопасность без обязательной аллокации wrapper;
- защита от смешивания одинаковых примитивных типов.

### Пример 1. Типобезопасные идентификаторы

Два идентификатора могут иметь одинаковый underlying type, но оставаться разными типами для компилятора:

```kotlin
@JvmInline
value class UserId(val value: Long)

@JvmInline
value class OrderId(val value: Long)

fun loadUser(id: UserId): User = TODO()

val userId = UserId(42)
val orderId = OrderId(42)

loadUser(userId)  // корректно
loadUser(orderId) // не компилируется: требуется UserId
```

Без value classes оба параметра были бы обычными `Long`, и перепутать их можно было бы незаметно.

### Пример 2. Проверка инварианта и вычисляемое свойство

Value class может иметь `init`, функции и properties без дополнительного backing field:

```kotlin
@JvmInline
value class Email(val value: String) {
    init {
        require('@' in value) { "Invalid email: $value" }
    }

    val domain: String
        get() = value.substringAfter('@')

    fun normalized(): Email =
        Email(value.trim().lowercase())
}

val email = Email("User@Example.com")
println(email.domain)       // Example.com
println(email.normalized()) // Email(value=user@example.com)
```

Такая проверка гарантирует инвариант для обычного вызова конструктора. Однако внешние framework/serialization/reflection-механизмы нужно оценивать отдельно: они не всегда создают объект тем же путём, что обычный Kotlin-код.

### Пример 3. Единицы измерения и операции

Value class помогает не смешивать числа с разным смыслом и может определять операции своего domain:

```kotlin
@JvmInline
value class Milliseconds(val value: Long) {
    init {
        require(value >= 0)
    }

    operator fun plus(other: Milliseconds): Milliseconds =
        Milliseconds(Math.addExact(value, other.value))
}

@JvmInline
value class Bytes(val value: Long)

fun setTimeout(timeout: Milliseconds) = Unit

val connectTimeout = Milliseconds(2_000)
val readTimeout = Milliseconds(5_000)
val totalTimeout = connectTimeout + readTimeout

setTimeout(totalTimeout) // корректно
// setTimeout(Bytes(7_000)) — не компилируется
```

Здесь тип выражает семантику лучше, чем суффикс в имени обычного `Long`. `Math.addExact` дополнительно обнаруживает overflow вместо тихого переполнения.

### Пример 4. Где появляется boxing

Компилятор старается использовать underlying type, когда значение известно именно как value class:

```kotlin
@JvmInline
value class Counter(val value: Int)

fun increment(counter: Counter): Counter =
    Counter(counter.value + 1)

val next = increment(Counter(10))
```

На JVM такой путь может быть представлен обычными `int` без отдельного объекта `Counter`. Но wrapper требуется или может потребоваться на границе с другим представлением:

```kotlin
interface Loggable {
    fun asLogValue(): String
}

@JvmInline
value class TraceId(val value: Long) : Loggable {
    override fun asLogValue(): String = value.toString()
}

val nullable: TraceId? = TraceId(10)       // nullable-контекст
val list: List<TraceId> = listOf(TraceId(10)) // generic-контекст
val any: Any = TraceId(10)                 // использование как Any
val loggable: Loggable = TraceId(10)       // использование как интерфейс
```

В этих случаях значение должно соответствовать объектной JVM-сигнатуре, поэтому возникает boxing. Конкретное runtime-представление нужно проверять по bytecode и профилированию, а не предполагать, что `value class` гарантированно устраняет все аллокации.

Value class содержит ровно одно underlying property в primary constructor, не имеет обычной ссылочной идентичности и не должна использоваться с расчётом на `===`. На JVM имена функций с value-class параметрами могут быть mangled, что также следует учитывать при проектировании Java-facing API.

## 3.8. Чем композиция лучше наследования?

Композиция связывает классы через явные зависимости и обычно:

- уменьшает связанность;
- не нарушает инкапсуляцию;
- позволяет менять поведение во время выполнения;
- проще тестируется.

Наследование оправдано для настоящего отношения «является» и устойчивого контракта подтипов.

---

# 4. Равенство, копирование и destructuring

Равенство определяет, считается ли объект значением или сущностью. Для value object обычно важны поля и подходит структурное `equals`; для entity может быть важен стабильный идентификатор, а не совпадение всех текущих атрибутов. Ошибка в выборе семантики проявляется в diffing UI, кешах, `distinctUntilChanged`, `StateFlow`, `HashMap` и persistence.

В открытых иерархиях корректно реализовать equality сложно. Если наследник добавляет значимое поле, базовый объект может считать наследника равным, а наследник базовый — нет, нарушая симметрию. Поэтому value-типы обычно делают `final`, а состояние модели включают в primary constructor data class или сравнивают явно.

Копирование также связано с ownership. Поверхностный `copy()` создаёт новый внешний объект, но не передаёт ему независимое владение вложенными mutable-объектами. Если два UI state разделяют один `MutableList`, изменение «нового» состояния меняет и «старый snapshot», что ломает сравнение, историю состояний и конкурентную безопасность.

## 4.1. `==` и `===`

- `a == b` — структурное равенство, null-safe вызов `equals`.
- `a === b` — ссылочная идентичность на JVM.

Для value class и примитивов полагаться на ссылочную идентичность нельзя.

## 4.2. Контракт `equals` и `hashCode`

`equals` должен быть рефлексивным, симметричным, транзитивным, согласованным и возвращать `false` для `null`. Равные объекты обязаны иметь одинаковый `hashCode`.

Связь между `equals` и `hashCode` направленная:

- если `a == b`, то `a.hashCode() == b.hashCode()` обязательно;
- если hash codes разные, объекты точно не равны при корректной реализации контракта;
- если hash codes одинаковые, объекты **не обязательно** равны: collision допустим;
- если `a != b`, их hash codes могут быть как разными, так и одинаковыми.

### Пример 1. Равные объекты имеют одинаковый hash code

`data class` генерирует согласованные `equals` и `hashCode` по properties primary constructor:

```kotlin
data class UserKey(
    val tenantId: Long,
    val userId: Long,
)

val first = UserKey(tenantId = 10, userId = 42)
val second = UserKey(tenantId = 10, userId = 42)

check(first !== second)                 // разные экземпляры
check(first == second)                  // структурно равны
check(first.hashCode() == second.hashCode()) // обязательно
```

Разные ссылки не мешают объектам быть равными по значению. Именно поэтому `HashMap` может найти значение по новому экземпляру эквивалентного ключа:

```kotlin
val users = hashMapOf(first to "Alice")

check(users[second] == "Alice")
```

### Пример 2. Одинаковый hash code не означает равенство

Hash code не обязан быть уникальным. Эта реализация корректна по контракту, хотя намеренно создаёт collision для всех экземпляров:

```kotlin
class CollisionKey(
    private val id: Int,
) {
    override fun equals(other: Any?): Boolean =
        other is CollisionKey && id == other.id

    override fun hashCode(): Int = 0
}

val first = CollisionKey(1)
val second = CollisionKey(2)

check(first != second)
check(first.hashCode() == second.hashCode())
```

`HashSet` и `HashMap` сначала используют hash code для выбора bucket, а затем вызывают `equals`, чтобы различить элементы внутри bucket:

```kotlin
val keys = hashSetOf(
    CollisionKey(1),
    CollisionKey(2),
)

check(keys.size == 2)
```

Контракт не нарушен, но качество hash-функции плохое: большое число collision ухудшает производительность hash-коллекций.

### Пример 3. Нарушение контракта ломает поиск в `HashSet`

Ошибка возникает, если `equals` и `hashCode` используют разные наборы значимых полей:

```kotlin
class BrokenUser(
    private val id: Int,
    private val name: String,
) {
    override fun equals(other: Any?): Boolean =
        other is BrokenUser && id == other.id

    // Ошибка: equals считает объекты с одинаковым id равными,
    // а hashCode дополнительно учитывает name.
    override fun hashCode(): Int =
        31 * id + name.hashCode()
}

val alice = BrokenUser(id = 1, name = "Alice")
val renamed = BrokenUser(id = 1, name = "Alicia")

check(alice == renamed)
check(alice.hashCode() != renamed.hashCode()) // контракт нарушен

val users = hashSetOf(alice)
check(renamed !in users) // HashSet ищет в другом bucket
```

Если поле участвует в `equals`, оно должно согласованно участвовать и в `hashCode`. Обычно оба метода строят по одному набору immutable state.

### Пример 4. Mutable-ключ теряется после изменения

Нельзя менять поля, участвующие в `equals/hashCode`, пока объект является ключом `HashMap` или элементом `HashSet`: коллекция может перестать его находить.

```kotlin
data class MutableKey(
    var id: Int,
)

val key = MutableKey(1)
val values = hashMapOf(key to "stored")

check(values[key] == "stored")

key.id = 2 // изменились equals и hashCode уже добавленного ключа

check(values[key] == null)
check(values.keys.first() === key) // объект физически всё ещё внутри map
```

`HashMap` сохранил ключ в bucket, вычисленный для `id = 1`, а после изменения ищет его по hash для `id = 2`. Поэтому ключи hash-коллекций должны быть immutable по полям, участвующим в равенстве.

Практический шаблон ручной реализации:

```kotlin
class ProductKey(
    private val shopId: Long,
    private val sku: String,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ProductKey) return false

        return shopId == other.shopId && sku == other.sku
    }

    override fun hashCode(): Int {
        var result = shopId.hashCode()
        result = 31 * result + sku.hashCode()
        return result
    }
}
```

Здесь identity-проверка — быстрый путь, type check защищает симметрию, а оба метода используют одинаковые поля `shopId` и `sku`.

## 4.3. Как работает destructuring?

```kotlin
val (name, age) = user
```

Это синтаксический сахар для вызовов `component1()`, `component2()`. Такие функции генерируются у data class и могут быть операторными функциями пользовательского типа.

Destructuring не обращается к свойствам по имени, поэтому перестановка параметров data class способна тихо изменить смысл кода.

---

# 5. Функции, лямбды и extensions

Функции в Kotlin являются не только членами классов: они могут быть top-level, локальными, extension и значениями function type. Это уменьшает потребность в utility-классах и однострочных интерфейсах, но важно отличать обычный виртуальный вызов member от статически разрешаемого extension.

Лямбда в исходном коде не обязательно означает отдельную аллокацию при каждом вызове. Незахватывающий экземпляр может переиспользоваться, inline-лямбда — исчезнуть после подстановки, а захватывающая лямбда обычно хранит captured values в полях сгенерированного объекта. Конкретный результат зависит от compiler target, D8/R8 и оптимизации release-сборки.

Публичный `inline` имеет архитектурную цену: его тело копируется в bytecode клиента. Исправление внутри библиотечной inline-функции не попадёт в уже собранное приложение без перекомпиляции. Кроме того, такое тело не может обращаться к private API; `@PublishedApi internal` открывает доступ компилятору, но фактически добавляет декларацию в бинарный контракт библиотеки.

## 5.1. Функция высшего порядка

Это функция, которая принимает функцию как параметр или возвращает её.

```kotlin
fun retry(times: Int, block: () -> Unit) {
    repeat(times) { block() }
}
```

Цена может включать объект лямбды и виртуальный вызов, но `inline` часто устраняет эти расходы.

## 5.2. Closure и захват переменных

Лямбда может захватывать значения из внешней области. Захват изменяемой локальной переменной на JVM может потребовать wrapper-объект. Долгоживущая лямбда также удерживает захваченные объекты и способна вызвать Android memory leak, например при захвате `Activity`.

## 5.3. Что делает `inline`?

Компилятор подставляет тело функции и inline-лямбд в место вызова. Это:

- уменьшает overhead объектов лямбд и вызовов;
- разрешает non-local return из inline-лямбды;
- позволяет использовать `reified` type parameters.

Минусы:

- рост bytecode;
- возможное ухудшение instruction cache;
- не гарантирует полного отсутствия аллокаций;
- бессмысленен для многих больших функций без functional-параметров.

## 5.4. `noinline` и `crossinline`

- `noinline` запрещает встраивание конкретной лямбды: её можно сохранить или передать как значение.
- `crossinline` разрешает встраивание, но запрещает non-local `return`, когда лямбда вызывается не напрямую, например внутри другого callback.

## 5.5. Что такое non-local return?

Из лямбды, переданной inline-функции, простой `return` может завершить внешнюю именованную функцию. Локальный возврат записывается с label:

```kotlin
fun printValid(items: List<String>) {
    items.forEach {
        if (it.isBlank()) return@forEach
        println(it)
    }
}
```

## 5.6. `reified` type parameter

Из-за JVM type erasure обычный `T` недоступен как конкретный runtime-тип. `reified` в `inline`-функции подставляет тип в call site:

```kotlin
inline fun <reified T> Any?.castOrNull(): T? = this as? T
```

Это не отменяет erasure вложенных generic-аргументов: проверка `value is List<String>` по-прежнему ненадёжна.

## 5.7. Как разрешаются extension-функции?

Extensions не изменяют класс и разрешаются **статически** по compile-time типу receiver.

```kotlin
open class Parent
class Child : Parent()

fun Parent.label() = "parent"
fun Child.label() = "child"

val x: Parent = Child()
println(x.label()) // parent
```

Member с подходящей сигнатурой имеет приоритет над extension. Extensions могут иметь nullable receiver.

## 5.8. Function type with receiver

Тип `HtmlBuilder.() -> Unit` даёт лямбде implicit receiver и позволяет обращаться к его членам без квалификатора. Это основа type-safe DSL и многих Compose API.

Несколько receiver могут создавать неоднозначность; `@DslMarker` ограничивает неявный доступ к внешним receiver.

## 5.9. `infix`, `operator`, `tailrec`

### `infix`

`infix` разрешает вызывать member или extension-функцию с одним параметром без точки и скобок:

```kotlin
data class Header(
    val name: String,
    val value: String,
)

infix fun String.withValue(value: String): Header =
    Header(name = this, value = value)

val authorization =
    "Authorization" withValue "Bearer token"

// Эквивалентный обычный вызов:
val contentType =
    "Content-Type".withValue("application/json")
```

Infix-функция должна:

- быть member или extension;
- иметь ровно один обязательный value parameter;
- не использовать для него `vararg`;
- не задавать ему default value.

Стандартная функция `to` тоже является infix:

```kotlin
val entry: Pair<String, Int> = "retryCount" to 3
val map = mapOf(
    "connectTimeout" to 5_000,
    "readTimeout" to 15_000,
)
```

У infix-вызовов собственные правила приоритета. Они имеют меньший приоритет, чем арифметические операторы, range и casts, поэтому сложное выражение лучше группировать явно:

```kotlin
val shifted = 1 shl (2 + 1)
val range = 0 until (10 * 2)
```

`infix` полезен, если выражение читается как естественная бинарная операция. Использовать его только ради «DSL-похожего» синтаксиса не стоит: обычный именованный вызов часто яснее.

### `operator`

`operator` связывает функцию с предусмотренным языком операторным синтаксисом. Имя и сигнатура должны соответствовать конкретному соглашению Kotlin:

```kotlin
data class Vector2(
    val x: Int,
    val y: Int,
) {
    operator fun plus(other: Vector2): Vector2 =
        Vector2(
            x = x + other.x,
            y = y + other.y,
        )

    operator fun unaryMinus(): Vector2 =
        Vector2(x = -x, y = -y)

    operator fun get(index: Int): Int = when (index) {
        0 -> x
        1 -> y
        else -> throw IndexOutOfBoundsException("index=$index")
    }
}

val first = Vector2(10, 20)
val second = Vector2(3, 4)

val sum = first + second // first.plus(second)
val inverted = -first   // first.unaryMinus()
val x = first[0]        // first.get(0)
```

`contains` управляет оператором `in`:

```kotlin
data class ClosedInterval(
    val start: Int,
    val endInclusive: Int,
) {
    init {
        require(start <= endInclusive)
    }

    operator fun contains(value: Int): Boolean =
        value in start..endInclusive
}

val supported = ClosedInterval(21, 35)

check(30 in supported)  // supported.contains(30)
check(18 !in supported) // !supported.contains(18)
```

Другие частые conventions:

- `compareTo` — `<`, `<=`, `>`, `>=`;
- `get` / `set` — `value[index]`;
- `invoke` — вызов объекта как функции: `value()`;
- `iterator` — участие в `for`;
- `inc` / `dec` — `++` и `--`;
- `rangeTo` — оператор `..`.

Оператор должен сохранять ожидаемый смысл. Например, `plus` для двух денежных значений естественен, а `plus` для запуска сетевого запроса скрывает side effect и делает API обманчивым.

### `tailrec`

`tailrec` просит компилятор преобразовать хвостовую рекурсию в цикл. Это позволяет сохранить рекурсивную форму исходного кода без роста call stack:

```kotlin
tailrec fun gcd(a: Int, b: Int): Int =
    if (b == 0) {
        kotlin.math.abs(a)
    } else {
        gcd(b, a % b)
    }

check(gcd(48, 18) == 6)
```

Вызов `gcd(...)` является последней операцией ветки: после возврата его результата функция больше ничего не вычисляет.

Факториал становится tail-recursive через accumulator:

```kotlin
fun factorial(number: Int): Long {
    require(number >= 0)

    tailrec fun loop(
        current: Int,
        accumulator: Long,
    ): Long =
        if (current <= 1) {
            accumulator
        } else {
            loop(
                current = current - 1,
                accumulator = Math.multiplyExact(
                    accumulator,
                    current.toLong(),
                ),
            )
        }

    return loop(
        current = number,
        accumulator = 1,
    )
}

check(factorial(5) == 120L)
```

Этот вариант не является хвостовой рекурсией:

```kotlin
fun factorialNotTailRecursive(number: Int): Long =
    if (number <= 1) {
        1
    } else {
        number.toLong() * factorialNotTailRecursive(number - 1)
    }
```

После рекурсивного вызова ещё нужно выполнить умножение, поэтому стек предыдущих вызовов должен сохраняться. Добавление `tailrec` не сделает произвольную рекурсию хвостовой: компилятор выдаст предупреждение и не применит оптимизацию к такому call site.

Tail recursion также не получается, если нужно объединить результаты нескольких рекурсивных вызовов, как при обычном обходе бинарного дерева:

```kotlin
data class Node(
    val left: Node? = null,
    val right: Node? = null,
)

fun size(node: Node?): Int =
    if (node == null) {
        0
    } else {
        1 + size(node.left) + size(node.right)
    }
```

Здесь после обоих вызовов выполняется сложение. Для очень глубокого дерева безопаснее явный stack/queue. `open`-функции и рекурсивные вызовы внутри `try`/`catch`/`finally` также могут не оптимизироваться, поэтому отсутствие stack growth следует подтверждать условиями tail-call и, при необходимости, bytecode.

---

# 6. Scope functions

Все пять scope functions состоят из двух независимых решений: как receiver доступен внутри блока (`this` или `it`) и что возвращается из вызова (receiver или результат лямбды). Они не добавляют новую runtime-семантику: `apply` не делает настройку атомарной, `also` не гарантирует «только логирование», а `let` не является специальным оператором null safety.

Стандартные scope functions являются inline и снабжены известными компилятору contracts о вызове лямбды. Поэтому компилятор лучше понимает definite assignment и control flow. Самописная внешне похожая функция без корректного contract может вести себя иначе с точки зрения smart cast и анализа инициализации.

Отдельная ловушка — потеря информации в nullable chain. `receiver?.run { nullableResult() }` вернёт `null` и когда receiver отсутствует, и когда блок сознательно вернул `null`. Если эти случаи имеют разный бизнес-смысл, компактная цепочка неверно моделирует состояние; нужна явная ветка или отдельный result type.

## 6.1. Разница между `let`, `run`, `with`, `apply`, `also`

- `let`: receiver как `it`, возвращает результат лямбды.
- `run`: receiver как `this`, возвращает результат лямбды.
- `with(x)`: не extension; `x` как `this`, возвращает результат.
- `apply`: receiver как `this`, возвращает сам receiver.
- `also`: receiver как `it`, возвращает сам receiver.

Практический выбор:

- преобразование/nullable chain — `let`;
- вычисление в контексте объекта — `run`;
- настройка объекта — `apply`;
- побочное действие без изменения цепочки — `also`.

Scope functions не выражают архитектуру сами по себе. Длинные цепочки и вложенные `this/it` хуже простого последовательного кода.

## 6.2. Опасен ли `let` для null check?

Не сам по себе. Проблемы возникают, когда:

- `it` имеет неясный смысл;
- вложены несколько scope functions;
- побочные эффекты скрыты в expression chain;
- nullable-логика становится труднее читать.

Критерий — ясность, а не запрет конкретной функции.

---

# 7. Generics и variance

Generics позволяют описать алгоритм один раз и сохранить типобезопасность, но JVM в основном стирает аргументы типов во время выполнения. Компилятор проверяет операции в исходном коде, генерирует casts и при необходимости synthetic bridge methods. Из-за этого ошибка, внесённая через raw Java type или reflection, может проявиться как `ClassCastException` позже — при чтении элемента или внутри сгенерированного bridge.

Variance отвечает не на вопрос «каким типом является контейнер», а на вопрос «какие операции с ним безопасны». Если тип только производит `T`, его можно рассматривать ковариантно; если только принимает — контравариантно. Mutable-контейнер одновременно читает и пишет, поэтому обычно остаётся инвариантным.

Проекция `MutableList<out Animal>` создаёт captured type: точный элемент неизвестен, но является некоторым подтипом `Animal`. Читать безопасно как `Animal`, записывать нельзя — список может фактически быть `MutableList<Dog>`. Ограничение существует на compile-time view; сам объект коллекции в runtime не превращается в read-only.

## 7.1. Почему `MutableList<Dog>` не является `MutableList<Animal>`?

Представим простую иерархию:

```kotlin
open class Animal(
    val name: String,
)

class Dog(name: String) : Animal(name)
class Cat(name: String) : Animal(name)
```

`Dog` является `Animal`, но из этого не следует, что `MutableList<Dog>` является `MutableList<Animal>`. Mutable-список умеет не только отдавать, но и принимать элементы:

```kotlin
val dogs: MutableList<Dog> =
    mutableListOf(Dog("Rex"))

// Не компилируется:
val animals: MutableList<Animal> = dogs
```

Если бы присваивание разрешили, через ссылку `animals` можно было бы добавить кошку в настоящий список собак:

```kotlin
// Гипотетический небезопасный код:
val animals: MutableList<Animal> = dogs
animals.add(Cat("Barsik"))

// dogs теперь содержал бы Cat, хотя обещает хранить только Dog.
val dog: Dog = dogs[1]
```

Поэтому `MutableList<T>` инвариантен: `MutableList<Dog>` и `MutableList<Animal>` считаются разными несовместимыми типами.

Это видно и при передаче аргумента в функцию:

```kotlin
fun addCat(animals: MutableList<Animal>) {
    animals += Cat("Barsik")
}

val dogs = mutableListOf(Dog("Rex"))

// Не компилируется, иначе addCat добавила бы Cat в список Dog:
addCat(dogs)
```

Но прочитать собак как животных безопасно. Read-only интерфейс `List` не позволяет добавить через эту ссылку новый элемент, поэтому он ковариантен:

```kotlin
val dogs: MutableList<Dog> =
    mutableListOf(Dog("Rex"), Dog("Lucky"))

val animals: List<Animal> = dogs // работает

for (animal in animals) {
    println(animal.name)
}
```

`List` в Kotlin означает read-only view, а не гарантированно immutable объект: исходный `dogs` всё ещё можно изменить через mutable-ссылку. Однако через `animals` нельзя записать `Cat`, поэтому такое преобразование типобезопасно.

Коротко:

- только читать `T` — преобразование к более общему типу может быть безопасно;
- читать и записывать `T` — тип обычно должен оставаться инвариантным.

## 7.2. `out` и `in`

Самая простая мнемоника:

- `out T` — объект **отдаёт** значения типа `T`;
- `in T` — объект **принимает** значения типа `T`.

### `out`: производитель значений

```kotlin
interface Producer<out T> {
    fun produce(): T
}

class DogProducer : Producer<Dog> {
    override fun produce(): Dog =
        Dog("Rex")
}
```

Producer собак можно использовать там, где нужен producer животных: всё, что он вернёт, точно является `Animal`.

```kotlin
val dogProducer: Producer<Dog> = DogProducer()
val animalProducer: Producer<Animal> = dogProducer

val animal: Animal = animalProducer.produce()
```

Ключевое слово `out` разрешает `T` в позициях результата, но запрещает небезопасный приём `T`:

```kotlin
interface Producer<out T> {
    fun produce(): T

    // Не компилируется: T объявлен как out,
    // но используется во входном параметре.
    // fun consume(value: T)
}
```

Иначе после присваивания `Producer<Dog>` к `Producer<Animal>` кто-то мог бы передать в него `Cat`.

Практический стандартный пример — `List<out E>`:

```kotlin
fun printAnimals(animals: List<Animal>) {
    animals.forEach { println(it.name) }
}

val dogs: List<Dog> = listOf(
    Dog("Rex"),
    Dog("Lucky"),
)

printAnimals(dogs)
```

### `in`: потребитель значений

```kotlin
fun interface Consumer<in T> {
    fun consume(value: T)
}

class AnimalLogger : Consumer<Animal> {
    override fun consume(value: Animal) {
        println("Animal: ${value.name}")
    }
}
```

Consumer любых животных можно использовать как consumer собак: если объект умеет принять любой `Animal`, то `Dog` он тоже примет.

```kotlin
val animalConsumer: Consumer<Animal> = AnimalLogger()
val dogConsumer: Consumer<Dog> = animalConsumer

dogConsumer.consume(Dog("Rex"))
```

Направление присваивания выглядит обратным по сравнению с наследованием:

```kotlin
// Animal — supertype для Dog,
// но Consumer<Animal> является subtype для Consumer<Dog>.
val dogConsumer: Consumer<Dog> =
    Consumer<Animal> { animal ->
        println(animal.name)
    }
```

Из `Consumer<in T>` нельзя безопасно получить `T`: реальный объект может быть consumer более общего типа. Результат чтения без дополнительных знаний доступен только как `Any?`.

Практический пример — `Comparator<in T>`:

```kotlin
val animalComparator: Comparator<Animal> =
    compareBy { it.name }

val dogs = listOf(
    Dog("Rex"),
    Dog("Lucky"),
)

val sortedDogs: List<Dog> =
    dogs.sortedWith(animalComparator)
```

Comparator, умеющий сравнивать любых животных, подходит и для списка собак.

Итоговая таблица в словах:

- `Producer<Dog>` → `Producer<Animal>` благодаря `out`;
- `Consumer<Animal>` → `Consumer<Dog>` благодаря `in`;
- mutable-контейнер одновременно producer и consumer, поэтому обычно не может быть ни `out`, ни `in`.

Java-мнемоника PECS выражает ту же идею: Producer Extends, Consumer Super. В Kotlin ей соответствуют `out` и `in`.

## 7.3. Declaration-site и use-site variance

Разница заключается в том, **где** задаётся правило variance:

- declaration-site — один раз в объявлении generic-типа;
- use-site — только для конкретного параметра, переменной или вызова.

### Declaration-site variance

Автор generic-типа заранее знает, что тот всегда производит или всегда потребляет `T`, и ставит `out`/`in` у параметра типа:

```kotlin
interface Source<out T> {
    fun next(): T
}

fun interface Sink<in T> {
    fun accept(value: T)
}
```

Правило действует при каждом использовании этих интерфейсов:

```kotlin
class DogSource : Source<Dog> {
    override fun next(): Dog =
        Dog("Rex")
}

class AnimalSink : Sink<Animal> {
    override fun accept(value: Animal) {
        println(value.name)
    }
}

val animalSource: Source<Animal> = DogSource()
val dogSink: Sink<Dog> = AnimalSink()

val animal: Animal = animalSource.next()
dogSink.accept(Dog("Lucky"))
```

`Source` всегда только отдаёт `T`, поэтому variance удобно объявить внутри самого API. Всем вызывающим не нужно повторять `out`.

### Use-site variance

Иногда generic-класс по своей природе инвариантен, потому что умеет и читать, и писать. Например, `Array<T>` содержит `get` и `set`. Но конкретной функции может требоваться только часть этих возможностей.

Use-site projection временно ограничивает доступные операции для одной ссылки:

```kotlin
fun printAnimals(
    animals: MutableList<out Animal>,
) {
    val first: Animal = animals.first() // читать безопасно
    println(first.name)

    // Не компилируется: реальный список может быть MutableList<Dog>,
    // поэтому добавлять произвольного Animal нельзя.
    // animals.add(Cat("Barsik"))
}

val dogs = mutableListOf(
    Dog("Rex"),
    Dog("Lucky"),
)

printAnimals(dogs)
```

`MutableList<out Animal>` означает: «это список некоторого неизвестного подтипа `Animal`». Читать элементы можно как `Animal`, а записывать нельзя, потому что точный тип элемента неизвестен.

Проекция `in` решает обратную задачу:

```kotlin
fun addDefaultDog(
    destination: MutableList<in Dog>,
) {
    destination.add(Dog("Default")) // Dog записывать безопасно

    // При чтении точный тип неизвестен: это может быть список Animal или Any.
    val first: Any? = destination.firstOrNull()
    println(first)
}

val animals = mutableListOf<Animal>(
    Cat("Barsik"),
)

addDefaultDog(animals)
```

`MutableList<in Dog>` означает: «список `Dog` либо какого-то supertype для `Dog`». В него безопасно добавить собаку, но прочитать значение как `Dog` нельзя.

### Пример копирования массивов

`Array<T>` инвариантен, однако функция копирования использует исходный массив только как producer, а целевой — только как consumer:

```kotlin
fun <T> copy(
    from: Array<out T>,
    to: Array<in T>,
) {
    require(to.size >= from.size)

    for (index in from.indices) {
        to[index] = from[index]
    }
}

val dogs: Array<Dog> = arrayOf(
    Dog("Rex"),
    Dog("Lucky"),
)

val animals: Array<Animal?> =
    arrayOfNulls(size = dogs.size)

copy(
    from = dogs,
    to = animals,
)
```

Здесь:

- `Array<out T>` разрешает получать `T`, но запрещает запись;
- `Array<in T>` разрешает записывать `T`, но чтение даёт только `Any?`;
- один и тот же `T` связывает тип источника и назначения.

Проекция меняет только compile-time view ссылки. Сам `MutableList` или `Array` не преобразуется в новый объект и не становится immutable в runtime.

Практическое правило:

- тип всегда producer/consumer — variance обычно задаётся на declaration-site;
- ограничение нужно одной функции — используйте use-site projection;
- тип одновременно полноценно читает и пишет `T` — оставляйте его инвариантным.

## 7.4. Что такое star projection `Foo<*>`?

Это безопасный способ работать с generic-типом, аргумент которого неизвестен. Это не то же самое, что `Foo<Any?>`: возможности чтения и записи определяются variance и границами параметра.

Например, из `List<*>` можно безопасно читать `Any?`, но нельзя добавлять произвольные значения.

## 7.5. Type erasure на JVM

В runtime обычно известно, что объект является `List`, но не известно, `List<String>` это или `List<Int>`. Следствия:

- нельзя проверить `x is List<String>`;
- unsafe cast может упасть позже при чтении элемента;
- перегрузки, различающиеся только generic-аргументом, конфликтуют по JVM signature;
- иногда нужны `reified`, `Class<T>`, `KClass<T>` или type token.

## 7.6. Ограничения generic-параметров

```kotlin
fun <T> save(value: T)
    where T : Entity, T : Serializable {
    // ...
}
```

Ограничение здесь одно: среди верхних границ **не более одной может быть классом**, остальные — интерфейсы. Порядок в `where` при этом значения не имеет (в Java правило про «первый — класс» есть, в Kotlin — нет; это удобный вопрос на отличие). По умолчанию верхняя граница — `Any?`; запись `<T : Any>` запрещает nullable-аргумент.

---

# 8. Коллекции и последовательности

Kotlin разделяет API коллекции на read-only и mutable, но не вводит встроенной гарантии глубокого immutable-объекта. Один и тот же `ArrayList` может одновременно быть доступен через `List` одному компоненту и через `MutableList` другому. Поэтому безопасность зависит от владения: кто имеет mutable-ссылку, где создаётся defensive copy и можно ли состояние публиковать между потоками.

Большинство цепочек `Iterable` выполняется eager: каждая промежуточная операция полностью создаёт результат. `Sequence` меняет порядок выполнения на element-by-element и может завершить обработку раньше, но не отменяет внутреннее состояние операторов. `sorted` должен полностью собрать вход, а `distinct` хранит множество увиденных элементов; lazy start не означает O(1) памяти.

Persistent collections используют structural sharing: новая версия переиспользует неизменившиеся части старой. Это даёт устойчивые snapshots без полного копирования и удобно для reducer/UI state, но всё равно создаёт служебные узлы. Выбор между обычным copy и persistent-структурой зависит от размера данных, частоты обновлений и профиля памяти.

## 8.1. Read-only коллекция — это immutable коллекция?

Нет. `List<T>` не предоставляет mutating API, но underlying объект может быть изменяемым:

```kotlin
val mutable = mutableListOf(1)
val readOnly: List<Int> = mutable
mutable += 2
println(readOnly) // [1, 2]
```

Для строгой неизменяемости нужны defensive copy, immutable domain model или persistent immutable collections.

## 8.2. `List`, `Set`, `Map` и их обычная сложность

Типичные JVM-реализации:

- `ArrayList`: доступ по индексу O(1), вставка в середину O(n);
- `LinkedHashSet`: поиск в среднем O(1), сохраняет порядок вставки;
- `HashMap`/`LinkedHashMap`: поиск в среднем O(1), зависит от корректного hash;
- сортировка обычно O(n log n).

Это характеристики реализации, а не безусловная гарантия любого интерфейса.

## 8.3. `Iterable` против `Sequence`

Операции над обычными коллекциями eager и часто создают промежуточные коллекции. `Sequence` выполняет цепочку лениво, по одному элементу.

`Sequence` полезен:

- для длинных цепочек;
- больших наборов;
- early termination (`first`, `take`);
- потенциально бесконечных данных.

Он может быть медленнее на маленьких коллекциях из-за overhead итераторов и вызовов. Всегда измеряйте критичные пути.

## 8.4. Sequence, Flow и Stream

- `Sequence` — синхронная pull-модель, обычно в одном потоке.
- Java `Stream` — одноразовый pipeline с собственной JVM API и возможным parallel mode.
- `Flow` — асинхронный cold stream с suspend/backpressure через корутины.

`Sequence` не следует использовать для suspend-операций.

## 8.5. `map`, `flatMap`, `flatten`, `mapNotNull`

- `map`: один вход → один выход.
- `flatMap`: один вход → коллекция/поток выходов, затем flatten.
- `flatten`: убирает один уровень вложенности.
- `mapNotNull`: преобразует и отбрасывает `null`.

Для `Flow` варианты `flatMapConcat`, `flatMapMerge`, `flatMapLatest` различаются порядком, конкурентностью и отменой предыдущей работы.

## 8.6. Массивы и примитивные массивы

`Array<Int>` на JVM обычно содержит boxed `Integer`, а `IntArray` — примитивный `int[]`. Для больших массивов и hot path примитивные варианты экономят память и boxing.

`Array<T>` инвариантен. Для сравнения содержимого используются `contentEquals` и `contentDeepEquals`.

---

# 9. Делегирование и свойства

Property delegation — компиляторный протокол, а не особый вид поля. Выражение `val value by delegate` связывается с `getValue(thisRef, property)`, `var` дополнительно использует `setValue`, а `provideDelegate` может проверить или заменить делегат в момент создания владельца. Объект `KProperty` передаёт имя и metadata свойства.

Удобный синтаксис может скрывать нетривиальный lifecycle и thread-safety. `observable`, `vetoable` и большинство пользовательских делегатов не делают read-modify-write атомарным. Android-делегат View Binding обязан учитывать, что Fragment переживает свою View, и очистить ссылку в `onDestroyView`, иначе будет удерживаться уничтоженная иерархия и её `Context`.

Делегирование интерфейса через `by` генерирует forwarding, но не создаёт полноценный decorator interception. Когда сам delegate внутри своего метода вызывает другой собственный метод, вызов обычно остаётся внутри delegate и не проходит через override обёртки. Это важно при попытке добавить логирование, кеш или проверку доступа «ко всем вызовам».

## 9.1. Делегирование класса через `by`

```kotlin
class LoggingRepository(
    private val delegate: Repository
) : Repository by delegate
```

Компилятор генерирует forwarding-методы. Это удобная композиция, но методы делегата, вызывающие свои собственные методы, не проходят динамически через overrides класса-обёртки.

## 9.2. Делегированные свойства

Синтаксис `val x by delegate` преобразуется в вызовы `getValue`, а для `var` ещё и `setValue`.

Стандартные делегаты:

- `lazy`;
- `observable` / `vetoable`;
- значение из `Map`;
- собственные lifecycle-aware или DI-делегаты.

Нужно учитывать аллокации, reflection metadata `KProperty` и скрытые побочные эффекты.

## 9.3. `lazy` и его режимы

- `SYNCHRONIZED` — по умолчанию, один вычисляющий поток и безопасная публикация.
- `PUBLICATION` — initializer может выполниться несколько раз конкурентно, опубликовано будет одно значение.
- `NONE` — без синхронизации; корректен только при гарантированном доступе из одного потока.

На Android `NONE` допустим лишь при доказанном thread confinement, а не просто потому, что «обычно это main thread».

## 9.4. `lateinit` против nullable и `lazy`

`lateinit var`:

- только изменяемое non-null свойство подходящего непримитивного типа;
- инициализируется после создания объекта;
- чтение до инициализации вызывает `UninitializedPropertyAccessException`;
- состояние можно проверить через `::property.isInitialized` в доступной области.

`lazy val` вычисляется при первом чтении и не переназначается. Nullable-свойство корректнее, если «значения пока нет» — нормальное состояние доменной модели.

## 9.5. Backing field и custom accessor

Ключевое слово `field` доступно внутри accessor, если свойству нужно хранилище.

```kotlin
var name: String = ""
    set(value) {
        field = value.trim()
    }
```

Свойство только с вычисляемым getter backing field не имеет.

---

# 10. Исключения, Result и контракты

Kotlin рассматривает исключение как нелокальный выход из вычисления, а `try` — как expression. Результат `finally` игнорируется, но исключение из `finally` заменит исходную ошибку. При закрытии ресурсов `use` предпочтительнее ручного `finally`: если и основная операция, и `close` завершились ошибкой, исходная сохраняется, а вторичная может быть добавлена как suppressed exception.

Важно разделять три категории: нарушение программного инварианта, ожидаемый доменный исход и технический отказ. Первая обычно выражается `require/check` или исключением, вторая — nullable/sealed-моделью, третья — exception либо `Result` на осознанной границе. Если всё завернуть в общий `Result`, вызывающий код теряет различие между «неверный пароль», «нет сети» и `NullPointerException` из-за бага.

Операторы `Result` имеют разную политику. `map` преобразует success, а исключение из transform не предназначено для безусловного поглощения; `mapCatching` упаковывает его. Аналогично различаются `recover` и `recoverCatching`. Catching-варианты нельзя применять вокруг произвольного кода, если programming errors должны завершать операцию, а не становиться штатным failure.

## 10.1. Checked exceptions в Kotlin

Kotlin не заставляет объявлять или ловить checked exceptions. Java-методы с checked exception вызываются без обязательного `try/catch`.

Для Java caller аннотация `@Throws(IOException::class)` добавляет соответствующую декларацию в JVM signature.

## 10.2. `require`, `check`, `error`

- `require(condition)` — нарушение требования к аргументу, бросает `IllegalArgumentException`.
- `check(condition)` — неверное состояние объекта, бросает `IllegalStateException`.
- `error(message)` — всегда бросает `IllegalStateException` и возвращает `Nothing`.

Они выражают programming error, а не обычный бизнес-сценарий.

## 10.3. Когда использовать `Result<T>`?

`Result<T>` удобен для явной упаковки успеха/ошибки, `runCatching`, `map`, `recover`. Но:

- не следует бездумно ловить все `Throwable`;
- `CancellationException` в coroutine-коде обычно нужно пробрасывать;
- для ожидаемых бизнес-исходов sealed ADT часто выразительнее;
- stack trace и контекст ошибки должны сохраняться.

```kotlin
suspend fun load(): Result<Data> = try {
    Result.success(api.load())
} catch (e: CancellationException) {
    throw e
} catch (e: IOException) {
    Result.failure(e)
}
```

## 10.4. Что такое contracts?

Contracts сообщают компилятору дополнительные факты о функции: например, «если функция вернула `true`, аргумент не `null`» или «лямбда вызывается ровно один раз». Это улучшает smart casts и анализ.

API контрактов требует осторожности и opt-in в тех частях, которые остаются experimental. Неверный контракт обманывает компилятор и может сделать код небезопасным.

---

# 11. Java/JVM interop

Interop нужно проектировать в обе стороны. Kotlin делает Java API удобнее с помощью synthetic properties, SAM conversion и platform types, но Java caller видит JVM signature, а не исходную Kotlin-декларацию. Properties становятся методами, `suspend` получает `Continuation`, function type выглядит как `FunctionN`, а default arguments реализуются синтетическими методами и битовыми масками.

Nullability — ключевая граница. Если Java API не содержит распознанных аннотаций, Kotlin не может доказать контракт и создаёт platform type. Публичный Kotlin-слой должен нормализовать его в явно nullable или non-null тип. Иначе потенциально небезопасное значение проходит через несколько слоёв как будто типобезопасное, а NPE возникает далеко от источника.

Source compatibility и binary compatibility различаются. Добавление параметра с default позволяет перекомпилированному Kotlin-коду не менять call site, но уже собранный bytecode может ожидать старую JVM signature. Для библиотек также важны режим default-методов интерфейсов, inline API, `const val`, mangling value class и wildcards. Публичный API следует проверять инструментами binary compatibility, а не только компиляцией текущего приложения.

## 11.1. Как default arguments видны из Java?

Java не поддерживает Kotlin default arguments напрямую. `@JvmOverloads` генерирует несколько overload, последовательно убирая параметры с конца. Для сложного API лучше явные overload/factory/builder.

## 11.2. Основные JVM-аннотации

- `@JvmStatic` — static bridge для члена object/companion.
- `@JvmField` — открывает поле без getter/setter там, где допустимо.
- `@JvmOverloads` — overload для default arguments.
- `@JvmName` — меняет JVM-имя, помогает при signature clash.
- `@Throws` — декларирует exceptions для Java.
- `@JvmSuppressWildcards` / `@JvmWildcard` — управляют wildcard в Java-signature.

Использовать их стоит для осознанного публичного Java API, а не автоматически.

## 11.3. SAM conversion и `fun interface`

Лямбду можно передать вместо Java SAM-интерфейса или Kotlin `fun interface`.

```kotlin
fun interface ClickListener {
    fun onClick(id: Long)
}
```

Обычный function type удобнее внутри Kotlin. `fun interface` полезен для Java interop, именованного контракта, документации и возможности иметь дополнительные non-abstract методы.

## 11.4. Где возникает boxing?

На JVM есть две разные формы представления числовых и некоторых других значений:

- primitive: `int`, `long`, `double`, `boolean` и другие — само значение без объектной идентичности;
- reference wrapper: `java.lang.Integer`, `Long`, `Double`, `Boolean` и другие — объект или ссылка на объект.

**Boxing** — переход от primitive к wrapper, например из JVM `int` в `Integer`. **Unboxing** — обратное извлечение primitive из wrapper. В исходном Kotlin эти преобразования чаще всего не записаны явно: компилятор вставляет их там, где этого требует JVM-представление.

Упрощённо сгенерированный bytecode ведёт себя так:

```kotlin
val boxed: Int? = 42
val raw: Int = boxed
```

```java
Integer boxed = Integer.valueOf(42); // boxing
int raw = boxed.intValue();          // unboxing
```

Boxing нужен не для ускорения, а для представления primitive там, где JVM ожидает ссылку на объект. Wrapper, в частности, позволяет хранить `null`, передавать значение как `Object` и использовать его в API, построенном на Java generics.

Частые случаи boxing:

- nullable-тип: `Int?`, когда значению действительно требуется nullable JVM-представление;
- generic-контекст: `List<Int>`, `Map<Long, Boolean>`, `Array<Int>` или вызов `fun <T> identity(value: T): T`;
- передача primitive как `Any`, `Any?` или как интерфейса;
- generic function type, например `(Int) -> Unit`: вызов через `Function1<P1, R>` имеет объектные generic-параметры;
- reflection и Java API, принимающие `Object`;
- value class в nullable/generic/interface-контексте или при использовании как другого типа.

Пример generic-границы:

```kotlin
fun <T> identity(value: T): T = value

val answer: Int = identity(42)
```

После type erasure JVM-сигнатура `identity` принимает и возвращает `Object`, поэтому `42` упаковывается в `Integer`, а результат распаковывается обратно в `int`.

Важно не смешивать boxing с любой аллокацией:

- `vararg values: Int` представляется как `IntArray` и не обязан боксить элементы;
- generic `vararg values: T` использует объектный массив, поэтому primitive на такой границе боксится;
- spread `*array` обычно создаёт копию массива, но эта аллокация сама по себе ещё не означает boxing;
- захватывающая lambda может создать объект для замыкания, однако boxing primitive зависит от сгенерированной сигнатуры и места использования.

Практическая разница хорошо видна у массивов:

```kotlin
val boxed: Array<Int> = arrayOf(1, 2, 3) // Integer[]
val primitive: IntArray = intArrayOf(1, 2, 3) // int[]
```

Wrapper требует ссылку и объектное представление, поэтому потенциальные последствия boxing:

- дополнительные аллокации и нагрузка на GC;
- больший расход памяти;
- дополнительный косвенный доступ по ссылке;
- худшая cache locality в больших коллекциях;
- дополнительная операция при unboxing.

`Integer.valueOf` и аналогичные методы могут переиспользовать закешированные wrapper-объекты для части значений, но полагаться на конкретный диапазон кеша и проверять boxed-значения через `===` нельзя. Сравнивать значения следует через `==`.

Unboxing nullable wrapper требует отдельной осторожности: если ссылка равна `null`, вызов вроде `intValue()` невозможен и приводит к NPE. Kotlin обычно защищает это своей системой типов, но риск возвращается на границах platform types, reflection и некорректно аннотированного Java API.

В performance-sensitive коде полезны специализированные представления: `IntArray` вместо `Array<Int>`/`List<Int>`, primitive state API в Compose и primitive-ориентированные структуры данных. Но менять читаемый API только из-за потенциального boxing не стоит: сначала нужно подтвердить проблему профилировщиком, allocation tracking или benchmark. Особенно это актуально для больших коллекций, tight loops, animation/layout hot path и часто вызываемого кода.

## 11.5. Что компилируется из top-level функций?

На JVM top-level declarations помещаются в сгенерированный file facade class, обычно с именем `<FileName>Kt`. `@file:JvmName` позволяет изменить имя, а multifile-аннотации — объединить facade нескольких файлов.

## 11.6. Видимость `internal`

`internal` означает видимость внутри Kotlin module на уровне компилятора. В JVM bytecode это не полноценная security boundary; имена некоторых членов могут быть mangled. Reflection или Java-код иногда способны обойти ограничение.

## 11.7. Почему overload по `List<String>` и `List<Int>` невозможен?

После type erasure обе функции имеют одинаковую JVM signature `method(List)`. Можно изменить дизайн API или применить `@JvmName` к подходящим декларациям.

---

# 12. Coroutines: фундамент

Coroutine — это вычисление, которое компилятор умеет разрезать в точках приостановки. Suspend-функция получает скрытый `Continuation`, а локальные значения, необходимые после suspension point, сохраняются в полях state machine. Возвращаемый JVM-тип фактически допускает обычный результат либо специальный маркер `COROUTINE_SUSPENDED`.

Приостановка экономит поток ожидания, но сама операция должна быть неблокирующей или вынесенной на подходящий dispatcher. Если внутри `suspend fun` вызвать блокирующий socket/file API на Main, поток всё равно заблокируется. Ключевое свойство `suspend` — возможность приостановки, а не автоматический background execution.

State machine влияет и на память: объект, записанный в локальную переменную до suspension point и нужный после неё, может удерживаться continuation до продолжения или завершения coroutine. Поэтому долгоживущие coroutine и бесконечные Flow способны удерживать крупный граф объектов даже без классической статической ссылки.

Structured concurrency формирует дерево `Job`. Это не только удобство отмены, а ownership model: родитель отвечает за завершение детей, ошибки распространяются по определённым правилам, а scope ограничивает lifetime. Создание отдельного `Job()` или внешнего scope внутри функции может незаметно разорвать дерево и превратить задачу в утечку.

## 12.1. Что делает `suspend`?

`suspend` означает, что функция может приостановиться без блокировки текущего потока и позже продолжиться. Это:

- не запускает функцию в фоне;
- не создаёт поток;
- не гарантирует переключение dispatcher;
- на JVM компилируется в state machine с `Continuation`.

## 12.2. Coroutine, thread и dispatcher

- coroutine — приостанавливаемая задача;
- thread — ресурс ОС, на котором выполняется код;
- dispatcher — определяет, где coroutine исполняется;
- `CoroutineContext` хранит dispatcher, `Job`, имя и другие элементы.

Много корутин могут поочерёдно исполняться на малом числе потоков.

## 12.3. Structured concurrency

Жизненный цикл дочерних задач ограничен scope родителя:

- родитель ждёт детей;
- отмена родителя отменяет детей;
- необработанная ошибка ребёнка обычно отменяет родителя и siblings;
- задача не должна бесконтрольно переживать владельца.

Поэтому `GlobalScope` почти всегда плох для прикладной Android-работы.

## 12.4. `launch` и `async`

- `launch` возвращает `Job`, предназначен для работы без результата; exception распространяется сразу по иерархии.
- `async` возвращает `Deferred<T>`; результат и exception наблюдаются через `await`.

`async` не следует использовать только ради «запуска в фоне». Параллелизм возникает, когда несколько задач стартуют до ожидания их результатов.

## 12.5. `coroutineScope` и `supervisorScope`

- `coroutineScope`: ошибка одного child отменяет остальные и scope.
- `supervisorScope`: ошибка одного child не отменяет siblings; каждую ошибку нужно обработать отдельно.

`SupervisorJob` меняет распространение ошибок от child к parent, но не превращает все вложенные уровни автоматически в supervisor.

## 12.6. Как работает отмена?

Отмена кооперативна:

- suspend-функции библиотеки проверяют cancellation;
- CPU loop должен вызывать `yield`, `ensureActive` или проверять `isActive`;
- блокирующий вызов сам по себе может не остановиться;
- `finally` выполняется при отмене;
- suspend в `finally` при уже отменённом context требует `withContext(NonCancellable)`, если завершение действительно обязательно.

Нельзя проглатывать `CancellationException`, иначе structured concurrency ломается.

## 12.7. `withContext`

Переключает/дополняет context, выполняет блок и возвращает результат. Типичный случай:

```kotlin
suspend fun readFile(): String = withContext(Dispatchers.IO) {
    file.readText()
}
```

Не нужно механически оборачивать каждый repository-вызов: хорошо спроектированная suspend-функция сама обеспечивает main safety для блокирующей работы.

## 12.8. Dispatcher-ы

- `Dispatchers.Main` — Android main thread.
- `Main.immediate` — выполняет сразу, если уже на main thread, иначе dispatch.
- `Default` — CPU-bound задачи.
- `IO` — блокирующий I/O; использует общий пул с Default и управляет параллелизмом иначе.
- `limitedParallelism(n)` — view dispatcher с ограничением параллельности.

Dispatcher выбирают по характеру работы, а не по слою архитектуры.

## 12.9. `CoroutineContext` и оператор `+`

Context — набор элементов с ключами. При сложении элемент справа заменяет элемент слева с тем же ключом. Новый `Job` может разорвать ожидаемую parent-child связь, поэтому бездумно подмешивать `Job()` опасно.

## 12.10. `CoroutineExceptionHandler`

Handler — последний обработчик необработанной ошибки root-coroutine. Он:

- не заменяет `try/catch`;
- не восстанавливает уже упавшую coroutine;
- обычно применим к root `launch`;
- не обрабатывает результат `async`, пока exception ожидается через `await`;
- не обрабатывает cancellation как обычную ошибку.

## 12.11. Почему `suspendCoroutine` опаснее `suspendCancellableCoroutine`?

При адаптации callback API обычно нужна поддержка отмены. `suspendCancellableCoroutine` позволяет:

- отменить внешнюю операцию через `invokeOnCancellation`;
- корректно разрешить гонку callback и cancellation;
- не продолжать отменённую coroutine.

Continuation нужно возобновить ровно один раз.

## 12.12. Mutex, atomic и thread confinement

- `Mutex` защищает suspend-критическую секцию без блокировки потока ожиданием.
- Atomic подходит для простых атомарных переходов.
- Thread confinement удерживает состояние на одном потоке/dispatcher.
- Обычный `synchronized` допустим для короткого non-suspending JVM-кода, но внутри lock нельзя выполнять suspend.

`@Volatile` гарантирует видимость отдельного чтения/записи, но не атомарность составной операции `counter++`.

---

# 13. Flow, StateFlow, SharedFlow и Channel

Flow описывает асинхронную последовательность и политику её обработки. Cold `Flow` — рецепт запуска, а не контейнер с уже готовыми данными: каждый collector создаёт новое выполнение upstream. Hot flow существует независимо от конкретного collector и требует явного владельца lifetime, replay/buffer policy и обработки ошибок.

Backpressure в Flow основан на suspension: по умолчанию producer не уходит далеко вперёд, пока downstream не обработал значение. `buffer` создаёт границу между coroutines, `conflate` меняет гарантию доставки, а `collectLatest` отменяет работу consumer. Это не просто performance-настройки — они меняют бизнес-семантику.

`MutableStateFlow.update` выполняет атомарный CAS-цикл. При конкуренции lambda может быть вычислена несколько раз, поэтому внутри неё нельзя выполнять сетевой запрос, логирование с обязательной однократностью или другой необратимый side effect. Lambda должна быть чистым преобразованием old state → new state.

На Android lifetime collector не менее важен, чем тип потока. `lifecycleScope.launch { flow.collect() }` живёт до уничтожения LifecycleOwner и может продолжить сбор, когда экран `STOPPED`. Для View UI обычно используют `repeatOnLifecycle`, а для Compose — lifecycle-aware collection. Повторный вход в lifecycle заново запускает cold upstream, если тот заранее не разделён через `stateIn/shareIn`.

## 13.1. Почему обычный `Flow` называют cold?

Код builder выполняется заново для каждого collector. Без collector поток обычно ничего не производит.

```kotlin
val flow = flow {
    emit(repository.load())
}
```

Несколько collectors могут повторить network/database работу. Для совместного использования применяются `shareIn` и `stateIn`.

## 13.2. Context preservation и `flowOn`

Collector управляет downstream context. Внутри `flow {}` нельзя произвольно emit из другого context. `flowOn(dispatcher)` меняет context **upstream** операторов перед ним и при необходимости создаёт coroutine boundary.

```kotlin
repository.observe()
    .map(::heavyTransform)
    .flowOn(Dispatchers.Default)
    .onEach(::render) // context collector
```

## 13.3. `catch`, `onCompletion`, `retry`

- `catch` ловит upstream exceptions, но не ошибки downstream collector.
- `onCompletion` вызывается при успехе, ошибке или отмене и получает возможную причину.
- `retry` / `retryWhen` повторяют upstream.

Отмену нельзя превращать в обычное значение без очень веской причины.

## 13.4. Backpressure: `buffer`, `conflate`, `collectLatest`

- без buffer producer и consumer обычно синхронизированы через suspension;
- `buffer` позволяет им работать конкурентно в пределах ёмкости;
- `conflate` пропускает промежуточные значения, сохраняя актуальное;
- `collectLatest` отменяет обработку прошлого значения при новом.

Выбор зависит от семантики: событие оплаты нельзя терять, а промежуточный прогресс загрузки иногда можно.

## 13.5. `StateFlow`

Hot state holder:

- всегда имеет текущее `value`;
- новому collector сразу отдаёт последнее состояние;
- conflates обновления по `equals`;
- не завершается обычным образом;
- хорошо подходит для observable UI state.

Mutable-вариант следует скрывать:

```kotlin
private val _state = MutableStateFlow(UiState())
val state: StateFlow<UiState> = _state.asStateFlow()
```

Для атомарного read-modify-write используется `update`.

## 13.6. `SharedFlow`

Hot broadcast stream без обязательного initial value. Настраивается:

- `replay`;
- `extraBufferCapacity`;
- `onBufferOverflow`.

Подходит для multicast-событий, но конфигурация обязана соответствовать требованиям доставки. `SharedFlow(replay = 0)` не гарантирует доставку события collector, который ещё не подписан.

## 13.7. State и event в Android UI

State долговечен и должен позволять восстановить текущий экран: обычно `StateFlow`.

Однократное event-сообщение зависит от требуемой семантики:

- UI-команда, допустимая только активному collector — `SharedFlow` с осознанной буферизацией;
- очередь событий с одним consumer — `Channel`;
- важный бизнес-факт лучше преобразовать в состояние и явно подтвердить обработку.

«SingleLiveEvent на Flow» без определения гарантий доставки остаётся той же архитектурной проблемой.

## 13.8. `shareIn` и `stateIn`

Они запускают upstream в указанном scope и делят его между collectors.

`SharingStarted.WhileSubscribed(...)` часто подходит UI: upstream активен, пока есть подписчики, с возможным timeout. Scope должен жить ровно столько, сколько должна жить shared-подписка, иначе возможны утечки или неожиданные перезапуски.

## 13.9. Channel против Flow

`Channel` — конкурентная очередь и communication primitive; обычно значение получает один consumer. `Flow` — декларативный stream API; `SharedFlow` транслирует каждому subscriber.

`receiveAsFlow()` распределяет channel-элементы между collectors, а не broadcast-ит каждый элемент всем.

## 13.10. `flatMapConcat`, `flatMapMerge`, `flatMapLatest`

- `Concat` — последовательно, сохраняет порядок.
- `Merge` — конкурентно, порядок завершения не гарантирован.
- `Latest` — отменяет предыдущий inner flow при новом входе.

Для поисковой строки обычно нужен `debounce + distinctUntilChanged + flatMapLatest`.

---

# 14. Concurrency и Java Memory Model

Thread safety состоит из нескольких уровней. Синхронизация может убрать data race, но логический контракт всё равно останется неверным: два последовательных под lock запроса могут применить устаревший ответ после нового. Поэтому нужно определить не только защиту памяти, но и порядок операций, ownership, допустимость stale data и точку, в которой результат считается опубликованным.

JVM Memory Model разрешает переупорядочивание, пока оно не нарушает наблюдаемое поведение одного потока. Happens-before ограничивает эти оптимизации между потоками и гарантирует видимость. Без такого отношения один поток не обязан сразу увидеть запись другого, даже если на конкретном устройстве тест обычно проходит.

`val` обычно даёт final-ссылку и помогает safe publication корректно сконструированного объекта, но не делает весь граф immutable. Если `this` утекает из конструктора — например, регистрируется callback — другой поток может увидеть частично инициализированное состояние. А если `val` указывает на `MutableList`, содержимое остаётся изменяемым и требует собственного протокола синхронизации.

Корутины не устраняют гонки. Одна coroutine выполняет инструкции последовательно, но несколько child coroutines могут работать одновременно и продолжаться на разных потоках. Даже `Main.immediate` способен создать reentrant-порядок вызовов: callback выполнится синхронно раньше, чем ожидает вызывающий код.

## 14.1. Visibility, atomicity, ordering

- visibility — увидит ли другой поток запись;
- atomicity — может ли операция наблюдаться частично или потерять обновление;
- ordering — в каком порядке операции могут быть переупорядочены.

Это разные свойства. `volatile` решает visibility и ordering вокруг конкретного поля, но не делает составные операции атомарными.

## 14.2. Что такое happens-before?

Отношение happens-before гарантирует видимость и порядок между действиями. Его создают, например:

- unlock → последующий lock того же monitor;
- volatile write → последующий volatile read;
- действия до старта thread → действия в запущенном thread;
- корректные coroutine/queue primitives согласно их контрактам.

«На моём устройстве всегда работает» не доказывает thread safety.

## 14.3. Race condition и data race

Data race — конкурентный доступ к одной памяти, хотя бы один доступ — запись, без достаточной синхронизации. Race condition шире: результат зависит от порядка событий, включая логические гонки с корректно синхронизированными отдельными операциями.

Пример: два параллельных запроса корректно записывают state, но старый ответ приходит последним и затирает новый.

## 14.4. Immutable state и copy

Immutable snapshots упрощают reasoning и безопасную публикацию, но `data class.copy()` поверхностный. Если внутри находится `MutableList`, старое и новое состояния разделяют изменяемый объект.

В UI state лучше использовать неизменяемые поля и создавать новые коллекции либо persistent collections.

---

# 15. DSL, annotations и reflection

DSL в Kotlin — типобезопасный API, который с помощью синтаксиса языка выглядит как декларативное описание. Его качество определяется не краткостью, а тем, какие некорректные состояния можно выразить. Builder должен валидировать обязательные поля, управлять порядком шагов там, где он важен, и не скрывать неожиданный I/O за безобидно выглядящим присваиванием.

`@DslMarker` ограничивает одновременный неявный доступ к receiver одного DSL и предотвращает случайный вызов функции внешнего builder. Это compile-time защита области видимости, а не runtime-валидация. Явное обращение через label всё ещё возможно, поэтому доменные инварианты нужно проверять отдельно.

Kotlin property может породить несколько JVM-элементов: constructor parameter, backing field, getter и setter. Поэтому для Java framework важно указать use-site target: `@field:`, `@get:`, `@set:`, `@param:`. Неверная цель может компилироваться, но библиотека сериализации, DI или валидации не увидит аннотацию в ожидаемом месте.

Code generation тоже имеет архитектуру. Isolating KSP processor связывает output с отдельным входным символом и лучше поддерживает инкрементальность; aggregating processor зависит от набора символов и может инвалидировать больше модулей. Детерминированный output и корректное описание зависимостей влияют на build cache и время CI большого Android-проекта.

## 15.1. Из чего строится Kotlin DSL?

Обычно из:

- лямбд с receiver;
- extension-функций;
- builder-объектов;
- operator/infix функций, если они действительно улучшают язык предметной области;
- `@DslMarker` для ограничения receiver scope.

Хороший DSL остаётся предсказуемым, типобезопасным и не скрывает дорогие побочные эффекты.

## 15.2. Target и retention аннотаций

`@Target` определяет допустимые места применения. `@Retention`:

- `SOURCE` — только исходный код;
- `BINARY` — есть в бинарном представлении, но не обязательно доступна reflection;
- `RUNTIME` — доступна во время выполнения.

Runtime annotations и reflection могут увеличивать размер/сложность Android-приложения; для генерации кода часто предпочтительны compile-time инструменты.

## 15.3. `KClass` и Java `Class`

- `User::class` возвращает `KClass<User>`;
- `User::class.java` — `Class<User>`;
- `instance::class` — runtime Kotlin class.

Kotlin reflection требует соответствующей библиотеки и может быть дорогой. На Android нужно учитывать shrinker rules, startup и размер APK.

## 15.4. KAPT и KSP

- KAPT запускает Java annotation processing через generated stubs и обычно медленнее.
- KSP работает с Kotlin symbol model и обычно быстрее, лучше понимая Kotlin-конструкции.

KSP — не полноценный анализатор всех деталей компилятора и не может произвольно менять существующий код; он генерирует новый код/ресурсы согласно API процессора.

---

# 16. Производительность Kotlin на Android

Производительность нельзя оценивать по одному фрагменту исходного Kotlin. На результат влияют компилятор, D8/R8, ART, JIT/AOT, Baseline Profiles, устройство, thermal throttling и GC. Debug build и desktop JVM benchmark часто не отражают release-поведение Android-приложения.

Сначала формулируют пользовательскую метрику: startup, frame time, latency операции, allocations, peak memory, battery или размер DEX. Затем находят bottleneck профилировщиком. AndroidX Benchmark подходит для локальных операций, Macrobenchmark — для startup и пользовательских сценариев. После изменения повторяют то же измерение и проверяют, не ухудшилась ли другая метрика.

Оптимизации имеют системную цену. `inline` может убрать вызов, но увеличить DEX и verification work; `Sequence` уменьшает промежуточные списки, но добавляет iterator/call overhead; `Dispatchers.IO` освобождает Main, но не делает неограниченное число блокирующих запросов безопасным; value class даёт типобезопасность, но не гарантирует отсутствие boxing во всех сигнатурах.

Частые мелкие `withContext` также не бесплатны: создаются coroutine boundaries и scheduling work. Переключение стоит размещать вокруг достаточно крупной CPU-bound или блокирующей операции, сохраняя main safety на уровне API, а не механически вокруг каждой функции слоя.

## 16.1. Какие конструкции могут создавать скрытые аллокации?

- захватывающие лямбды;
- boxing примитивов/value classes;
- `vararg` и spread `*array`;
- цепочки eager collection operators;
- делегаты свойств;
- промежуточные `Pair`/`Triple`;
- coroutine objects/state machines;
- Flow operators и buffers;
- reflection.

Это не повод избегать идиоматичного Kotlin. Сначала профилируют реальный hot path.

## 16.2. Стоимость `vararg` и spread operator

`vararg` представлен массивом. `*existingArray` может потребовать defensive copy, чтобы сохранить семантику вызова. В часто вызываемом API лучше рассмотреть overload с `List`/`Array`, если профилирование показывает проблему.

## 16.3. Почему длинная цепочка коллекций может быть дорогой?

```kotlin
items.filter(predicate).map(transform).take(10)
```

Для `Iterable` промежуточные операции создают коллекции и проходят данные несколько раз. Варианты:

- `asSequence()` для lazy pipeline;
- единый цикл для критичного hot path;
- специализированные операции, например `mapNotNull`.

Но Sequence добавляет свой overhead, поэтому решение подтверждается benchmark/profile.

## 16.4. Inline всегда ускоряет код?

Нет. Он может убрать вызов и объект лямбды, но увеличивает bytecode. JIT/ART также способен оптимизировать вызовы сам. Слишком большой inline API ухудшает размер бинарника и усложняет бинарную совместимость публичной библиотеки.

## 16.5. Как Kotlin влияет на R8/ProGuard?

R8 умеет оптимизировать JVM bytecode Kotlin, но reflection, serialization, JNI и динамическая загрузка требуют корректных keep rules. Нельзя лечить ошибки общим `-keep class ** { *; }`: это отключает большую часть shrinking и obfuscation.

Проверять нужно release-сборку, mapping и startup/runtime критичных сценариев.

---

# 17. Архитектурное применение Kotlin

Язык помогает сделать архитектурные решения проверяемыми компилятором. Sealed-типы задают конечный набор состояний, value class различает идентификаторы одинакового физического типа, non-null свойства выражают обязательные данные, а immutable state упрощает однонаправленный поток. Но языковая конструкция не заменяет определение бизнес-контракта.

Ошибки следует переводить на границах слоёв. HTTP-код, `SQLException` и exception конкретного SDK — детали инфраструктуры; repository сопоставляет их с устойчивой taxonomy домена, сохраняя исходную причину для диагностики. Слишком общий `Throwable` заставляет UI понимать инфраструктуру, а слишком детальная sealed-модель протаскивает детали transport во все слои.

Single source of truth — это не просто один `Flow`. Нужно определить, где авторитетные данные, когда они считаются свежими, как дедуплицируются refresh, в каком порядке происходят network и database writes, что происходит при optimistic update и rollback. В offline-first Android-архитектуре UI часто наблюдает локальную БД, а синхронизация транзакционно обновляет её и допускает повтор после process death.

Reducer делает обновление состояния явной функцией previous state + action → new state. Это упрощает тестирование и атомарные update, но side effects должны выполняться отдельно: повторное вычисление reducer или CAS-lambda не должно повторно отправлять запрос, analytics либо навигацию.

## 17.1. Как моделировать результат операции?

Выбор зависит от домена:

- nullable — только если отсутствие является единственным ожидаемым альтернативным исходом;
- exception — техническая ошибка или нарушение контракта;
- `Result<T>` — общий success/failure boundary;
- sealed type — конечный набор осмысленных бизнес-исходов.

```kotlin
sealed interface LoginResult {
    data class Success(val user: User) : LoginResult
    data object InvalidCredentials : LoginResult
    data object AccountLocked : LoginResult
}
```

## 17.2. Почему boolean blindness — проблема?

`load(true, false)` не объясняет смысл аргументов. Решения:

- named arguments;
- enum;
- value class;
- отдельный configuration object;
- разные функции для разных операций.

Public API должен делать некорректное использование трудным.

## 17.3. Как обеспечить exhaustive state handling?

Использовать sealed-модель и expression `when` без бессмысленного `else`. Тогда добавление нового subtype приведёт к compile error в местах, которые нужно обновить.

Если добавить `else`, компилятор уже не заставит обработать новый случай.

## 17.4. Почему extension не всегда хорош для бизнес-логики?

Extension удобен для локальной операции над типом, но:

- не имеет polymorphic dispatch;
- может скрывать зависимость;
- namespace легко засорить;
- extension с I/O или глобальным состоянием выглядит как простая локальная операция, хотя ей не является.

Зависимости и side effects лучше делать явными.

## 17.5. Как проектировать coroutine API?

Хороший API:

- предоставляет `suspend` для одной операции и `Flow` для последовательности;
- main-safe;
- поддерживает cancellation;
- не создаёт скрытый бесконтрольный scope;
- документирует dispatcher/thread-safety только там, где это часть контракта;
- не возвращает `Job` вместо результата без причины;
- позволяет владельцу управлять lifecycle.

---

# 18. Частые вопросы с кодом

Задачи с кодом проверяют не память на синтаксис, а способность последовательно применить модель языка. Полезный порядок разбора: сначала определить compile-time типы и dispatch, затем ownership/mutability, после этого coroutine hierarchy и context, и только потом фактический порядок side effects.

Для Flow отдельно нарисуйте границу upstream/downstream и отметьте каждый `flowOn`, buffer и cancellation operator. Для shared state проверьте, создаётся ли новый объект, вызывается ли setter/update и не остаётся ли вложенная mutable-ссылка. Такой алгоритм надёжнее интуитивного чтения «сверху вниз».

## 18.1. Что выведет код с extension?

```kotlin
open class A
class B : A()

fun A.name() = "A"
fun B.name() = "B"

fun main() {
    val value: A = B()
    println(value.name())
}
```

Ответ: `A`, потому что extension разрешается статически по объявленному типу `value`.

## 18.2. Что не так с этим `StateFlow`?

```kotlin
data class State(val items: MutableList<String>)

val state = MutableStateFlow(State(mutableListOf()))
state.value.items += "new"
```

Список изменён внутри того же объекта state:

- setter `StateFlow.value` не вызван;
- collector может не получить обновление;
- нарушена snapshot-семантика;
- возможны гонки.

Лечится в два шага, и первый важнее: **поменять тип поля**. Пока в модели стоит `MutableList<String>`, вариант с `copy` не скомпилируется — `MutableList + String` даёт `List`. Поэтому:

```kotlin
data class State(val items: List<String>)          // было MutableList<String>

state.update { old -> old.copy(items = old.items + "new") }
```

`update` здесь обязателен, а не `value =`: он делает CAS-цикл, поэтому два конкурентных обновления не затрут друг друга. Цена — лямбда должна быть чистой и идемпотентной, её могут вызвать несколько раз.

## 18.3. Что не так с `runCatching` в coroutine?

```kotlin
val result = runCatching {
    api.load()
}
```

`runCatching` ловит любой `Throwable`, включая `CancellationException`. Если результат затем превращается в fallback, отмена может быть проглочена. Нужно явно пробросить cancellation или использовать helper с корректной политикой.

## 18.4. Выполнятся ли два запроса параллельно?

Последовательно:

```kotlin
val a = api.loadA()
val b = api.loadB()
```

Параллельно в текущем structured scope:

```kotlin
coroutineScope {
    val a = async { api.loadA() }
    val b = async { api.loadB() }
    merge(a.await(), b.await())   // своя доменная функция; для списка задач — awaitAll(a, b)
}
```

Параллельная версия оправдана только если операции независимы и backend/device выдерживают concurrency.

## 18.5. Почему этот `catch` не ловит ошибку render?

```kotlin
flow
    .catch { emit(fallback) }
    .collect { render(it) }
```

`catch` видит только upstream. `render` находится downstream. Его ошибку обрабатывают вокруг `collect` или отдельно внутри collector, в зависимости от желаемой семантики.

## 18.6. Что произойдёт с `data class.copy()`?

```kotlin
data class Box(val values: MutableList<Int>)

val first = Box(mutableListOf(1))
val second = first.copy()
second.values += 2
```

Оба объекта ссылаются на один список; `first.values == [1, 2]`. `copy` поверхностный.

## 18.7. Почему `counter++` небезопасен даже с `@Volatile`?

Операция состоит из чтения, увеличения и записи. Два потока могут прочитать одно старое значение и потерять одно обновление. Нужны atomic increment, lock или confinement.

## 18.8. Что выведет equality?

```kotlin
data class User(val name: String) {
    var selected: Boolean = false
}

val a = User("Ann").apply { selected = false }
val b = User("Ann").apply { selected = true }
println(a == b)
```

`true`: свойство `selected` объявлено не в primary constructor и не участвует в сгенерированном `equals`.

## 18.9. Почему событие потерялось в `SharedFlow`?

При `replay = 0`, отсутствии buffer и отсутствии активного subscriber emit может завершиться без сохранения значения для будущего subscriber. Нужно сначала определить гарантию:

- replay последнего события;
- buffered delivery;
- очередь `Channel`;
- моделирование события как состояния;
- durable хранение на уровне данных.

## 18.10. Есть ли утечка?

```kotlin
object Analytics {
    var callback: (() -> Unit)? = null
}

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Analytics.callback = { title = "Done" }
    }
}
```

Лямбда захватывает `MainActivity`, а глобальный singleton удерживает лямбду. Activity не будет собрана, пока callback не очищен. Лучше не хранить UI callback в process-wide singleton; использовать lifecycle-aware наблюдение и передачу данных.

## 18.11. Что именно гарантирует `supervisorScope`?

Ошибка одного непосредственного child не отменяет сам supervisor и его остальных детей. Но это не означает, что ошибка обработана:

- exception из `async` будет выброшен при `await`;
- root-подобный `launch` внутри supervisor должен иметь обработчик или локальный `try/catch`;
- если падает сам блок `supervisorScope`, его дети отменяются;
- supervision изолирует распространение cancellation вверх, но не превращает failure в success.

## 18.12. Что произойдёт с cold Flow при `repeatOnLifecycle`?

Когда lifecycle опускается ниже заданного состояния, дочерняя collecting coroutine отменяется. При возвращении она запускается заново. Для cold Flow это означает новый запуск upstream: повторный network request, новая подписка на callback или новый database query — в зависимости от источника.

Если работа должна переживать краткое отсутствие UI, поток делят через `stateIn/shareIn` во scope владельца состояния. При этом нужно отдельно выбрать `SharingStarted`, timeout и replay, иначе можно получить либо лишнюю постоянную работу, либо слишком частые перезапуски.

---

# 19. Senior-level вопросы на рассуждение

На senior-интервью редко достаточно назвать API. Ожидается контракт решения: кто владеет ресурсом, какие гарантии порядка и доставки существуют, что произойдёт при отмене, повторе, process death и конкурентном вызове. Хороший ответ также называет границы применимости и способ проверить гипотезу.

«Thread-safe», «reactive» и «clean» — недостаточные характеристики. Thread-safe метод может нарушать порядок бизнес-операций, reactive pipeline — бесконечно держать дорогой upstream, а лишняя abstraction — скрывать cancellation или transaction boundary. Оценивать нужно наблюдаемое поведение системы и стоимость будущего изменения.

## 19.1. Когда предпочесть sealed interface, а когда sealed class?

`sealed interface`:

- не занимает единственный слот наследования класса;
- один тип может реализовать несколько закрытых ролей;
- не хранит общее состояние.

`sealed class`:

- может иметь constructor/state;
- даёт общую реализацию и защищённые члены;
- полезен при настоящей общей базе.

Выбор определяется моделью, а не стилем.

## 19.2. Нужно ли делать repository API thread-safe?

Зависит от контракта и lifetime. Singleton repository часто вызывается конкурентно и должен защищать shared mutable state. Stateless repository может быть безопасен естественно.

Нужно отдельно определить:

- допустимые параллельные вызовы;
- порядок результатов;
- cancellation;
- cache consistency;
- dispatcher policy;
- атомарность read-modify-write.

## 19.3. Как найти ошибку в coroutine-коде?

Проверять по слоям:

1. Кто владеет scope и когда он отменяется?
2. Как связаны parent/child `Job`?
3. Где меняется dispatcher?
4. Может ли блокирующий вызов занять thread?
5. Не проглатывается ли cancellation?
6. Кто наблюдает exception?
7. Нет ли гонки старого и нового результата?
8. Как Flow делится между collectors?
9. Какие гарантии buffer/replay?
10. Воспроизводится ли проблема под stress/test dispatcher?

## 19.4. Как оценивать идиоматичность Kotlin?

Идиоматичность — не максимальное число language features. Хороший Kotlin-код:

- делает nullability и состояния явными;
- использует value semantics там, где это уместно;
- избегает скрытых side effects;
- читается без знания трюков;
- совместим с lifecycle и concurrency model;
- имеет предсказуемый Java API, если это требуется;
- учитывает стоимость на Android hot path.

## 19.5. Какие компромиссы у функционального стиля?

Плюсы:

- локальность преобразований;
- меньше mutable state;
- удобная композиция;
- тестируемость.

Минусы:

- промежуточные аллокации;
- неочевидные stack traces;
- сложные цепочки хуже отлаживаются;
- scope functions и nested lambdas могут скрывать flow управления.

На senior-уровне ожидается прагматичный баланс.

## 19.6. Как оценить абстракцию?

Полезная abstraction:

- скрывает нестабильную деталь;
- сохраняет нужные возможности управления;
- уменьшает число причин для изменения caller;
- имеет понятный контракт ошибок, cancellation и lifetime;
- окупает стоимость навигации и обучения.

Универсальный wrapper над `Flow`, storage или network часто выглядит «чище», но может стереть backpressure, transaction boundary или конкретную семантику ошибок. Если частые сценарии требуют обходить wrapper, абстракция выбрана на неверном уровне.

## 19.7. Как аргументировать оптимизацию?

Нужно назвать:

1. наблюдаемую проблему и пользовательскую метрику;
2. данные профилирования;
3. гипотезу о bottleneck;
4. изменение и его компромиссы;
5. контрольное измерение;
6. условие отката.

Без этого замена коллекции на Sequence или callback на Flow остаётся стилевым предпочтением, а не инженерной оптимизацией.

---

# 20. Чек-лист тем перед интервью

Чек-лист — не перечень терминов для заучивания. Для каждого пункта подготовьте четыре слоя ответа: определение, внутренний механизм, типичная ошибка и практический Android-пример. Если вопрос касается concurrency или lifecycle, дополнительно объясните ownership и поведение при отмене/process death.

Темы Compose, Room и lifecycle формально выходят за ядро языка Kotlin, но на Senior Android интервью часто проверяют, способен ли кандидат применить Kotlin-модель состояния и конкурентности в framework-коде. Поэтому после языковой части полезно связать `StateFlow` со snapshot state, coroutine scope — с lifecycle owner, а immutable model — с recomposition и diffing.

## Обязательно знать

- `Any`, `Unit`, `Nothing`, nullability, platform types, smart casts.
- `val`, `var`, `const`, `lateinit`, `lazy`.
- классы, порядок инициализации, `data`, `sealed`, `enum`, `object`, value class.
- `==` / `===`, `equals/hashCode`, shallow copy.
- extensions и статическое разрешение.
- lambdas, closures, inline/noinline/crossinline/reified.
- generics, variance, projections, erasure.
- коллекции, read-only vs immutable, Sequence.
- scope functions и делегирование.
- Java interop и основные `@Jvm*` аннотации.
- structured concurrency, cancellation, dispatchers, exception propagation.
- Flow context, backpressure, StateFlow/SharedFlow/Channel.
- visibility, atomicity, happens-before.
- Android-specific memory/performance traps.

## Полезно знать глубже

- contracts и definitely non-null types.
- Kotlin DSL и `@DslMarker`.
- reflection, annotations, KSP/KAPT.
- generated JVM representation.
- boxing, lambda/collection/coroutine allocations.
- binary compatibility библиотек.
- Kotlin Multiplatform `expect/actual` и различия memory model платформ, если это требуется вакансией.

## Связанные Android-темы для применения Kotlin

- Compose: stability/skippability, snapshot state, `remember`, `rememberSaveable`, side-effect API.
- Lifecycle: configuration change, process death, `SavedStateHandle`, ownership `ViewModel`.
- Room/offline-first: транзакции, idempotency, retry/backoff, conflict resolution.
- Тестирование: virtual time, test dispatcher, проверка Flow, cancellation и порядка событий.
- Производительность: AndroidX Benchmark, Macrobenchmark, Baseline Profiles и release profiling.

---

# 21. Короткая самопроверка

Самопроверка должна быть устной и сценарной. Ответ «использую `StateFlow`» не считается полным без владельца scope, initial state, update policy, lifecycle collection и поведения при process recreation. Аналогично «защищу `Mutex`» требует указать критическую секцию, порядок операций и то, какую именно гонку решение устраняет.

Полезный формат тренировки: две минуты на базовый ответ, затем три уточнения «почему?», «что сломается?» и «как проверить?». Именно уточнения обычно отличают senior-level понимание от знания API.

Кандидат уровня Senior должен уметь без подготовки:

1. Объяснить, почему `List` не означает immutable.
2. Найти проблему mutable state внутри `StateFlow`.
3. Объяснить shallow copy data class.
4. Предсказать вызов extension при полиморфном receiver.
5. Спроектировать sealed-модель результата.
6. Объяснить variance на примере producer/consumer.
7. Назвать ограничения type erasure и `reified`.
8. Отличить suspension от смены потока.
9. Описать распространение cancellation и exceptions.
10. Выбрать между Flow, StateFlow, SharedFlow и Channel.
11. Объяснить, почему `volatile counter++` небезопасен.
12. Найти потенциальный Android memory leak из-за closure.
13. Обосновать eager collection, Sequence или обычный цикл.
14. Спроектировать Kotlin API, удобный и для Java.
15. Рассказать, что именно следует измерять перед микрооптимизацией.

Дополнительные практические сценарии:

16. Спроектировать экран с восстановлением state после rotation и process death.
17. Полностью описать `stateIn`: scope, старт upstream, replay, ошибку и завершение.
18. Разобрать два конкурентных `refresh` и не допустить записи устаревшего ответа.
19. Выбрать стратегию доставки UI event и сформулировать её гарантии.
20. Написать coroutine/Flow-тест с virtual time и проверкой cancellation.
21. Диагностировать performance-регрессию и выбрать подходящий benchmark.

Если ответы содержат механизм, ограничения, цену решения и практический Android-пример, глубины обычно достаточно для senior-интервью.
