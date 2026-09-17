# Подготовка к собеседованию Senior Android Developer (2026)

Комплект материалов: что спрашивают, что учить, в каком порядке и как себя проверять.
Собран по актуальным источникам за 2025–2026 (список — в `06-resources.md`).

## Веб-тренажёр

В каталоге [`web`](web/) находится адаптивное приложение для тренировок по шести основным
темам: в каждой доступно 60 вопросов, разбитых на сессии по 20, и библиотека всех исходных
Markdown-материалов. Инструкции по локальному запуску, проверкам и публикации на GitHub Pages
находятся в [`web/README.md`](web/README.md).

Открыть тренажёр: [greylabsdev.github.io/android_dev_interview](https://greylabsdev.github.io/android_dev_interview/).

## Карта материалов

| Файл | Что внутри |
| --- | --- |
| `01-checklist.md` | Полный чеклист тем: 16 нумерованных блоков (плюс 2а) с чекбоксами и критериями «знаю на senior» |
| `03-question-bank.md` | 254 вопроса по блокам: теория, сценарии, coding и follow-up |
| `04-system-design.md` | Пятиэтапный фреймворк Mobile System Design: требования, HLD, LLD, защита решения и вопросы интервьюеру; 15 канонических задач и сигналы уровня |
| `05-behavioral.md` | Поведенческая секция: метод STAR+R, 10 тем для заготовок историй, senior-вопросы, вопросы работодателю |
| `06-resources.md` | Источники, книги, каналы, тренажёры |
| `web/` | Интерактивный тренажёр: 360 вопросов по шести темам, сессии по 20 вопросов и библиотека материалов |
| `Jetpack_Compose_Senior_Android_Guide.markdown` | Полный гайд Compose: runtime/compiler, state, effects, layout, списки, анимации, accessibility, навигация, интероп, тестирование и performance |
| `08-coroutines-android.md` | Дополнение к Kotlin-гайду: Android scope'ы, `CoroutineContext`, отмена и `ensureActive`, Flow, тестирование, мосты в колбэки и паттерны для лайв-кодинга |
| `09-jvm-memory-deep.md` | Память и рантайм: память процесса, GC roots и mark-and-sweep в ART, CMC и барьеры, все виды ссылок, утечки и LeakCanary, native-память, OOM, JIT/AOT/dexopt и профили |
| `10-android-sdk-deep.md` | Платформа и SDK: cold start, сборка APK/AAB, NDK/JNI, компоненты и манифест, Context, lifecycle, фоновая работа, Binder, разрешения, хранилища, адаптивность и behavior changes API 33–37 |
| `11-concurrency-deep.md` | Модель памяти и happens-before, `synchronized` и реентерабельность, явные локи, CAS и атомики, безопасная публикация, конкурентные коллекции, пулы, дедлоки, `Mutex` в корутинах и тестирование конкурентности |
| `12-architecture-deep.md` | Архитектура и навигация: MVVM/MVI/UDF и как защитить выбор, проектирование UI State, официальная позиция по одноразовым событиям, Repository и границы слоёв, UseCase «за и против», модуляризация и стратегия распила монолита, механизмы удержания границ, дизайн-система, feature flags, четыре уровня жизни состояния, Nav2 и Nav3, навигация в мультимодуле |
| `13-di-build-deep.md` | DI и сборка: что генерирует Dagger, `fastInit` и `SwitchingProvider`, все шесть способов объявить биндинг, `Lazy`/`Provider` и разрыв циклов, мультибиндинги целиком, assisted-инъекция, **скоупы под капотом** (`DoubleCheck`, свой скоуп, правила валидации, `@Reusable`, сабкомпоненты против зависимостей компонентов, что держит компоненты Hilt, `@DefineComponent`), утечки скоупа, сравнение Hilt / Koin / компиляторных плагинов / ручного DI, зависимости ViewModel, что реально ускоряет Gradle-сборку, version catalogs и convention plugins, варианты сборки и App Bundle, R8 и keep-правила, CI/CD |
| `14-data-network-deep.md` | Данные и сеть: offline-first как архитектура, Room (инвалидация, транзакции, миграции, индексы), outbox и идемпотентность, шесть стратегий разрешения конфликтов, оптимистичные обновления целиком, пагинация и Paging 3, OkHttp-интерцепторы, обновление токена без гонок, таймауты и ретраи, выбор транспорта, хранилища и многоуровневый кэш |
| `15-kmp-deep.md` | Kotlin Multiplatform: чем отличается от Flutter и RN, что шарить, `expect`/`actual` и почему интерфейсы часто лучше, боль интеропа со Swift, стек и почему Hilt не работает, Compose Multiplatform как отдельное решение, пять шагов де-рискованного внедрения, когда отказаться |
| `16-security-deep.md` | Безопасность: граница доверия, TLS и network security config, certificate pinning и что делать после обхода, модель угроз для данных на устройстве, депрекация `EncryptedSharedPreferences`, Keystore и key attestation, Play Integrity, root-детект как телеметрия, пределы обфускации, биометрия, токены и OAuth, платежи и PCI-скоуп, поверхность атаки, приватность |
| `18-advanced-android-security.md` | Продвинутая безопасность Android приложений: аудит и OWASP Mobile Top 10, IPC/deep links/WebView/Provider, сеть и Keystore, RASP/anti-fraud, DEX-защита, `useEmbeddedDex`, безопасные границы dynamic DEX loading, ранний bootstrap через ContentProvider и выбор коммерческого протектора |
| `19-coroutines-interview-tasks.md` | 20 задач для Senior Android собеседования по Kotlin Coroutines: `suspend`, dispatchers, structured concurrency, ошибки и отмена, параллельные запросы, Flow, lifecycle, event-модель, refresh race и тестирование virtual time |
| `20-kotlin-language-interview-tasks.md` | 20 задач для Senior Android собеседования по Kotlin как языку: `data class`/`sealed class`, extension-функции, `inline`/`crossinline`/`reified`, делегаты через `by`, деструктуризация, и отдельный блок по `HashMap`/`HashSet`: когда коллизия хеша безопасна, а когда ломает корректность |
| `17-ai-deep.md` | On-device AI: AICore и Gemini Nano, ограничения инференса, ML Kit GenAI и проверка доступности, критерии выбора «на устройстве или в облаке», гибридный инференс, собственные модели на LiteRT, и как отвечать про AI-ассистентов в работе |
| `Kotlin_Senior_Android_Guide.markdown` | Язык Kotlin, 21 раздел: система типов, inline/reified, коллекции, делегаты, JVM interop, корутины, Flow и JMM. Закрывает блоки 1–2 чеклиста |
| `Algorithms_LeetCode_Easy_Medium_Senior_Android_Guide.markdown` | Алгоритмы, 29 разделов: как решать задачу на интервью, 20+ паттернов с кодом на Kotlin и Kotlin/JVM-грабли. Основной материал по блоку 14 |
| `mistakes.md` | Единственный файл, который создаёте вы сами. Журнал ошибок: вопрос, ваш неудачный ответ и правильный ответ |

**Осторожно: нумерация блоков в чеклисте и в банке вопросов разная.** В банке нет отдельного блока
«DI и сборка» (эти вопросы внутри блока «Архитектура») и нет блока по system design, зато платформа
и производительность разбиты на 7/7а и 8/8а. Поэтому «блок 9» — это «Производительность» в чеклисте
и «Тестирование» в банке. Везде в материалах ссылка теперь называет файл или тему явно; если
встретите просто «блок N» — сверьтесь с таблицей:

| Тема | Чеклист | Банк вопросов | Вопросы |
| --- | --- | --- | --- |
| Kotlin | 1 | 1 | 1–14 |
| Корутины и Flow | 2 | 2 | 15–38 |
| Синхронизация и многопоточность | 2а | 2а | 38.1–38.28 |
| Jetpack Compose | 3 | 3 | 39–59 |
| Навигация | 4 | 4 | 60–65 |
| Архитектура | 5 | 5 | 66–74, 77–78 |
| DI и сборка | 6 | внутри 5 | 75–76, 79–80 |
| Данные, сеть, offline-first | 7 | 6 | 81–97 |
| Платформа | 8 | 7 и 7а | 98–111, 111.1–111.17 |
| Производительность | 9 | 8 и 8а | 112–124, 124.1–124.29 |
| Тестирование | 10 | 9 | 125–135 |
| Kotlin Multiplatform | 11 | 10 | 136–142 |
| Безопасность | 12 | 11 | 143–150 |
| On-device AI | 13 | 12 | 151–154 |
| Алгоритмы и live coding | 14 | 13 | 155–170 |
| Mobile System Design | 15 | блока нет (сценарии 78, 95, 97) | — |
| Senior-сигналы вне техники | 16 | 14 | 171–180 |

**Где брать теорию по блокам чеклиста:**

| Блок | Материал |
| --- | --- |
| 1–2. Kotlin, корутины и Flow (механика языка) | `Kotlin_Senior_Android_Guide.markdown`; разделы 12–13 — корутины и Flow, раздел 14 — JMM и многопоточность |
| 2. Корутины: Android, `CoroutineContext`, отмена, тесты, паттерны | `08-coroutines-android.md` |
| 2а. Синхронизация, локи, реентерабельность, атомики, `Mutex` | `11-concurrency-deep.md` |
| 3. Compose | `Jetpack_Compose_Senior_Android_Guide.markdown` |
| 8. Платформа, cold start, APK/AAB, NDK/JNI, компоненты, фон, разрешения, версии | `10-android-sdk-deep.md` |
| 8–9. ART, память, GC roots, mark-and-sweep, ссылки, утечки, компиляция | `09-jvm-memory-deep.md` |
| 4, 5. Навигация и архитектура | `12-architecture-deep.md` |
| 6. DI и сборка | `13-di-build-deep.md` |
| 7. Данные, сеть, offline-first | `14-data-network-deep.md` |
| 10. Тестирование | `08-coroutines-android.md` раздел 2 (корутины и Flow) + Compose-гайд раздел 19 (UI-тесты) |
| 11. Kotlin Multiplatform | `15-kmp-deep.md` |
| 12. Безопасность | `16-security-deep.md` |
| 13. On-device AI и AI в работе | `17-ai-deep.md` |
| 14. Алгоритмы и live coding | `Algorithms_LeetCode_Easy_Medium_Senior_Android_Guide.markdown` |
| 15. Mobile System Design | `04-system-design.md` |
| 16. Senior-сигналы вне техники | `05-behavioral.md` |

## Платформенные дедлайны

С **31 августа 2026** новые приложения и обновления в Google Play обязаны таргетить
Android 16 (API 36); продление по заявке — до 1 ноября 2026. Существующие приложения должны
таргетить минимум API 35, иначе перестают быть **видимы новым** пользователям на устройствах с ОС
новее вашего таргета (уже установившие приложение не затронуты).
Из этого следуют два поведенческих изменения, которые почти гарантированно всплывут на интервью:
отключить edge-to-edge больше нельзя, и predictive back включён по умолчанию
(`onBackPressed` не вызывается, `KEYCODE_BACK` не доставляется).

**Android 17 (API 37)** вышел в июне 2026. Главное из него — отмена временного отказа от
адаптивности: на экранах от sw600dp ограничения ориентации, аспекта и resizability игнорируются
без возможности opt-out. Остальные ломающие изменения при таргете 37, любое из которых можно
получить как вопрос:

- `static final` нельзя менять рефлексией (`IllegalAccessException`), через JNI — краш;
- новая lock-free реализация `MessageQueue` ломает код, который рефлексией лазит в её приватные поля;
- локальная сеть требует `ACCESS_LOCAL_NETWORK` либо системного device picker;
- доставка обычных SMS с OTP задерживается на 3 часа, если вы не SMS Retriever / User Consent;
- Certificate Transparency включён по умолчанию для HTTPS;
- аудио из фона (playback, audio focus, громкость) требует foreground service с while-in-use;
- лимит 50 000 ключей в Keystore на приложение.

Разбор — в `10-android-sdk-deep.md`, раздел 13.

С **1 ноября 2025** приложения, таргетящие Android 15+, обязаны поддерживать 16 КБ страницы памяти
на 64-битных устройствах — это про нативные библиотеки, в том числе внутри сторонних SDK.

## Версии, от которых отсчитываются формулировки (август 2026)

Если материал где-то расходится с этой таблицей — верьте таблице и официальным release notes.

| Что | Актуально |
| --- | --- |
| Kotlin | 2.4.0 (июнь 2026), багфикс 2.4.10; context parameters и explicit backing fields стабильны |
| Compose BOM | 2026.06.01; Compose 1.11.x стабилен, 1.12.0 потребует `compileSdk 37` и AGP 9 |
| Android | 16 (API 36) — обязательный target с 31.08.2026; 17 (API 37) — вышел |
| Navigation | Nav2 2.9.x, Navigation 3 стабилен с 1.0 (ноябрь 2025), сейчас 1.1.x |
| Koin | 4.2.2 (требует Kotlin 2.3+), Koin Compiler Plugin — K2-плагин в RC |
| Compose Multiplatform | iOS стабилен с 1.8.0 (май 2025), web в бете |

## Как пользоваться

1. Пройдите `01-checklist.md` и честно отметьте текущий уровень по каждому пункту — получите карту пробелов.
2. Используйте `03-question-bank.md` для устной самопроверки без подглядывания.
3. Практикуйте алгоритмы по `Algorithms_LeetCode_Easy_Medium_Senior_Android_Guide.markdown` параллельно с теорией.
4. Регулярно репетируйте `04-system-design.md` и `05-behavioral.md`.

