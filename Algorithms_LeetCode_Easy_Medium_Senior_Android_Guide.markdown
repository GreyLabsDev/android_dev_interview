# Алгоритмические задачи для собеседования Senior Android Developer

Практический гайд по алгоритмам и паттернам уровня LeetCode Easy/Medium с примерами на Kotlin/JVM.

Цель документа — научить не запоминать ответы, а:

- распознавать тип задачи;
- начинать с корректного brute force;
- находить повторяющуюся работу;
- формулировать invariant;
- выбирать структуру данных;
- доказывать корректность;
- оценивать время и дополнительную память;
- писать надёжный Kotlin-код.

> Senior Android интервью обычно не требует олимпиадных алгоритмов. Ожидается уверенное владение базовыми структурами, чистая коммуникация, корректные границы, оценка сложности и способность объяснить компромиссы.

**Место в комплекте.** Этот файл — основной материал по блоку 14 `01-checklist.md`; вопросы для
самопроверки — блок 13 `03-question-bank.md` (155–170), порядок прохождения по неделям — раздел 28
здесь и неделя 7 в `02-plan.md`.

Важная оговорка про охват: гайд готовит к **алгоритмической** секции — той, что в Яндексе идёт
в простом редакторе на две задачи за час. Но чеклист помечает 🔴 ещё два формата, которых здесь нет:

- **Практические задачи на Kotlin и корутинах** (дебаунсер, пул задач с ограничением параллелизма,
  retry с backoff, in-memory кэш с TTL, single-flight) — они разобраны в `08-coroutines-android.md`,
  раздел 4. LRU-кэш есть здесь, в разделе 25.2.
- **«Дан проект с багами: починить, дополнить фичу, покрыть тестами»** — формат, который в 2026 году
  стал основным на кодинг-секции Авито. Отдельного разбора в комплекте нет; ориентир по подходу —
  ниже, в разделе 1.

---

# 1. Как решать задачу на интервью

Сильное решение — это не только рабочий код. Интервьюер оценивает ход рассуждений, способность уточнять требования, выбирать подход и находить ошибки до запуска.

## 1.1. Сначала уточните контракт

Перед кодом спросите:

- Может ли вход быть пустым?
- Есть ли `null`, отрицательные числа, дубликаты?
- Отсортированы ли данные?
- Можно ли менять входной массив?
- Нужны значения, индексы, количество или все решения?
- Подмассив обязан быть непрерывным или речь о подпоследовательности?
- Каковы ограничения `n` и диапазон значений?
- Как трактуются границы интервала?
- Что вернуть, если решения нет?
- Важен ли исходный порядок?

Эти ответы могут полностью изменить алгоритм.

## 1.2. Проговорите brute force

Brute force показывает, что задача понята.

Пример для Two Sum:

1. Проверить каждую пару.
2. Время `O(n²)`.
3. Дополнительная память `O(1)`.
4. Повторяющаяся работа — поиск complement среди уже просмотренных элементов.
5. `HashMap` уменьшает поиск до `O(1)` в среднем.

Не начинайте оптимизацию, пока не можете объяснить простой вариант.

## 1.3. Сформулируйте invariant

Invariant — утверждение, остающееся истинным после каждой итерации.

Примеры:

- Two pointers: все пары за пределами `[left, right]` уже исключены.
- Sliding window: перед обновлением ответа текущее окно валидно.
- BFS: первая найденная дистанция минимальна в невзвешенном графе.
- Heap Top-K: heap содержит лучшие `k` элементов обработанного префикса.
- DP: `dp[i]` уже содержит оптимальный ответ для подзадачи `i`.

Invariant помогает доказать решение и правильно двигать границы.

## 1.4. Назовите сложность до кода

Это позволяет проверить, соответствует ли подход ограничениям.

Практические ориентиры:

- `n <= 20`: часто допустимы `2ⁿ`, backtracking, bitmask.
- `n <= 100`: иногда допустимо `O(n³)`.
- `n <= 1 000`: часто допустимо `O(n²)`.
- `n <= 100 000`: обычно требуется `O(n log n)` или `O(n)`.
- `n >= 1 000 000`: чаще нужен линейный проход и компактная память.

Это не строгие лимиты: важны язык, платформа и число test cases.

## 1.5. После кода выполните dry run

Проверьте:

- пустой ввод;
- один элемент;
- два элемента;
- все элементы одинаковые;
- уже отсортированный и обратный порядок;
- отрицательные числа;
- максимальные значения и overflow;
- отсутствие решения;
- решение на первой/последней позиции.

## 1.6. Как общаться во время решения

Хорошая последовательность:

1. «Сначала уточню ограничения».
2. «Простой вариант перебирает все пары за `O(n²)`».
3. «Повторяется поиск complement, поэтому использую map».
4. «Перед индексом `i` map содержит только предыдущие элементы».
5. «Время `O(n)` в среднем, память `O(n)`».
6. «Проверю дубликаты, один элемент и overflow».

Не молчите во время написания кода, но и не комментируйте каждый символ.

## 1.7. Секция без IDE

Алгоритмическая секция в Яндексе идёт в простом редакторе: без автодополнения, без подсветки
ошибок, без компиляции. Две задачи за час. Это отдельный навык, и тренировать его нужно отдельно —
иначе получается кандидат, который «решил бы, если бы IDE подсказала имя метода».

Что помогает:

- Решайте часть задач в блокноте или на leetcode без запуска, а потом проверяйте — так вы узнаете
  свои настоящие пробелы в сигнатурах.
- Держитесь ядра stdlib, которое помните точно: `IntArray`, `HashMap`, `ArrayDeque`,
  `sortedBy`, `groupBy`, `PriorityQueue`. Экзотику вроде `windowed`, `zipWithNext`, `fold` с хитрым
  аккумулятором лучше не трогать, если не уверены в порядке аргументов.
- Не полагайтесь на `it` в длинных лямбдах — именуйте параметры, читать будет и интервьюер.
- Проверяйте код глазами по чеклисту: объявлены ли все переменные, инициализированы ли,
  не перепутаны ли `i` и `j`, закрыты ли скобки, возвращается ли значение из всех ветвей.
- Не бойтесь сказать «не помню точное имя, напишу `binarySearchLeft` и опишу семантику» —
  это нормально и лучше, чем зависнуть.

## 1.8. Формат «дан проект с багами»

На кодинг-секции Авито и ряда других компаний вместо LeetCode дают небольшой проект: починить
баги, дополнить фичу, покрыть тестами. Оценивают не скорость печати, а порядок действий.

Работающая последовательность:

1. **Не читайте код подряд.** Сначала выясните, что приложение должно делать, и запустите его.
   Воспроизведённый баг ценнее прочитанного файла.
2. **Найдите точки входа**, а не начало файла: ViewModel экрана, репозиторий, места с `try/catch`
   и с ручным управлением состоянием. Баги живут там, где состояние меняется из двух мест.
3. **Отделяйте баг от решения автора.** Если код выглядит странно, спросите: «здесь так задумано
   или это дефект?» Молча переписать чужое намерение — минус, даже если ваш вариант лучше.
4. **Сначала тест, воспроизводящий баг, потом фикс.** Это единственный способ доказать, что вы
   починили именно то, что сломано, и не сломали соседнее.
5. **Приоритизируйте вслух.** Найденных проблем всегда больше, чем времени. Скажите, что чините
   утечку и гонку, а неидеальное именование оставляете, и почему именно так.
6. **Покрывайте тестами то, что чинили**, а не всё подряд: один тест на баг, один на счастливый
   путь, один на границу. Разговор про пирамиду тестов уместнее, чем двадцать ассертов.

Что обычно закладывают в такие проекты: утечка через слушателя без отписки, работа с UI из фонового
потока, `GlobalScope` вместо `viewModelScope`, потеря состояния при повороте, гонка при быстрых
повторных нажатиях, проглоченное исключение в `catch (e: Exception) {}`, `runBlocking` на главном
потоке. Материал по каждому — в `08-coroutines-android.md` и `09-jvm-memory-deep.md`.

---

# 2. Оценка времени и памяти

## 2.1. Big O

Big O описывает рост верхней границы стоимости при увеличении входа.

Частые классы:

- `O(1)` — доступ по индексу, hash lookup в среднем.
- `O(log n)` — binary search, heap operation.
- `O(n)` — один полный проход.
- `O(n log n)` — comparison sort, heap по всем элементам.
- `O(n²)` — все пары.
- `O(2ⁿ)` — subsets.
- `O(n!)` — permutations.

Константы не входят в Big O, но на Android/JVM boxing и аллокации могут быть практически значимы.

## 2.2. Последовательные и вложенные циклы

Последовательные части складываются:

```text
O(n) + O(n log n) = O(n log n)
```

Вложенный `while` не всегда создаёт `O(n²)`:

```kotlin
var left = 0

for (right in nums.indices) {
    while (left <= right && invalid()) {
        left++
    }
}
```

Если `left` за всё выполнение проходит массив один раз, суммарное время `O(n)`. Это амортизированный анализ.

## 2.3. Что включать в память

Учитывайте:

- массивы и коллекции;
- hash table;
- queue/stack;
- recursion call stack;
- копию после `sorted`, `map`, `filter`;
- накопленный результат;
- temporary objects и boxing.

Обычно отдельно называют:

- auxiliary space — дополнительная память алгоритма;
- output space — память результата, если она неизбежна.

## 2.4. Рекурсивный стек

Рекурсивный DFS имеет память `O(h)` или `O(V)`, а не `O(1)`.

На JVM глубокая рекурсия может вызвать `StackOverflowError`. `tailrec` помогает только для настоящего хвостового вызова. Tree DFS, graph DFS и backtracking обычно не являются хвостовыми.

## 2.5. Average и worst case

`HashMap`:

- lookup/insert `O(1)` в среднем;
- worst case зависит от коллизий и реализации.

Priority queue:

- `offer/poll` — `O(log n)`;
- `peek` — `O(1)`;
- удаление произвольного значения обычно `O(n)`.

Говорите, какую оценку используете.

---

# 3. Kotlin/JVM для алгоритмических задач

## 3.1. Массивы примитивов

Используйте:

- `IntArray`;
- `LongArray`;
- `BooleanArray`;
- `CharArray`.

`Array<Int>` и `MutableList<Int>` содержат boxed `Integer`, создавая дополнительную память и косвенный доступ.

```kotlin
val values = IntArray(n)
val visited = BooleanArray(n)
```

## 3.2. Queue и stack

Подходит `kotlin.collections.ArrayDeque` или `java.util.ArrayDeque`. В шаблонах ниже часто используется Java-вариант из-за привычных `peek/poll`.

```kotlin
import java.util.ArrayDeque

val stack = ArrayDeque<Int>()
stack.addLast(1)
val top = stack.removeLast()

val queue = ArrayDeque<Int>()
queue.addLast(1)
val first = queue.removeFirst()
```

Не используйте `MutableList.removeAt(0)`: элементы сдвигаются за `O(n)`. Старый `Stack` обычно не нужен.

## 3.3. Priority queue

```kotlin
import java.util.PriorityQueue

val minHeap = PriorityQueue<Int>()
val maxHeap = PriorityQueue<Int>(compareByDescending { it })
```

Не пишите comparator как `{ a, b -> a - b }`: разность может переполниться.

## 3.4. Переполнение

Преобразуйте до операции:

```kotlin
val correct = a.toLong() + b
val broken = (a + b).toLong()
```

Второй вариант преобразует уже переполненный `Int`.

Используйте `Long` для:

- сумм;
- произведений;
- площадей;
- расстояний;
- binary search по большому диапазону;
- количества способов.

## 3.5. Индексы и ranges

- `array.indices` — безопасный диапазон индексов.
- `0 until n` — `[0, n)`.
- `0..n` — включает `n`.
- `array.lastIndex` у пустого массива равен `-1`.
- `downTo` — обратный проход.

```kotlin
for (i in nums.indices) { }
for (i in nums.lastIndex downTo 0) { }
```

## 3.6. Сортировка

```kotlin
nums.sort()                 // меняет IntArray
val copy = nums.sortedArray() // создаёт копию

intervals.sortWith(
    compareBy<IntArray> { it[0] }
        .thenBy { it[1] }
)
```

Уточните, разрешено ли менять вход.

## 3.7. Строки

Конкатенация в цикле может стать `O(n²)`:

```kotlin
val result = buildString {
    for (ch in chars) append(ch)
}
```

`String` индексируется по UTF-16 `Char`, а не по Unicode code point. В LeetCode часто явно задан ASCII/латинский алфавит.

## 3.8. Коллекционные цепочки

`filter().map().sorted()` удобны, но создают промежуточные коллекции. На интервью обычный цикл:

- легче оценить;
- часто требует меньше памяти;
- исключает скрытые аллокации.

`Sequence` не гарантирует ускорение.

## 3.9. `Pair` и destructuring

Удобны для читаемости, но в горячем цикле создают объекты. Координату сетки можно кодировать:

```kotlin
val id = row * cols + col
val row = id / cols
val col = id % cols
```

На интервью сначала выбирайте ясность; оптимизацию аллокаций объясняйте при необходимости.

---

# 4. Линейный проход и состояние префикса

## Какую задачу решает

Подходит, когда ответ для текущей позиции можно обновить из небольшого состояния предыдущего префикса:

- минимум/максимум;
- число элементов;
- лучший результат;
- локальные переходы;
- in-place фильтрация;
- running sum.

## Когда применять

Сигналы:

- «за один проход»;
- «лучший результат до текущей позиции»;
- достаточно нескольких переменных;
- не требуется возвращаться к старым элементам.

## Как работает

Invariant:

> После обработки `0..i` переменные полностью описывают всё нужное о префиксе.

Пример Best Time to Buy and Sell Stock:

```kotlin
fun maxProfit(prices: IntArray): Long {
    if (prices.isEmpty()) return 0L

    var minPrice = prices[0]
    var best = 0L

    for (i in 1 until prices.size) {
        val price = prices[i]
        best = maxOf(
            best,
            price.toLong() - minPrice.toLong(),
        )
        minPrice = minOf(minPrice, price)
    }

    return best
}
```

`minPrice` — минимум до текущего места, `best` — лучший ответ обработанного префикса.

## Сложность

- Время: `O(n)`.
- Дополнительная память: `O(1)`.

## In-place compaction

```kotlin
fun removeValue(nums: IntArray, target: Int): Int {
    var write = 0

    for (read in nums.indices) {
        if (nums[read] != target) {
            nums[write++] = nums[read]
        }
    }

    return write
}
```

Invariant: `0 until write` содержит все сохранённые элементы обработанного префикса.

## Kadane: maximum subarray

Решает максимальную сумму непрерывного подмассива.

```kotlin
fun maxSubArray(nums: IntArray): Long {
    require(nums.isNotEmpty())

    var bestEndingHere = nums[0].toLong()
    var best = bestEndingHere

    for (i in 1 until nums.size) {
        val value = nums[i].toLong()
        bestEndingHere = maxOf(value, bestEndingHere + value)
        best = maxOf(best, bestEndingHere)
    }

    return best
}
```

`bestEndingHere` — лучший подмассив, который обязан закончиться на текущей позиции.

Сложность:

- время `O(n)`;
- память `O(1)`.

## Типичные ошибки

- Инициализировать максимум нулём при всех отрицательных значениях.
- Обновить minimum до вычисления текущего ответа и использовать элемент дважды.
- Не уточнить, допустим ли пустой подмассив.
- Получить overflow суммы.
- Создать новый список, хотя требуется in-place.

## Задачи

- LC 121 — Best Time to Buy and Sell Stock.
- LC 53 — Maximum Subarray.
- LC 27 — Remove Element.
- LC 14 — Longest Common Prefix.
- LC 238 — Product of Array Except Self.

---

# 5. HashSet и HashMap

## Какую задачу решает

Hashing заменяет повторный линейный поиск быстрым lookup:

- complement;
- дубликаты;
- частоты;
- группировка;
- first/last index;
- состояние префикса.

## Когда применять

Сигналы:

- «видели ли элемент раньше»;
- «найдите пару»;
- «частота», «дубликат», «анаграмма»;
- порядок неважен;
- brute force повторно ищет среди просмотренных элементов.

## Как работает

Главное решение — выбрать ключ, который представляет эквивалентное состояние.

Two Sum:

```kotlin
fun twoSum(nums: IntArray, target: Int): IntArray {
    val indexByValue = HashMap<Int, Int>()

    for (i in nums.indices) {
        val complement = target - nums[i]
        val previous = indexByValue[complement]

        if (previous != null) {
            return intArrayOf(previous, i)
        }

        indexByValue[nums[i]] = i
    }

    return intArrayOf()
}
```

Invariant:

> До обработки `i` map содержит только индексы `0 until i`.

Сначала выполняется поиск, затем добавление: один индекс нельзя использовать дважды.

## Частоты

```kotlin
val frequency = HashMap<Int, Int>()

for (value in nums) {
    frequency[value] = frequency.getOrDefault(value, 0) + 1
}
```

Для маленького известного алфавита `IntArray(26)` быстрее и компактнее `HashMap<Char, Int>`.

## Сложность

- Время полного прохода: `O(n)` в среднем.
- Дополнительная память: `O(n)`.
- Lookup/insert: `O(1)` в среднем.

## Типичные ошибки

- Добавить текущий элемент до поиска complement.
- Путать отсутствие ключа со значением `0`.
- Использовать массив как key: его equality обычно ссылочная.
- Считать `HashMap` упорядоченной.
- Хранить только presence, когда требуется количество.
- Создать неоднозначный строковый ключ для частот.
- Игнорировать дополнительную память `O(n)`.

## Задачи

- LC 1 — Two Sum.
- LC 217 — Contains Duplicate.
- LC 242 — Valid Anagram.
- LC 49 — Group Anagrams.
- LC 128 — Longest Consecutive Sequence.
- LC 347 — Top K Frequent Elements.

---

# 6. Sorting

## Какую задачу решает

После сортировки:

- равные элементы стоят рядом;
- пары ищутся two pointers;
- интервалы обрабатываются последовательно;
- доступен binary search;
- глобальная задача становится локальной.

## Когда применять

- Исходный порядок неважен.
- Можно сохранить исходный индекс вместе со значением.
- После упорядочивания решение становится линейным.
- Требуется grouping/deduplication.
- `O(n log n)` проходит ограничения.

## Как работает

Comparison sort создаёт порядок согласно comparator. Subsequent algorithm обязан опираться на тот же порядок.

```kotlin
// имя ValueWithIndex, а не IndexedValue: последнее занято stdlib (его возвращает withIndex()),
// и одноимённый класс с обратным порядком полей — готовая ловушка при чтении кода
data class ValueWithIndex(
    val value: Int,
    val index: Int,
)

fun sortedValues(nums: IntArray): List<ValueWithIndex> {
    return nums
        .mapIndexed { index, value ->
            ValueWithIndex(value = value, index = index)
        }
        .sortedWith(
            compareBy<ValueWithIndex> { it.value }
                .thenBy { it.index },
        )
}
```

Для performance-sensitive примитивов лучше parallel arrays или indexed `IntArray`, но на интервью читаемость часто важнее.

## Сложность

- Время comparison sort: `O(n log n)`.
- Дополнительная память зависит от реализации и копирования.
- Последующий линейный scan: `O(n)`.
- Общая: `O(n log n)`.

Важная деталь, которую стоит знать про JVM, потому что она иногда решает, пройдёт ли решение
по времени: **`IntArray.sort()` — это не comparison sort**. Для примитивов вызывается
`Arrays.sort(int[])`, то есть двухопорный quicksort: нестабильный, без дополнительной памяти
и с худшим случаем `O(n²)` на специально подобранных данных. Именно поэтому на LeetCode
периодически «падает по времени» решение, где `IntArray.sort()` — единственная тяжёлая операция
(классика — LC 912). Обходится перекладыванием в `Array<Int>` или перемешиванием перед сортировкой.
Для `Array<T>` и `List<T>` работает TimSort: стабильный, гарантированные `O(n log n)`, но до `O(n)`
дополнительной памяти. Если сортируете объекты и потом опираетесь на исходный порядок равных
элементов — стабильность у вас есть; если сортируете `IntArray` — её нет.

Counting sort:

- время `O(n + range)`;
- память `O(range)`;
- подходит только при небольшом диапазоне ключей.

## Типичные ошибки

- Потерять исходные индексы.
- Незаметно изменить вход.
- Comparator через вычитание и overflow.
- Полностью сортировать для Top-K, где достаточно heap `O(n log k)`.
- Не удалить duplicate results после сортировки.
- Предположить stable sort без необходимости/гарантии.

## Задачи

- LC 75 — Sort Colors.
- LC 88 — Merge Sorted Array.
- LC 179 — Largest Number.
- LC 215 — Kth Largest Element.
- LC 56 — Merge Intervals.

---

# 7. Two Pointers

## Какую задачу решает

Сокращает перебор пар с `O(n²)` до `O(n)`, когда движение указателя доказуемо исключает множество кандидатов.

Варианты:

- с двух концов;
- slow/fast для compaction;
- два отсортированных массива;
- partition;
- palindrome.

## Когда применять

- Отсортированный массив.
- Пара с нужной суммой.
- Палиндром.
- In-place удаление/перемещение.
- Слияние двух отсортированных последовательностей.

## Как работает

Для pair sum:

- сумма мала → увеличить `left`;
- сумма велика → уменьшить `right`.

```kotlin
fun hasPairWithSum(
    sorted: IntArray,
    target: Int,
): Boolean {
    var left = 0
    var right = sorted.lastIndex

    while (left < right) {
        val sum = sorted[left].toLong() + sorted[right].toLong()

        when {
            sum < target.toLong() -> left++
            sum > target.toLong() -> right--
            else -> return true
        }
    }

    return false
}
```

Invariant:

> Все пары вне текущего диапазона проверены или доказуемо не подходят.

## Сложность

- После сортировки: время `O(n)`, память `O(1)`.
- С предварительной сортировкой: `O(n log n)`.
- Если сортируется копия: дополнительная память `O(n)`.

## 3Sum

Фиксируем первый элемент и запускаем two pointers на suffix. После найденного ответа пропускаем дубликаты.

```kotlin
fun threeSum(nums: IntArray): List<List<Int>> {
    nums.sort()
    val result = mutableListOf<List<Int>>()

    for (i in 0 until nums.size - 2) {
        // дубликаты первого элемента дают те же тройки
        if (i > 0 && nums[i] == nums[i - 1]) continue
        // отсортировано: если самый маленький уже больше нуля, дальше только хуже
        if (nums[i] > 0) break

        var left = i + 1
        var right = nums.size - 1

        while (left < right) {
            val sum = nums[i].toLong() + nums[left] + nums[right]
            when {
                sum < 0 -> left++
                sum > 0 -> right--
                else -> {
                    result += listOf(nums[i], nums[left], nums[right])
                    // сдвигаем ОБА указателя за дубликаты, иначе получим повторы
                    while (left < right && nums[left] == nums[left + 1]) left++
                    while (left < right && nums[right] == nums[right - 1]) right--
                    left++
                    right--
                }
            }
        }
    }

    return result
}
```

Задача целиком про дубликаты, а не про два указателя. Три места, где их надо пропустить: внешний
цикл (`i > 0 && nums[i] == nums[i - 1]`) и оба указателя после найденной тройки. Пропустить хотя бы
одно — и в ответе появятся повторы, которые на LeetCode считаются ошибкой. Сумма считается в `Long`:
три `Int` близких к границе переполняют `Int`. Ранний `break` при `nums[i] > 0` не обязателен,
но его стоит назвать как очевидную отсечку.

Общая сложность:

- время `O(n²)`;
- память `O(1)` без результата и памяти сортировки.

## Типичные ошибки

- Применить к неотсортированному массиву без другого invariant.
- Использовать `left <= right` и взять один элемент дважды.
- Двигать указатель без объяснения.
- Пропускать duplicate до сохранения результата.
- Получить overflow суммы.
- Путать two pointers и sliding window: окно обычно поддерживает агрегат непрерывного диапазона.

## Задачи

- LC 125 — Valid Palindrome.
- LC 283 — Move Zeroes.
- LC 167 — Two Sum II.
- LC 11 — Container With Most Water.
- LC 15 — 3Sum.

---

# 8. Sliding Window

## Какую задачу решает

Ищет лучший непрерывный диапазон, переиспользуя состояние соседних окон:

- longest valid substring;
- shortest subarray satisfying condition;
- фиксированное окно;
- частоты символов;
- сумма/число нарушений.

## Когда применять

- В условии есть contiguous subarray/substring.
- Границы движутся только вправо.
- Добавление справа и удаление слева обновляют состояние локально.
- Валидность монотонна при сжатии/расширении.

## Fixed-size window

```kotlin
fun maxWindowSum(nums: IntArray, k: Int): Long {
    require(k in 1..nums.size)

    var sum = 0L
    for (i in 0 until k) sum += nums[i]

    var best = sum

    for (right in k until nums.size) {
        sum += nums[right]
        sum -= nums[right - k]
        best = maxOf(best, sum)
    }

    return best
}
```

Время `O(n)`, память `O(1)`.

## Variable-size window

Минимальная длина с суммой не меньше target при положительных числах:

```kotlin
fun minSubArrayLen(
    target: Int,
    nums: IntArray,
): Int {
    var left = 0
    var sum = 0L
    var best = Int.MAX_VALUE

    for (right in nums.indices) {
        sum += nums[right]

        // left <= right держит окно непустым: без этой проверки при target <= 0
        // или неположительных числах left перескакивает right и мы читаем за границей
        while (left <= right && sum >= target.toLong()) {
            best = minOf(best, right - left + 1)
            sum -= nums[left++]
        }
    }

    return if (best == Int.MAX_VALUE) 0 else best
}
```

Предусловие: `nums` состоит из положительных чисел, `target >= 1` (так в LC 209). Именно
положительность делает окно монотонным — сумма растёт при расширении справа и падает при сжатии
слева, поэтому двух указателей достаточно. Если в массиве могут быть нули и отрицательные числа,
скользящее окно неприменимо в принципе: нужен prefix sum с монотонной деком или с map.
Проговорить это вслух ценнее, чем быстро написать код: интервьюер часто добавляет отрицательные
числа как follow-up именно затем, чтобы увидеть, понимаете ли вы, на чём держится метод.

Invariant:

> Перед/во время фиксации ответа известно, валидно ли окно, а каждая исключённая левая граница больше не нужна.

## Сложность

- Время `O(n)`: каждый элемент входит и выходит не более одного раза.
- Память `O(1)`, `O(alphabet)` или `O(k)`.

## Почему отрицательные числа ломают sum window?

При положительных числах расширение увеличивает сумму, сжатие уменьшает. При отрицательных эта монотонность исчезает.

Для exact sum с отрицательными обычно нужен prefix sum + `HashMap`.

## Типичные ошибки

- Использовать `if` вместо `while` для восстановления валидности.
- Ошибка длины: `right - left + 1`.
- Обновить minimum после разрушения валидного окна.
- Пересчитывать всё окно каждый раз.
- Путать substring, subsequence и subset.
- Применять sum-window к отрицательным числам.

## Задачи

- LC 3 — Longest Substring Without Repeating Characters.
- LC 209 — Minimum Size Subarray Sum.
- LC 424 — Longest Repeating Character Replacement.
- LC 567 — Permutation in String.
- LC 438 — Find All Anagrams in a String.

---

# 9. Prefix Sums и Difference Array

## Какую задачу решает

Prefix sum представляет агрегат диапазона как разность состояний границ:

```text
sum(left until right) = prefix[right] - prefix[left]
```

Используется для:

- range queries;
- exact subarray sum;
- count/longest subarray;
- balance categories;
- prefix/suffix products;
- массовых range updates.

## Prefix array

```kotlin
fun buildPrefix(nums: IntArray): LongArray {
    val prefix = LongArray(nums.size + 1)

    for (i in nums.indices) {
        prefix[i + 1] = prefix[i] + nums[i]
    }

    return prefix
}

fun rangeSum(
    prefix: LongArray,
    left: Int,
    rightExclusive: Int,
): Long {
    return prefix[rightExclusive] - prefix[left]
}
```

Сложность:

- построение `O(n)`;
- запрос `O(1)`;
- память `O(n)`.

## Prefix sum + HashMap

Для количества подмассивов с суммой `k`:

```kotlin
fun subarraySum(nums: IntArray, k: Int): Int {
    val countByPrefix = HashMap<Long, Int>()
    countByPrefix[0L] = 1

    var prefix = 0L
    var answer = 0

    for (value in nums) {
        prefix += value
        answer += countByPrefix.getOrDefault(
            prefix - k.toLong(),
            0,
        )
        countByPrefix[prefix] =
            countByPrefix.getOrDefault(prefix, 0) + 1
    }

    return answer
}
```

Поскольку:

```text
currentPrefix - previousPrefix = k
previousPrefix = currentPrefix - k
```

Сложность:

- время `O(n)` в среднем;
- память `O(n)`.

## Difference array

Для большого числа обновлений диапазона:

```kotlin
// размер n + 1, а не n: при right == n - 1 индекс right + 1 равен n
val diff = IntArray(n + 1)

fun update(left: Int, right: Int, value: Int) {
    diff[left] += value
    diff[right + 1] -= value
}

// после всех обновлений: prefix sum восстанавливает итоговые значения
fun build(): IntArray {
    val result = IntArray(n)
    var running = 0
    for (i in 0 until n) {
        running += diff[i]
        result[i] = running
    }
    return result
}
```

Единственная ловушка здесь — размер массива. `IntArray(n)` кажется естественным, но обновление
последнего элемента пишет в `diff[n]` и падает. Лишняя ячейка — не запас, а часть алгоритма.

Сложность:

- каждое обновление `O(1)`;
- восстановление `O(n)`;
- память `O(n)`.

Подходит, если ответы нужны после batch обновлений. Для online updates/queries нужны Fenwick/segment tree, обычно выше уровня базового Android-интервью.

## Типичные ошибки

- Не добавить нулевой prefix.
- Перепутать inclusive/exclusive границы.
- Добавить текущий prefix в map до подсчёта.
- Хранить presence вместо count.
- Для longest хранить последний индекс, хотя нужен первый.
- Использовать `Int` для суммы.

## Задачи

- LC 303 — Range Sum Query.
- LC 724 — Find Pivot Index.
- LC 560 — Subarray Sum Equals K.
- LC 525 — Contiguous Array.
- LC 974 — Subarray Sums Divisible by K.

---

# 10. Binary Search

## Какую задачу решает

Binary search ищет границу в монотонном пространстве:

- target в sorted array;
- first/last occurrence;
- lower/upper bound;
- minimum feasible answer;
- rotated array;
- peak/pivot.

Ключевая идея — монотонный predicate, а не только «массив отсортирован».

## Lower bound

Индекс первого элемента `>= target`:

```kotlin
fun lowerBound(nums: IntArray, target: Int): Int {
    var left = 0
    var right = nums.size

    while (left < right) {
        val mid = left + (right - left) / 2

        if (nums[mid] < target) {
            left = mid + 1
        } else {
            right = mid
        }
    }

    return left
}
```

Используется полуинтервал `[left, right)`.

Invariant:

- индексы `< left` точно меньше target;
- ответ находится в `[left, right]`;
- при завершении `left == right`.

## Binary search on answer

```kotlin
fun firstFeasible(
    low: Long,
    high: Long,
    feasible: (Long) -> Boolean,
): Long {
    var left = low
    var right = high

    while (left < right) {
        val mid = left + (right - left) / 2

        if (feasible(mid)) {
            right = mid
        } else {
            left = mid + 1
        }
    }

    return left
}
```

Применяется для «минимальной скорости/ёмкости/времени, при которой возможно».

## Сложность

По массиву:

- время `O(log n)`;
- память `O(1)`.

По ответу:

- `O(check × log(range))`;
- при `check = O(n)` итог `O(n log range)`.

## Типичные ошибки

- Смешать `[left, right]` и `[left, right)` templates.
- Бесконечный цикл через `left = mid`.
- Не проверить index после lower bound.
- Не доказать монотонность `feasible`.
- Выбрать `high`, который не гарантированно feasible.
- Overflow midpoint или проверки.
- Путать любое совпадение и первую позицию.

## Задачи

- LC 704 — Binary Search.
- LC 35 — Search Insert Position.
- LC 34 — First and Last Position.
- LC 33 — Search in Rotated Sorted Array.
- LC 875 — Koko Eating Bananas.
- LC 1011 — Capacity to Ship Packages.

---

# 11. Intervals

## Какую задачу решает

Интервальные задачи:

- merge;
- insert;
- intersection;
- minimum removals;
- meeting rooms;
- maximum overlap.

## Когда применять

Вход выглядит как `[start, end]`, в условии есть расписания, бронирования, покрытия или конфликты. Почти всегда полезна сортировка по `start` или `end`.

## Merge intervals

```kotlin
fun merge(
    intervals: Array<IntArray>,
): Array<IntArray> {
    if (intervals.isEmpty()) return emptyArray()

    intervals.sortWith(
        compareBy<IntArray> { it[0] }
            .thenBy { it[1] },
    )

    val result = ArrayList<IntArray>()
    var start = intervals[0][0]
    var end = intervals[0][1]

    for (i in 1 until intervals.size) {
        val nextStart = intervals[i][0]
        val nextEnd = intervals[i][1]

        if (nextStart <= end) {
            end = maxOf(end, nextEnd)
        } else {
            result.add(intArrayOf(start, end))
            start = nextStart
            end = nextEnd
        }
    }

    result.add(intArrayOf(start, end))
    return result.toTypedArray()
}
```

Invariant:

> Результат содержит окончательные merged intervals префикса; только текущий последний диапазон ещё может расшириться.

## Greedy removal

Чтобы оставить максимум непересекающихся интервалов, сортируют по `end` и выбирают заканчивающийся раньше. Он оставляет больше пространства будущим.

## Сложность

- сортировка `O(n log n)`;
- scan `O(n)`;
- память `O(n)` для результата;
- если сортируется вход, auxiliary memory зависит от реализации.

## Типичные ошибки

- Не уточнить, пересекаются ли `[1,2]` и `[2,3]`.
- Сортировать по неверной границе.
- Использовать `end = nextEnd` вместо `maxOf`.
- Забыть последний интервал.
- Двигать оба указателя в intersection двух списков.
- Не учесть мутацию input.

## Задачи

- LC 56 — Merge Intervals.
- LC 57 — Insert Interval.
- LC 435 — Non-overlapping Intervals.
- LC 986 — Interval List Intersections.
- Meeting Rooms I/II.

---

# 12. Stack, Deque и Monotonic Stack

## 12.1. Обычный stack

Решает задачи с последним незавершённым элементом:

- скобки;
- вложенность;
- undo;
- expression evaluation;
- iterative DFS;
- decode string.

Valid Parentheses:

```kotlin
fun isValid(s: String): Boolean {
    val stack = java.util.ArrayDeque<Char>()

    for (ch in s) {
        when (ch) {
            '(', '[', '{' -> stack.addLast(ch)
            ')' -> if (stack.pollLast() != '(') return false
            ']' -> if (stack.pollLast() != '[') return false
            '}' -> if (stack.pollLast() != '{') return false
        }
    }

    return stack.isEmpty()
}
```

Сложность:

- время `O(n)`;
- память `O(n)`.

## 12.2. Deque

Deque поддерживает оба конца за `O(1)` и используется для:

- queue/BFS;
- sliding-window maximum;
- монотонной очереди;
- обработки с обоих концов.

## 12.3. Monotonic stack

Решает:

- next greater/smaller;
- previous greater/smaller;
- Daily Temperatures;
- stock span;
- histogram boundaries.

```kotlin
fun nextGreater(nums: IntArray): IntArray {
    val answer = IntArray(nums.size) { -1 }
    val stack = java.util.ArrayDeque<Int>()

    for (i in nums.indices) {
        while (
            stack.isNotEmpty() &&
            nums[stack.peekLast()] < nums[i]
        ) {
            val previous = stack.removeLast()
            answer[previous] = nums[i]
        }

        stack.addLast(i)
    }

    return answer
}
```

Invariant: значения по индексам в stack **не возрастают** (нестрого убывают); для них ответ ещё
не найден. Нестрого — потому что условие выталкивания строгое (`nums[peek] < nums[i]`), поэтому
равные значения остаются в стеке и получают ответ от первого строго большего справа. Если задача
просит «следующий больший или равный», условие меняется на `<=`, и стек становится строго
убывающим. Это ровно та подмена знака, из-за которой решения расходятся на дубликатах, —
проверяйте её на входе вида `[2, 2, 3]` прежде, чем отдавать код.

Хотя есть вложенный `while`, каждый индекс добавляется и удаляется один раз:

- время `O(n)`;
- память `O(n)`.

## 12.4. Monotonic deque: window maximum

Хранит индексы в порядке невозрастания значений. Первый всегда является максимумом текущего окна.

```kotlin
fun maxSlidingWindow(nums: IntArray, k: Int): IntArray {
    require(k in 1..nums.size)
    val result = IntArray(nums.size - k + 1)
    val deque = java.util.ArrayDeque<Int>()   // индексы, значения по ним не возрастают

    for (i in nums.indices) {
        // 1) выбросить индексы, вышедшие из окна слева
        if (deque.isNotEmpty() && deque.peekFirst() <= i - k) {
            deque.removeFirst()
        }
        // 2) выбросить с хвоста всех, кто меньше нового: они уже никогда не станут максимумом
        while (deque.isNotEmpty() && nums[deque.peekLast()] < nums[i]) {
            deque.removeLast()
        }
        deque.addLast(i)
        // 3) окно набралось — голова деки и есть максимум
        if (i >= k - 1) {
            result[i - k + 1] = nums[deque.peekFirst()]
        }
    }

    return result
}
```

Три момента, из которых состоит вся задача, и каждый — источник бага:

- **Хранятся индексы, а не значения.** Иначе невозможно понять, что элемент вышел из окна.
- **Достаточно одного `if` на шаге 1, а не `while`.** За итерацию окно сдвигается на единицу,
  поэтому устареть может максимум один индекс. `while` тоже правильный, но `if` показывает,
  что вы понимаете инвариант.
- **Строгое `<` на шаге 2** оставляет равные значения в деке. Это нужно: если выбросить равный,
  а потом «старший» уйдёт из окна, максимум будет потерян. Проверьте на `[1, 1]` при `k = 2`.

Сложность:

- время `O(n)` — каждый индекс входит и выходит один раз;
- память `O(k)`.

## Типичные ошибки

- Хранить значения вместо индексов, когда нужен срок жизни.
- Перепутать `<` и `<=` при дубликатах.
- Объявить nested while квадратичным.
- Не удалить устаревший индекс.
- В circular problem повторно добавить индексы на второй половине.
- Забыть очистить stack в конце histogram algorithm.

## Задачи

- LC 20 — Valid Parentheses.
- LC 155 — Min Stack.
- LC 150 — Evaluate Reverse Polish Notation.
- LC 496 — Next Greater Element I.
- LC 739 — Daily Temperatures.
- LC 901 — Online Stock Span.
- LC 239 — Sliding Window Maximum.

---

# 13. Linked Lists

## Модель

```kotlin
class ListNode(
    var value: Int,
    var next: ListNode? = null,
)
```

Основные техники:

- `prev/current/next`;
- dummy node;
- slow/fast;
- фиксированное расстояние между pointers;
- merge.

## Reverse linked list

```kotlin
fun reverseList(head: ListNode?): ListNode? {
    var previous: ListNode? = null
    var current = head

    while (current != null) {
        val next = current.next
        current.next = previous
        previous = current
        current = next
    }

    return previous
}
```

Invariant:

- `previous` — развёрнутая часть;
- `current` — первый необработанный узел;
- оставшаяся цепочка сохранена через `next`.

Сложность:

- время `O(n)`;
- память `O(1)`.

## Fast and slow pointers

Применяются для:

- середины;
- цикла;
- начала цикла;
- разделения списка.

```kotlin
fun hasCycle(head: ListNode?): Boolean {
    var slow = head
    var fast = head

    while (fast?.next != null) {
        slow = slow?.next
        fast = fast.next?.next

        if (slow === fast) return true
    }

    return false
}
```

Время `O(n)`, память `O(1)`.

## Dummy node

Убирает отдельную обработку head при merge/delete:

```kotlin
fun mergeTwoLists(
    first: ListNode?,
    second: ListNode?,
): ListNode? {
    var left = first
    var right = second
    val dummy = ListNode(0)
    var tail = dummy

    while (left != null && right != null) {
        if (left.value <= right.value) {
            tail.next = left
            left = left.next
        } else {
            tail.next = right
            right = right.next
        }
        tail = tail.next!!
    }

    tail.next = left ?: right
    return dummy.next
}
```

## Типичные ошибки

- Перезаписать `next`, не сохранив остаток.
- Сравнивать nodes структурно вместо `===`.
- Создать цикл при перестановке.
- Использовать глубокую рекурсию.
- Неверно выдержать расстояние для N-th from end.
- Изменить values, хотя требуется переставить nodes.

## Задачи

- LC 206 — Reverse Linked List.
- LC 21 — Merge Two Sorted Lists.
- LC 141 — Linked List Cycle.
- LC 876 — Middle of the Linked List.
- LC 19 — Remove Nth Node From End.
- LC 2 — Add Two Numbers.
- LC 143 — Reorder List.

---

# 14. Trees и BST

## Модель

```kotlin
class TreeNode(
    var value: Int,
    var left: TreeNode? = null,
    var right: TreeNode? = null,
)
```

## Как выбирать traversal

- Preorder: родитель передаёт состояние детям.
- Inorder: sorted order для BST.
- Postorder: результат node зависит от children.
- BFS: уровни и минимальная глубина.

Для рекурсивной функции ответьте:

1. Что она получает?
2. Что возвращает?
3. Что означает `null`?
4. Как объединяются результаты children?

## Maximum depth

```kotlin
fun maxDepth(root: TreeNode?): Int {
    if (root == null) return 0
    return 1 + maxOf(
        maxDepth(root.left),
        maxDepth(root.right),
    )
}
```

Сложность:

- время `O(n)`;
- память `O(h)` call stack;
- worst case `O(n)` для цепочки.

## Level-order BFS

```kotlin
fun levelOrder(root: TreeNode?): List<List<Int>> {
    if (root == null) return emptyList()

    val result = ArrayList<List<Int>>()
    val queue = java.util.ArrayDeque<TreeNode>()
    queue.addLast(root)

    while (queue.isNotEmpty()) {
        val levelSize = queue.size
        val level = ArrayList<Int>(levelSize)

        repeat(levelSize) {
            val node = queue.removeFirst()
            level.add(node.value)
            node.left?.let(queue::addLast)
            node.right?.let(queue::addLast)
        }

        result.add(level)
    }

    return result
}
```

Сложность:

- время `O(n)`;
- память `O(w)`, где `w` — максимальная ширина.

## Validate BST

Проверка только непосредственных children неверна. Ограничения приходят от всех ancestors.

```kotlin
fun isValidBst(root: TreeNode?): Boolean {
    fun validate(
        node: TreeNode?,
        lowerExclusive: Long,
        upperExclusive: Long,
    ): Boolean {
        if (node == null) return true

        val value = node.value.toLong()
        if (value <= lowerExclusive || value >= upperExclusive) {
            return false
        }

        return validate(node.left, lowerExclusive, value) &&
            validate(node.right, value, upperExclusive)
    }

    return validate(
        root,
        Long.MIN_VALUE,
        Long.MAX_VALUE,
    )
}
```

Время `O(n)`, память `O(h)`.

## Типичные ошибки

- Считать любое binary tree BST.
- Проверять только parent-child.
- Не определить policy дубликатов.
- Забыть call stack в space complexity.
- Получить stack overflow на вырожденном дереве.
- В BFS менять `queue.size` внутри обработки уровня.
- Путать depth в edges и nodes.

## Задачи

- LC 104 — Maximum Depth.
- LC 100 — Same Tree.
- LC 226 — Invert Binary Tree.
- LC 102 — Level Order Traversal.
- LC 98 — Validate BST.
- LC 230 — Kth Smallest in BST.
- LC 236 — Lowest Common Ancestor.
- LC 199 — Right Side View.

---

# 15. Heap и Top-K

Heap поддерживает быстрый доступ к минимальному или максимальному элементу. На JVM используется `PriorityQueue`, по умолчанию min-heap.

## Какую задачу решает

- Top-K.
- K-th largest/smallest.
- Текущий minimum/maximum в stream.
- Merge sorted streams.
- Scheduling по приоритету.
- Dijkstra.

## Top-K invariant

Для `k` наибольших элементов поддерживаем min-heap размера `k`:

> Heap содержит лучшие `k` элементов обработанного префикса, а его вершина — худший среди них.

```kotlin
fun findKthLargest(
    nums: IntArray,
    k: Int,
): Int {
    require(k in 1..nums.size)

    val heap = java.util.PriorityQueue<Int>()

    for (value in nums) {
        heap.offer(value)

        if (heap.size > k) {
            heap.poll()
        }
    }

    return heap.peek()
}
```

## Сложность

- Время `O(n log k)`.
- Дополнительная память `O(k)`.

Полная сортировка:

- время `O(n log n)`;
- heap лучше при `k << n`.

Важная оговорка про JVM, которая идёт вразрез с советом раздела 3 про примитивы: `PriorityQueue<Int>`
**боксит каждый элемент**. Примитивной кучи в stdlib нет, и это осознанный компромисс — на интервью
читаемость важнее, а `O(n log k)` от боксинга не меняется. Но если в задаче стоят жёсткие ограничения
или интервьюер спрашивает про аллокации, назовите альтернативы: своя куча на `IntArray`,
`it.unimi.dsi.fastutil` в проде или quickselect, который вообще не аллоцирует.

### Quickselect

Даёт `O(n)` в среднем (и `O(n²)` в худшем случае), но меняет входной массив:

```kotlin
import kotlin.random.Random

fun findKthLargestQuickselect(nums: IntArray, k: Int): Int {
    require(k in 1..nums.size)
    val target = nums.size - k          // k-й наибольший = элемент с этим индексом по возрастанию
    var left = 0
    var right = nums.size - 1

    while (true) {
        if (left == right) return nums[left]
        val pivotIndex = partition(nums, left, right)
        when {
            pivotIndex == target -> return nums[pivotIndex]
            pivotIndex < target -> left = pivotIndex + 1
            else -> right = pivotIndex - 1
        }
    }
}

private fun partition(nums: IntArray, left: Int, right: Int): Int {
    // случайный опорный элемент защищает от O(n²) на отсортированном входе
    val random = left + Random.nextInt(right - left + 1)
    swap(nums, random, right)

    val pivot = nums[right]
    var boundary = left
    for (i in left until right) {
        if (nums[i] < pivot) {
            swap(nums, i, boundary)
            boundary++
        }
    }
    swap(nums, boundary, right)
    return boundary
}

private fun swap(nums: IntArray, i: Int, j: Int) {
    val tmp = nums[i]; nums[i] = nums[j]; nums[j] = tmp
}
```

Рандомизация опорного элемента — не украшение: без неё на уже отсортированном массиве
(частый тест) получите `O(n²)`. И обязательно спросите, можно ли менять вход: quickselect
переставляет элементы, и если нельзя — придётся копировать, теряя преимущество по памяти.

## K-way merge

В heap хранится текущий минимальный элемент каждого sorted source. После извлечения добавляется
следующий элемент того же source.

```kotlin
private data class MergeEntry(val value: Int, val listIndex: Int, val itemIndex: Int)

fun mergeKSorted(lists: List<IntArray>): IntArray {
    val heap = java.util.PriorityQueue<MergeEntry>(compareBy { it.value })
    var total = 0

    for ((listIndex, list) in lists.withIndex()) {
        total += list.size
        if (list.isNotEmpty()) {
            heap.offer(MergeEntry(list[0], listIndex, 0))
        }
    }

    val result = IntArray(total)
    var written = 0

    while (heap.isNotEmpty()) {
        val entry = heap.poll()
        result[written++] = entry.value

        val nextIndex = entry.itemIndex + 1
        val source = lists[entry.listIndex]
        if (nextIndex < source.size) {
            heap.offer(MergeEntry(source[nextIndex], entry.listIndex, nextIndex))
        }
    }

    return result
}
```

Ключевая идея — в куче всегда не больше `k` элементов, по одному «голова» от каждого списка,
поэтому память не зависит от общего объёма данных. Пустые списки нельзя добавлять в кучу: это
второй по частоте баг после забытого продвижения индекса.

Для `k` списков и `N` общих элементов:

- время `O(N log k)`;
- heap memory `O(k)`;
- плюс output.

## Типичные ошибки

- Перепутать min/max heap.
- Хранить все `n` элементов при Top-K.
- Comparator через вычитание.
- Ожидать sorted iteration по `PriorityQueue`.
- Считать `remove(value)` логарифмическим.
- Не определить tie-breaking.
- Использовать heap для одного обычного maximum.

## Задачи

- LC 703 — Kth Largest in a Stream.
- LC 215 — Kth Largest in an Array.
- LC 347 — Top K Frequent Elements.
- LC 973 — K Closest Points.
- LC 373 — K Pairs with Smallest Sums.
- LC 23 — Merge K Sorted Lists как следующий уровень.

---

# 16. Grid traversal

Grid — неявный граф:

- клетка — вершина;
- допустимое перемещение — ребро.

## Какую задачу решает

- number of islands;
- flood fill;
- connected region;
- shortest path;
- распространение по времени;
- reachability from boundary.

## DFS по grid

Подходит для component/area. Можно использовать `visited` или изменять grid.

Время:

- `O(rows × cols)`.

Память:

- `O(rows × cols)` для visited/stack worst case;
- без отдельного visited при допустимой мутации входа, но recursion stack остаётся.

## BFS по grid

```kotlin
private val dr = intArrayOf(-1, 1, 0, 0)
private val dc = intArrayOf(0, 0, -1, 1)

fun gridDistances(
    grid: Array<IntArray>,
    startRow: Int,
    startCol: Int,
): Array<IntArray> {
    val rows = grid.size
    require(rows > 0)
    val cols = grid[0].size
    // кодирование id как row * cols + col корректно только для прямоугольной сетки
    require(grid.all { it.size == cols }) { "сетка должна быть прямоугольной" }

    val distance = Array(rows) {
        IntArray(cols) { -1 }
    }
    val queue = java.util.ArrayDeque<Int>()

    // старт может оказаться стеной — тогда достижимых клеток нет вовсе
    if (grid[startRow][startCol] == 0) return distance

    distance[startRow][startCol] = 0
    queue.addLast(startRow * cols + startCol)

    while (queue.isNotEmpty()) {
        val id = queue.removeFirst()
        val row = id / cols
        val col = id % cols

        for (direction in 0 until 4) {
            val nextRow = row + dr[direction]
            val nextCol = col + dc[direction]

            if (nextRow !in 0 until rows) continue
            if (nextCol !in 0 until cols) continue
            if (grid[nextRow][nextCol] == 0) continue
            if (distance[nextRow][nextCol] != -1) continue

            distance[nextRow][nextCol] =
                distance[row][col] + 1
            queue.addLast(nextRow * cols + nextCol)
        }
    }

    return distance
}
```

Помечайте visited при добавлении в очередь. Иначе несколько соседей добавят одну клетку повторно.

## Multi-source BFS

Все источники добавляются в queue с distance/time `0`. BFS моделирует одновременное распространение.

Используется в:

- Rotting Oranges;
- distance to nearest zero;
- распространении инфекции;
- nearest facility.

Сложность остаётся `O(rows × cols)`.

## Типичные ошибки

- Перепутать rows/cols.
- Не обработать empty grid.
- Случайно разрешить диагонали.
- Mark visited при извлечении.
- Запустить рекурсивный DFS на сетке из миллиона клеток.
- Создавать `Pair` на каждую координату при жёстком лимите.
- Для shortest path использовать DFS вместо BFS.

## Задачи

- LC 733 — Flood Fill.
- LC 200 — Number of Islands.
- LC 695 — Max Area of Island.
- LC 994 — Rotting Oranges.
- LC 542 — 01 Matrix.
- LC 130 — Surrounded Regions.

---

# 17. Graph BFS и DFS

## Представление графа

Список смежности:

- память `O(V + E)`;
- перебор neighbours `O(degree)`;
- основной вариант для sparse graph.

Матрица смежности:

- память `O(V²)`;
- проверка ребра `O(1)`;
- подходит для маленького плотного graph.

Список рёбер:

- память `O(E)`;
- удобен для Kruskal/Bellman-Ford.

## BFS

Используйте для:

- shortest path в unweighted graph;
- minimum number of transitions;
- levels;
- nearest target.

```kotlin
fun bfs(
    graph: Array<IntArray>,
    source: Int,
): IntArray {
    val distance = IntArray(graph.size) { -1 }
    val queue = java.util.ArrayDeque<Int>()

    distance[source] = 0
    queue.addLast(source)

    while (queue.isNotEmpty()) {
        val vertex = queue.removeFirst()

        for (next in graph[vertex]) {
            if (distance[next] != -1) continue

            distance[next] = distance[vertex] + 1
            queue.addLast(next)
        }
    }

    return distance
}
```

Invariant:

> При первом обнаружении вершины её distance минимальна при одинаковой стоимости рёбер.

## DFS

Используйте для:

- reachability;
- connected components;
- cycle detection;
- postorder;
- path enumeration.

Итеративный вариант:

```kotlin
fun dfs(
    graph: Array<IntArray>,
    source: Int,
): BooleanArray {
    val visited = BooleanArray(graph.size)
    val stack = java.util.ArrayDeque<Int>()
    stack.addLast(source)

    while (stack.isNotEmpty()) {
        val vertex = stack.removeLast()
        if (visited[vertex]) continue

        visited[vertex] = true

        for (next in graph[vertex]) {
            if (!visited[next]) {
                stack.addLast(next)
            }
        }
    }

    return visited
}
```

## Сложность

Для adjacency list:

- время `O(V + E)`;
- дополнительная память `O(V)`;
- хранение graph `O(V + E)`.

Неориентированное ребро обычно хранится дважды, но asymptotic оценка та же.

## Cycle detection

В directed DFS применяют цвета:

- `0` — не посещена;
- `1` — в активном пути;
- `2` — полностью обработана.

Ребро в вершину цвета `1` означает cycle.

Для undirected graph нужно игнорировать ребро обратно в parent.

## Типичные ошибки

- Добавить одну сторону undirected edge.
- Считать graph connected и запустить только из `0`.
- Применить BFS к разным весам.
- Смешать active и completed state.
- Рекурсивный DFS для `100 000` vertices.
- Materialize огромный implicit graph.

## Задачи

- LC 1971 — Find if Path Exists.
- LC 547 — Number of Provinces.
- LC 133 — Clone Graph.
- LC 841 — Keys and Rooms.
- LC 785 — Is Graph Bipartite.
- LC 433 — Minimum Genetic Mutation.

---

# 18. Topological Sort и Union-Find

## 18.1. Topological sort

Решает порядок зависимостей в DAG:

- courses;
- build steps;
- modules;
- recipes;
- tasks.

### Kahn algorithm

`indegree[v]` — число оставшихся dependencies.

```kotlin
fun topologicalSort(
    graph: Array<IntArray>,
): IntArray? {
    val indegree = IntArray(graph.size)

    for (from in graph.indices) {
        for (to in graph[from]) {
            indegree[to]++
        }
    }

    val queue = java.util.ArrayDeque<Int>()
    for (vertex in graph.indices) {
        if (indegree[vertex] == 0) {
            queue.addLast(vertex)
        }
    }

    val order = IntArray(graph.size)
    var size = 0

    while (queue.isNotEmpty()) {
        val vertex = queue.removeFirst()
        order[size++] = vertex

        for (next in graph[vertex]) {
            indegree[next]--
            if (indegree[next] == 0) {
                queue.addLast(next)
            }
        }
    }

    return if (size == graph.size) order else null
}
```

Если обработано меньше `V`, существует cycle.

Сложность:

- время `O(V + E)`;
- память `O(V + E)` вместе с graph.

## Типичные ошибки

- перепутать направление prerequisite;
- забыть isolated vertices;
- считать order уникальным;
- вернуть partial order при cycle.

## Задачи

- LC 207 — Course Schedule.
- LC 210 — Course Schedule II.
- LC 802 — Eventual Safe States.

## 18.2. Union-Find / DSU

Поддерживает:

- объединение components;
- проверку connectivity;
- cycle при добавлении edges;
- count components;
- Kruskal MST.

Не восстанавливает path и плохо поддерживает удаления.

```kotlin
class Dsu(size: Int) {
    private val parent = IntArray(size) { it }
    private val componentSize = IntArray(size) { 1 }

    var components: Int = size
        private set

    fun find(vertex: Int): Int {
        var root = vertex

        while (root != parent[root]) {
            root = parent[root]
        }

        var current = vertex
        while (current != root) {
            val next = parent[current]
            parent[current] = root
            current = next
        }

        return root
    }

    fun union(first: Int, second: Int): Boolean {
        var firstRoot = find(first)
        var secondRoot = find(second)

        if (firstRoot == secondRoot) return false

        if (
            componentSize[firstRoot] <
            componentSize[secondRoot]
        ) {
            val temporary = firstRoot
            firstRoot = secondRoot
            secondRoot = temporary
        }

        parent[secondRoot] = firstRoot
        componentSize[firstRoot] +=
            componentSize[secondRoot]
        components--
        return true
    }
}
```

Path compression + union by size:

- `find/union`: амортизированно `O(α(V))`, практически constant;
- память `O(V)`.

## Типичные ошибки

- сравнивать `parent[a]` вместо `find(a)`;
- обновить size не-root;
- забыть components--;
- ожидать удаления edges;
- забыть преобразовать 1-based indices.

## Задачи

- LC 547 — Number of Provinces.
- LC 684 — Redundant Connection.
- LC 721 — Accounts Merge.
- LC 990 — Satisfiability of Equality Equations.

---

# 19. Shortest Paths

Выбор зависит от weights:

- одинаковый вес → BFS;
- веса `0/1` → 0-1 BFS;
- неотрицательные → Dijkstra;
- отрицательные → Bellman-Ford;
- DAG → topological order.

## Dijkstra

```kotlin
data class WeightedEdge(
    val to: Int,
    val weight: Int,
)

data class DistanceState(
    val vertex: Int,
    val distance: Long,
)

fun dijkstra(
    graph: Array<List<WeightedEdge>>,
    source: Int,
): LongArray {
    val infinity = Long.MAX_VALUE / 4
    val distance = LongArray(graph.size) { infinity }
    val queue = java.util.PriorityQueue<DistanceState>(
        compareBy { it.distance },
    )

    distance[source] = 0L
    queue.offer(DistanceState(source, 0L))

    while (queue.isNotEmpty()) {
        val current = queue.poll()
        val vertex = current.vertex

        if (current.distance != distance[vertex]) continue

        for (edge in graph[vertex]) {
            val candidate =
                current.distance + edge.weight.toLong()

            if (candidate < distance[edge.to]) {
                distance[edge.to] = candidate
                queue.offer(
                    DistanceState(edge.to, candidate),
                )
            }
        }
    }

    return distance
}
```

В queue могут быть stale records. Их проще пропустить, чем удалять произвольную старую запись.

## Invariant

> Извлечённая актуальная вершина имеет окончательное minimum distance при неотрицательных weights.

## Сложность

С binary heap и adjacency list:

- время `O((V + E) log V)`;
- память `O(V + E)` для graph/distances/queue.

## Восстановление path

При relaxation:

```kotlin
parent[edge.to] = vertex
```

После завершения идти от target к source и развернуть список.

## Типичные ошибки

- Dijkstra с отрицательными weights.
- Distance в `Int`.
- Не пропускать stale queue records.
- Пометить vertex окончательной при добавлении, а не извлечении.
- Использовать Dijkstra, где достаточно BFS.
- Прибавить к `Long.MAX_VALUE`.

## Задачи

- LC 743 — Network Delay Time.
- LC 1631 — Path With Minimum Effort.
- LC 787 — Cheapest Flights Within K Stops. **Исключение, а не применение Dijkstra:** ограничение
  «не больше K пересадок» ломает оптимальную подструктуру, потому что более дорогой путь с меньшим
  числом пересадок может оказаться единственным допустимым. Чистый Dijkstra по `dist[v]` даст
  неверный ответ. Нужно либо расширить состояние до `(вершина, число пересадок)`, либо взять
  Bellman-Ford на `k + 1` итераций. Полезная задача именно тем, что учит замечать, когда жадное
  «первый извлечённый — окончательный» перестаёт работать.
- LC 752 — Open the Lock, BFS.
- Word Ladder, BFS.

---

# 20. Backtracking

## Какую задачу решает

Перебирает пространство вариантов с откатом:

- subsets;
- permutations;
- combinations;
- partitions;
- board search;
- constraint placement.

## Когда применять

- Нужно вернуть все варианты.
- На каждом шаге есть выбор.
- Partial solution можно отклонить.
- `n` мало.
- Размер ответа потенциально exponential.

## Механизм

1. Сделать выбор.
2. Изменить current state.
3. Рекурсивно продолжить.
4. Полностью undo.

Invariant:

> При входе в вызов current state является корректным префиксом решения.

## Permutations

```kotlin
fun permutations(
    values: IntArray,
): List<List<Int>> {
    val result = ArrayList<List<Int>>()
    val current = ArrayList<Int>(values.size)
    val used = BooleanArray(values.size)

    fun search() {
        if (current.size == values.size) {
            result.add(ArrayList(current))
            return
        }

        for (index in values.indices) {
            if (used[index]) continue

            used[index] = true
            current.add(values[index])

            search()

            current.removeAt(current.lastIndex)
            used[index] = false
        }
    }

    search()
    return result
}
```

Копия `ArrayList(current)` обязательна.

## Сложность

- Subsets: время `O(n × 2ⁿ)` с копированием, решений `2ⁿ`.
- Permutations: `O(n × n!)`.
- Combinations: `O(C(n,k) × k)`.
- Рабочая память обычно `O(depth)`, не считая result.

## Pruning

Не продолжайте ветку, если:

- не хватает элементов;
- сумма уже слишком велика при положительных числах;
- нарушено constraint;
- prefix отсутствует в trie;
- найдено решение и другие не нужны.

## Дубликаты

Частый подход:

1. отсортировать;
2. на одном recursion level пропускать одинаковый value после первого;
3. не смешивать это с global `used`.

## Типичные ошибки

- Не undo.
- Добавить ссылку current вместо копии.
- Global state не очищается между вызовами.
- Не оценить exponential result.
- Слишком глубокая recursion.
- Создавать substring/list на каждом уровне без необходимости.
- Неправильно пропускать duplicates.

## Задачи

- LC 78 — Subsets.
- LC 90 — Subsets II.
- LC 46 — Permutations.
- LC 39 — Combination Sum.
- LC 22 — Generate Parentheses.
- LC 17 — Letter Combinations.
- LC 79 — Word Search.
- LC 131 — Palindrome Partitioning.

---

# 21. Greedy

Greedy выбирает locally best action. Он корректен только при доказательстве, что выбор входит хотя бы в одно optimal solution.

## Как распознать

- После сортировки можно фиксировать решение слева направо.
- Нужно maximum count intervals.
- Достаточно farthest reachable boundary.
- Exchange argument заменяет выбор optimal solution на greedy без ухудшения.

## Jump Game

```kotlin
fun canJump(nums: IntArray): Boolean {
    var farthest = 0L

    for (i in nums.indices) {
        if (i.toLong() > farthest) return false

        farthest = maxOf(
            farthest,
            i.toLong() + nums[i].toLong(),
        )

        if (farthest >= nums.lastIndex.toLong()) return true
    }

    return true
}
```

Invariant:

> Все индексы до `farthest` достижимы некоторым способом; детали пути не нужны.

Сложность:

- время `O(n)`;
- память `O(1)`.

## Interval scheduling

Тот же приём, что в разделе 11 («Greedy removal»), с другой стороны: сортировка по `end` и выбор
первого совместимого интервала. Раннее завершение оставляет максимум места будущим. Разница
формулировок только в том, что считают ответом — сколько интервалов оставили (здесь) или сколько
удалили (LC 435 в разделе 11); величины дополняют друг друга до общего числа.

Доказательство жадности стоит уметь произнести, его любят спрашивать: если оптимальное решение не
содержит интервал с самым ранним концом, его первый интервал можно заменить на наш — освободится
не меньше места, значит решение не станет хуже. Это и есть аргумент обмена (exchange argument).

Сложность:

- время `O(n log n)`;
- память зависит от сортировки.

## Когда greedy неверен

- Coin Change с произвольными denominations.
- Weighted interval scheduling.
- Многие min/max path задачи.
- Когда локальный выбор влияет на будущие возможности непредсказуемо.

Если нет exchange/stay-ahead доказательства, рассмотрите DP.

## Типичные ошибки

- «Берём максимальный» без доказательства.
- Сортировка по start вместо end.
- Путать reachability и minimum steps.
- Не уточнить boundary overlap.
- Применять канонический coin greedy к произвольным coins.

## Задачи

- LC 55 — Jump Game.
- LC 45 — Jump Game II.
- LC 435 — Non-overlapping Intervals.
- LC 452 — Minimum Arrows.
- LC 134 — Gas Station.
- LC 763 — Partition Labels.

---

# 22. Dynamic Programming: базовый подход

DP применяется, когда:

- подзадачи повторяются;
- решение имеет optimal substructure;
- recursion перебирает одни состояния многократно;
- требуется count/min/max/feasibility.

## Пять вопросов DP

1. Что означает state?
2. Какой transition?
3. Какие base cases?
4. В каком порядке считать?
5. Где находится final answer?

Сложность:

```text
число states × стоимость transition
```

## Top-down

Рекурсия + memoization.

Плюсы:

- естественная структура;
- вычисляются только reachable states.

Минусы:

- call stack;
- function overhead;
- stack overflow;
- иногда сложнее контролировать iteration order.

## Bottom-up

Tabulation.

Плюсы:

- нет recursion;
- проще оптимизировать память;
- часто быстрее на JVM.

Минусы:

- нужно определить правильный порядок;
- иногда считаются лишние states.

## 1D DP: Climbing Stairs

```kotlin
fun climbStairs(n: Int): Long {
    require(n >= 0) { "отрицательное число ступеней бессмысленно" }
    if (n <= 1) return 1L

    var previous2 = 1L
    var previous1 = 1L

    for (step in 2..n) {
        val current = previous1 + previous2
        previous2 = previous1
        previous1 = current
    }

    return previous1
}
```

State: количество способов дойти до step.

Transition:

```text
dp[i] = dp[i - 1] + dp[i - 2]
```

Сложность:

- время `O(n)`;
- память `O(1)` после compression.

Про тип возвращаемого значения: `Long` взят не случайно — это последовательность Фибоначчи, и в `Int`
она переполняется уже около `n = 46`. Но `Long` лишь отодвигает границу: он переполняется на
`n = 92`. Если ограничения задачи это допускают, скажите вслух, что дальше нужен `BigInteger`
или ответ по модулю. Выбрать `Long` и промолчать про его предел — половина ответа.

## House Robber

```kotlin
fun rob(nums: IntArray): Long {
    var bestBeforePrevious = 0L
    var bestPrevious = 0L

    for (value in nums) {
        val current = maxOf(
            bestPrevious,
            bestBeforePrevious + value.toLong(),
        )
        bestBeforePrevious = bestPrevious
        bestPrevious = current
    }

    return bestPrevious
}
```

Transition:

```text
dp[i] = max(skip i, take i + dp[i - 2])
```

Время `O(n)`, память `O(1)`.

Контракт стоит проговорить: старт с нулей означает «можно не грабить вообще», поэтому на массиве
из одних отрицательных чисел функция вернёт `0`. Для LC 198 это верно — там значения
неотрицательные, и «ничего не брать» — законный вариант. Но если задача требует выбрать хотя бы
один элемент (а такие переформулировки дают как follow-up), нули в инициализации придётся заменить
на `nums[0]` и `Long.MIN_VALUE`-подобный часовой. Это ровно тот случай, когда уточняющий вопрос
из раздела 1.1 экономит переписывание.

## Coin Change

```kotlin
fun coinChange(
    coins: IntArray,
    amount: Int,
): Int {
    val unreachable = amount + 1
    val dp = IntArray(amount + 1) { unreachable }
    dp[0] = 0

    for (sum in 1..amount) {
        for (coin in coins) {
            if (coin <= sum) {
                dp[sum] = minOf(
                    dp[sum],
                    dp[sum - coin] + 1,
                )
            }
        }
    }

    return if (dp[amount] == unreachable) {
        -1
    } else {
        dp[amount]
    }
}
```

Сложность:

- время `O(amount × coins.size)`;
- память `O(amount)`.

Это псевдополиномиальная сложность: зависит от числового amount, а не только длины его записи.

## Типичные ошибки

- Начать код до определения state.
- Неверный `dp[0]`.
- Recursion без memoization.
- `Int.MAX_VALUE + 1`.
- Неправильный порядок memory compression.
- Возвращать `dp.last`, когда ответ — maximum всех states.

## Задачи

- LC 70 — Climbing Stairs.
- LC 746 — Min Cost Climbing Stairs.
- LC 198 — House Robber.
- LC 213 — House Robber II.
- LC 322 — Coin Change.
- LC 139 — Word Break.
- LC 91 — Decode Ways.

---

# 23. DP: Grid, Subsequences и Knapsack

## 23.1. Grid DP

Для движения только right/down:

```text
dp[row][col] =
    value + min(top, left)
```

```kotlin
fun minPathSum(grid: Array<IntArray>): Long {
    if (grid.isEmpty() || grid[0].isEmpty()) {
        return 0L
    }

    val cols = grid[0].size
    val dp = LongArray(cols) { Long.MAX_VALUE }
    dp[0] = 0L

    for (row in grid) {
        for (col in 0 until cols) {
            val fromTop = dp[col]
            val fromLeft = if (col > 0) {
                dp[col - 1]
            } else {
                Long.MAX_VALUE
            }

            dp[col] =
                minOf(fromTop, fromLeft) + row[col]
        }
    }

    return dp.last()
}
```

Сложность:

- время `O(rows × cols)`;
- память `O(cols)`.

Важно: `dp[col]` до обновления — top, `dp[col - 1]` после обновления — left.

## 23.2. Longest Common Subsequence

State:

```text
dp[i][j] = LCS первых i и j символов
```

Transition:

- chars равны → diagonal + 1;
- иначе max(top, left).

```kotlin
fun longestCommonSubsequence(
    first: String,
    second: String,
): Int {
    val dp = IntArray(second.length + 1)

    for (i in 1..first.length) {
        var diagonal = 0

        for (j in 1..second.length) {
            val oldTop = dp[j]

            dp[j] = if (
                first[i - 1] == second[j - 1]
            ) {
                diagonal + 1
            } else {
                maxOf(dp[j], dp[j - 1])
            }

            diagonal = oldTop
        }
    }

    return dp[second.length]
}
```

Сложность:

- время `O(nm)`;
- память `O(m)`.

## 23.3. Longest Increasing Subsequence

Easy/Medium DP:

```text
dp[i] = length лучшей increasing subsequence,
        заканчивающейся в i
```

```kotlin
fun lengthOfLis(nums: IntArray): Int {
    if (nums.isEmpty()) return 0

    val dp = IntArray(nums.size) { 1 }
    var answer = 1

    for (i in nums.indices) {
        for (j in 0 until i) {
            if (nums[j] < nums[i]) {
                dp[i] = maxOf(dp[i], dp[j] + 1)
            }
        }
        answer = maxOf(answer, dp[i])
    }

    return answer
}
```

Сложность:

- время `O(n²)`;
- память `O(n)`.

Вариант с `tails + binary search`:

- время `O(n log n)`;
- память `O(n)`;
- `tails` не является самой найденной subsequence без дополнительного восстановления.

## 23.4. 0/1 Knapsack

Каждый element используется не более одного раза.

```kotlin
fun canReachSum(
    nums: IntArray,
    target: Int,
): Boolean {
    require(target >= 0 && nums.all { it >= 0 }) {
        "неотрицательные значения обязательны: при value < 0 внутренний цикл уходит в отрицательные индексы"
    }
    val dp = BooleanArray(target + 1)
    dp[0] = true

    for (value in nums) {
        for (sum in target downTo value) {
            dp[sum] = dp[sum] || dp[sum - value]
        }
    }

    return dp[target]
}
```

Capacity идёт справа налево, чтобы текущий element не использовать повторно.

Сложность:

- время `O(n × target)`;
- память `O(target)`.

Про отрицательные числа стоит сказать отдельно, потому что в задачах этого раздела стоит LC 494
Target Sum, где они есть по условию. Индекс массива не может быть отрицательным, поэтому подход
«в лоб» там не работает. Задачу сводят к knapsack сдвигом: если сумма всех чисел равна `S`, а нужно
получить `target`, то подмножество со знаком «плюс» должно давать `(S + target) / 2` — дальше это
обычный 0/1 knapsack по неотрицательным значениям. Проверьте, что `(S + target)` неотрицательно
и чётно, иначе ответ — ноль способов. Альтернатива без арифметики — сдвиг всего диапазона на `S`
и массив размера `2S + 1`, но она дороже по памяти и на интервью выглядит слабее.

## 23.5. Unbounded Knapsack

Element можно использовать многократно. Capacity идёт слева направо.

Количество комбинаций coins:

```kotlin
fun change(
    amount: Int,
    coins: IntArray,
): Long {
    val dp = LongArray(amount + 1)
    dp[0] = 1L

    for (coin in coins) {
        for (sum in coin..amount) {
            dp[sum] += dp[sum - coin]
        }
    }

    return dp[amount]
}
```

Coins во внешнем цикле считают combinations. Другой порядок циклов может считать sequences/permutations.

## Типичные ошибки

- Путать substring и subsequence.
- Потерять diagonal при compression.
- В 0/1 идти слева направо.
- В unbounded идти справа налево.
- Не учитывать огромный target.
- Вернуть `dp.last` вместо maximum.
- Не определить strict/non-strict LIS.
- Пытаться восстановить решение после memory compression без parent data.

## Задачи

- LC 62 — Unique Paths.
- LC 64 — Minimum Path Sum.
- LC 1143 — Longest Common Subsequence.
- LC 72 — Edit Distance.
- LC 300 — Longest Increasing Subsequence.
- LC 416 — Partition Equal Subset Sum.
- LC 494 — Target Sum.
- LC 518 — Coin Change II.

---

# 24. Bit Operations и математические приёмы

## 24.1. Основные bit operations

```kotlin
val bit = 1 shl index
val isSet = (mask and bit) != 0
val enabled = mask or bit
val disabled = mask and bit.inv()
val toggled = mask xor bit
```

Для `Long`:

```kotlin
val bit = 1L shl index
```

## XOR cancellation

Если каждое число встречается дважды, кроме одного:

```kotlin
fun singleNumber(nums: IntArray): Int {
    var result = 0
    for (value in nums) {
        result = result xor value
    }
    return result
}
```

Свойства:

- `x xor x = 0`;
- `x xor 0 = x`;
- операция associative/commutative.

Сложность:

- время `O(n)`;
- память `O(1)`.

Работает только при соответствующем frequency contract.

## Удаление младшего установленного бита

```kotlin
fun bitCount(value: Int): Int {
    var current = value
    var count = 0

    while (current != 0) {
        current = current and (current - 1)
        count++
    }

    return count
}
```

Время `O(number of set bits)`, память `O(1)`. В Kotlin для этого есть stdlib-функция
`value.countOneBits()` (она же `Int.countOneBits`), которая компилируется в тот же
интринсик, что и `Integer.bitCount` — идиоматичнее писать её.

## Перебор subsets

Для `n <= 20` каждый bit означает присутствие элемента.

Сложность:

- `2ⁿ` masks;
- `O(n × 2ⁿ)` при просмотре всех bits;
- working memory `O(n)` без хранения output.

## GCD

```kotlin
fun gcd(first: Long, second: Long): Long {
    var a = kotlin.math.abs(first)
    var b = kotlin.math.abs(second)

    while (b != 0L) {
        val remainder = a % b
        a = b
        b = remainder
    }

    return a
}
```

Euclidean algorithm:

- время `O(log min(a,b))`;
- память `O(1)`.

Для LCM сначала делите на GCD, затем умножайте, чтобы уменьшить overflow risk.

## Fast power

Binary exponentiation:

```kotlin
fun powerMod(base: Long, power: Long, mod: Long): Long {
    require(power >= 0 && mod > 0)
    var result = 1L
    var b = base.mod(mod)          // mod, а не %: защищает от отрицательного base
    var p = power

    while (p > 0) {
        if (p and 1L == 1L) {
            result = result * b % mod
        }
        b = b * b % mod            // Long обязателен: mod до 1e9 даёт произведение до 1e18
        p = p shr 1
    }

    return result
}
```

Идея: разложить степень по битам. `b` на каждом шаге — это `base` в степени соответствующего бита,
и мы домножаем результат только там, где бит установлен.

Два места, где ошибаются: `Int` вместо `Long` для промежуточных произведений (при модуле около `1e9`
произведение переполняет `Int` мгновенно) и обычный `%` вместо `mod` при отрицательном основании.

- время `O(log power)`;
- память `O(1)` iterative.

Используется для больших степеней, modular arithmetic и для LC 50 Pow(x, n) — там дополнительно
нужен разбор отрицательной степени и аккуратность с `Int.MIN_VALUE`, у которого нет положительного
парного значения.

## Типичные ошибки

- `while (x > 0)` при отрицательном bit pattern.
- Путать `shr` и `ushr`.
- Проверять power of two без `x > 0`.
- Overflow `1 shl n`.
- Считать subset enumeration подходящим при `n = 50`.
- `%` в Kotlin может быть отрицательным.
- Вычислять `a * b / gcd` и переполниться до деления.

## Задачи

- LC 136 — Single Number.
- LC 268 — Missing Number.
- LC 191 — Number of 1 Bits.
- LC 338 — Counting Bits.
- LC 78 — Subsets.
- LC 50 — Pow(x, n).
- LC 1071 — GCD of Strings.

---

# 25. Trie и LRU Cache

Эти структуры реже встречаются в обычной Easy-задаче, но хорошо проверяют data-structure design уровня Senior.

## 25.1. Trie

Решает:

- prefix search;
- autocomplete;
- dictionary;
- board word search pruning.

```kotlin
class Trie {
    private class Node {
        val children = HashMap<Char, Node>()
        var terminal: Boolean = false
    }

    private val root = Node()

    fun insert(word: String) {
        var current = root

        for (ch in word) {
            current = current.children.getOrPut(ch) {
                Node()
            }
        }

        current.terminal = true
    }

    fun search(word: String): Boolean {
        return findNode(word)?.terminal == true
    }

    fun startsWith(prefix: String): Boolean {
        return findNode(prefix) != null
    }

    private fun findNode(text: String): Node? {
        var current = root

        for (ch in text) {
            current = current.children[ch] ?: return null
        }

        return current
    }
}
```

Для строки длины `L`:

- insert/search/prefix `O(L)` в среднем;
- память `O(total created character nodes)`.

Array children быстрее при фиксированном `a..z`, но расходует память и требует ограничения alphabet.

## Типичные ошибки

- забыть terminal;
- считать `Char` полным Unicode code point;
- утверждать, что trie всегда лучше HashSet;
- неправильно удалить shared prefix.

## Задачи

- LC 208 — Implement Trie.
- LC 211 — Add and Search Words.
- LC 648 — Replace Words.

## 25.2. LRU Cache

Требования:

- `get` — `O(1)`;
- `put` — `O(1)`;
- eviction least recently used — `O(1)`.

Комбинация:

- `HashMap<Key, Node>` для lookup;
- doubly linked list для recency order.

Invariant:

- после head — most recently used;
- перед tail — least recently used;
- map и list содержат одинаковый набор nodes;
- get/put перемещает node к head.

Реализация целиком — её стоит уметь написать без запинки, это самая частая design-задача
на кодинг-секции:

```kotlin
class LruCache<K : Any, V : Any>(private val capacity: Int) {
    // key и value nullable только ради двух часовых; у реальных узлов они всегда заполнены
    private class Node<K, V>(val key: K?, var value: V?) {
        var prev: Node<K, V>? = null
        var next: Node<K, V>? = null
    }

    private val map = HashMap<K, Node<K, V>>()

    // фиктивные head и tail избавляют от проверок на null в addFirst/unlink —
    // именно на них обычно и сыпется реализация «в лоб»
    private val head = Node<K, V>(null, null)
    private val tail = Node<K, V>(null, null)

    init {
        require(capacity > 0)
        head.next = tail
        tail.prev = head
    }

    fun get(key: K): V? {
        val node = map[key] ?: return null
        unlink(node)
        addFirst(node)
        return node.value
    }

    fun put(key: K, value: V) {
        val existing = map[key]
        if (existing != null) {
            existing.value = value          // не создаём второй node на тот же ключ
            unlink(existing)
            addFirst(existing)
            return
        }
        if (map.size == capacity) {
            val lru = tail.prev!!
            unlink(lru)
            map.remove(lru.key)             // из map тоже, иначе утечка и рассинхрон
        }
        val node = Node(key, value)
        map[key] = node
        addFirst(node)
    }

    private fun addFirst(node: Node<K, V>) {
        node.prev = head
        node.next = head.next
        head.next!!.prev = node
        head.next = node
    }

    private fun unlink(node: Node<K, V>) {
        node.prev!!.next = node.next
        node.next!!.prev = node.prev
    }
}
```

Два фиктивных узла-часовых — главный приём: без них `addFirst` и `unlink` обрастают проверками
на пустой список и на удаление головы или хвоста, и ошибка почти неизбежна под давлением времени.
Плата за них — nullable-поля в узле, потому что часовым нужно чем-то заполнить `key` и `value`.
На интервью по LC 146 достаточно нежденерик-версии `Int -> Int`: там этой проблемы нет вовсе,
а обобщение можно проговорить словами.

Сложность:

- `get/put` амортизированно `O(1)`;
- память `O(capacity)`.

На JVM production-вариант строится на `LinkedHashMap` с access order. Именованных аргументов
у Java-конструкторов нет, поэтому запись `LinkedHashMap(accessOrder = true)` не компилируется —
нужен трёхаргументный конструктор и переопределение `removeEldestEntry`:

```kotlin
fun <K, V> lruMap(capacity: Int): MutableMap<K, V> =
    object : LinkedHashMap<K, V>(16, 0.75f, /* accessOrder = */ true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<K, V>): Boolean =
            size > capacity
    }
```

На интервью почти всегда ожидают ручную map + doubly linked list, но знать, что в проде вы
возьмёте `LinkedHashMap` или `android.util.LruCache`, — отдельный плюс: это показывает,
что вы отличаете упражнение от рабочего кода.

Android follow-up:

- `android.util.LruCache`;
- переопределение `sizeOf` для bitmap bytes;
- cache не должен удерживать Activity/Context;
- thread safety требует отдельного решения.

## Типичные ошибки

- Реализовать FIFO: `get` не обновляет порядок.
- Использовать singly linked list.
- Оставить evicted node в map.
- Создать duplicate node при update.
- Считать cache thread-safe.
- Ограничивать тяжёлые объекты только количеством.

## Задачи

- LC 146 — LRU Cache.
- LC 460 — LFU Cache как следующий уровень.

---

# 26. Как быстро выбрать паттерн

## По формулировке

- «Частота», «дубликат», «complement» → HashMap/HashSet.
- «Sorted array + pair» → two pointers.
- «Contiguous longest/shortest» → sliding window.
- «Exact subarray sum», особенно с отрицательными → prefix sum + map.
- «Много range queries» → prefix array.
- «First/last/minimum feasible» → binary search.
- «Intervals/schedule» → sorting + merge/greedy/heap.
- «Next greater/smaller» → monotonic stack.
- «Top K/K-th» → heap.
- «Last unfinished/nested» → stack.
- «Shortest unweighted» → BFS.
- «Connected component/path existence» → BFS/DFS.
- «Dependencies/order» → topological sort.
- «Repeated connectivity unions» → DSU.
- «Shortest nonnegative weighted» → Dijkstra.
- «All combinations» → backtracking.
- «Count/min/max with repeated states» → DP.
- «Local choice can be proven» → greedy.
- «Prefix lookup of strings» → trie.

## По типу данных

Array/String:

- hashing;
- two pointers;
- sliding window;
- prefix sums;
- binary search;
- DP.

Linked list:

- slow/fast;
- reversal;
- dummy node;
- merge.

Tree:

- DFS/postorder;
- BFS/levels;
- BST inorder/bounds.

Grid:

- DFS/BFS;
- multi-source BFS;
- DP.

Graph:

- BFS/DFS;
- topological sort;
- DSU;
- shortest path.

## Если паттерн не виден

1. Напишите brute force.
2. Найдите повторяемую операцию.
3. Спросите, можно ли хранить её результат.
4. Проверьте, есть ли sorted/monotonic property.
5. Определите, непрерывен ли диапазон.
6. Представьте states как graph.
7. Посчитайте ограничения.

---

# 27. Типичные Kotlin-ошибки на интервью

## Overflow

```kotlin
val sum = a.toLong() + b
```

Не:

```kotlin
val sum = (a + b).toLong()
```

## Queue за `O(n)`

Не использовать `MutableList.removeAt(0)`. Использовать `ArrayDeque`.

## Comparator overflow

Не:

```kotlin
Comparator<Int> { a, b -> a - b }
```

Использовать `compareValues`, `compareBy`, natural order.

## Deep recursion

Graph/tree chain может переполнить JVM stack. Перейти на explicit stack.

## Boxing

Для больших массивов `IntArray` вместо `List<Int>`.

## Hidden copies

- `sorted()` возвращает новую коллекцию.
- `map/filter` создают списки.
- `toTypedArray` копирует references.
- `substring` и string concatenation могут иметь значимую стоимость.

## Mutable key

Объект, чьи поля участвуют в `equals/hashCode`, нельзя менять, пока он находится в `HashMap/HashSet`.

## Arrays equality

Для содержимого:

```kotlin
first.contentEquals(second)                  // IntArray, одномерный
matrixFirst.contentDeepEquals(matrixSecond)  // Array<IntArray>
```

Обычный `==` массива не является универсальным содержательным сравнением: `intArrayOf(1, 2) == intArrayOf(1, 2)`
даёт `false`. Важнее второй случай: на `Array<IntArray>` — а весь этот гайд использует именно такое
представление матрицы — `contentEquals` тоже даёт `false`, потому что сравнивает вложенные массивы
по ссылке. Нужен `contentDeepEquals`. Это регулярно ломает собственные тесты к решению.

## Remainder

Целочисленное деление в Kotlin усекает **к нулю**, а не вниз: `-7 / 2 == -3`, и отсюда же
`-7 % 3 == -1`. Знак результата `%` совпадает со знаком делимого, поэтому для индексации по кольцу
остаток нужно нормализовать:

```kotlin
val normalized = ((value % mod) + mod) % mod   // классика
val same = value.mod(mod)                      // то же самое, но короче и без ошибок
```

`Int.mod()` из stdlib всегда возвращает неотрицательный результат — используйте его вместо ручной
нормализации. Java-эквивалент — `Math.floorMod`.

## Индекс против значения в `MutableList`

```kotlin
val list = mutableListOf(10, 20, 30)
list.remove(1)      // ищет ЗНАЧЕНИЕ 1, не находит, возвращает false — ничего не удалено
list.removeAt(1)    // удаляет элемент с индексом 1
```

Для `MutableList<Int>` это самая тихая ошибка из всех: `remove(1)` компилируется, ничего не делает
и не бросает исключение.

## `===` на boxed `Int`

```kotlin
val a: Int? = 127; val b: Int? = 127
a === b        // true  — из кэша Integer (-128..127)
val c: Int? = 128; val d: Int? = 128
c === d        // false — разные объекты
```

Отсюда правило: для nullable-чисел и для `List<Int>` сравнивайте через `==`, а `===` не используйте
никогда. Работающий на маленьких тестах код развалится на больших значениях.

## `removeFirst()` / `removeLast()` на Android

Самая андроидная ловушка списка. В Java 21 у `SequencedCollection` появились свои
`removeFirst()`/`removeLast()`, возвращающие `Object`, и они конфликтуют с одноимёнными
extension-функциями Kotlin. На устройствах **ниже API 35** этих методов в `java.util.List` нет,
поэтому код, скомпилированный под новый SDK, падает в рантайме с `NoSuchMethodError`. В Kotlin 2.1
эти extension'ы задепрекейчены именно по этой причине. Безопасно:

```kotlin
val first = list.removeAt(0)
val last = list.removeAt(list.lastIndex)
```

На `ArrayDeque` из `kotlin.collections` (а не `java.util`) `removeFirst`/`removeLast` безопасны —
это класс самого Kotlin. Именно поэтому во всех шаблонах этого гайда для стеков и очередей
используется `ArrayDeque` с `addLast`/`removeLast`/`removeFirst`.

---

# 28. План подготовки

## Этап 1: база

1. Two Sum.
2. Valid Parentheses.
3. Binary Search.
4. Valid Palindrome.
5. Best Time to Buy and Sell Stock.
6. Reverse Linked List.
7. Maximum Depth of Binary Tree.
8. Flood Fill.

Цель: без подсказок за 15–20 минут.

## Этап 2: основные Medium-паттерны

1. Longest Substring Without Repeating Characters.
2. 3Sum.
3. Merge Intervals.
4. Subarray Sum Equals K.
5. Daily Temperatures.
6. Kth Largest Element.
7. Number of Islands.
8. Course Schedule.
9. Combination Sum.
10. House Robber.

Цель: распознать паттерн за 3–5 минут и решить за 25–35.

## Этап 3: углубление

1. Search in Rotated Sorted Array.
2. Koko Eating Bananas.
3. LRU Cache.
4. Validate BST.
5. Lowest Common Ancestor.
6. Rotting Oranges.
7. Accounts Merge.
8. Network Delay Time.
9. Coin Change.
10. Partition Equal Subset Sum.
11. Longest Common Subsequence.

## Метод повторения

Для каждой задачи:

1. Решить с разбором.
2. Через 2–3 дня повторить без подсказки.
3. Через неделю решить с чистого листа.
4. Проговорить invariant и complexity.
5. Записать не код, а trigger паттерна и ошибку.

Не решайте 20 почти одинаковых задач подряд. Лучше 3–5 задач каждого паттерна с интервальным повторением.

---

# 29. Чек-лист Senior-кандидата

Кандидат должен уметь:

1. Вывести оптимизацию из brute force.
2. Сформулировать invariant до кода.
3. Отличить substring, subsequence и subset.
4. Выбрать two pointers, window или prefix sum.
5. Написать lower bound без ошибки границ.
6. Объяснить амортизированное `O(n)` monotonic stack.
7. Выбрать BFS для shortest unweighted path.
8. Учесть recursion stack.
9. Объяснить heap Top-K `O(n log k)`.
10. Построить DP state и transition.
11. Отличить 0/1 и unbounded knapsack по направлению цикла.
12. Доказать greedy или отказаться от него.
13. Учесть Kotlin overflow и boxing.
14. Назвать дополнительную память, включая recursion.
15. Проверить решение на boundary cases.

## Формула сильного ответа

Для любого алгоритма объясните:

1. Какую повторяющуюся работу он устраняет?
2. Какой invariant поддерживает?
3. Почему переход безопасен?
4. Сколько раз обрабатывается каждый элемент/edge/state?
5. Какие структуры занимают память?
6. Что сломает предположения алгоритма?
7. Какие Kotlin/JVM детали важны?

---

# 30. Полезные источники

- [LeetCode](https://leetcode.com/problemset/)
- [Kotlin ArrayDeque API](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/-array-deque/)
- [Kotlin Collections API](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/)
- [CP-Algorithms](https://cp-algorithms.com/)
- [VisuAlgo](https://visualgo.net/en)
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/)

Главный принцип подготовки: изучать паттерны и invariants, а не запоминать конкретные ответы.
