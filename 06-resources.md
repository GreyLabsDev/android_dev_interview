# Источники и ресурсы

## Официальная документация (первоисточник, приоритет над всем остальным)

- [Требования Google Play к target API](https://support.google.com/googleplay/android-developer/answer/11926878) — API 36 обязателен с 31.08.2026, продление до 01.11.2026.
- [Behavior changes: apps targeting Android 17](https://developer.android.com/about/versions/17/behavior-changes-17) и [сводка изменений Android 17](https://developer.android.com/about/versions/17/summary) — адаптивность без opt-out, `static final` и рефлексия, lock-free `MessageQueue`, `ACCESS_LOCAL_NETWORK`, задержка SMS с OTP, Certificate Transparency, аудио из фона.
- [Behavior changes: apps targeting Android 16](https://developer.android.com/about/versions/16/behavior-changes-16) — edge-to-edge без opt-out, predictive back по умолчанию.
- [Behavior changes: apps targeting Android 15](https://developer.android.com/about/versions/15/behavior-changes-15) и [Foreground service timeouts](https://developer.android.com/develop/background-work/services/fgs/timeout) — лимит 6 часов, `onTimeout`, ограничения `BOOT_COMPLETED`.
- [Baseline Profiles overview](https://developer.android.com/topic/performance/baselineprofiles/overview), [Startup Profiles](https://developer.android.com/topic/performance/startupprofiles/dex-layout-optimizations), [измерение через Macrobenchmark](https://developer.android.com/topic/performance/baselineprofiles/measure-baselineprofile).
- [Navigation 3: релизы](https://developer.android.com/jetpack/androidx/releases/navigation3) и [гид по миграции с Navigation 2](https://developer.android.com/guide/navigation/navigation-3/migration-guide).
- [Gemini Nano и ML Kit GenAI](https://developer.android.com/ai/gemini-nano) — on-device AI через AICore.
- [Play Integrity: standard request](https://developer.android.com/google/play/integrity/standard) — `requestHash`, серверная проверка токена.
- [Поддержка 16 КБ страниц памяти](https://developer.android.com/guide/practices/page-sizes) — требование Play с 01.11.2025, проверка выравнивания ELF, NDK r28+.
- [What's new in Kotlin 2.4](https://kotlinlang.org/docs/whatsnew24.html) — стабильные context parameters и explicit backing fields, изменения Compose-компилятора (стабильность интерфейсов и non-final классов). [История релизов Kotlin](https://kotlinlang.org/docs/releases.html) — чтобы не привязываться к версии из статьи.
- [Compose compiler options DSL](https://kotlinlang.org/docs/compose-compiler-options.html) — feature flags, `StrongSkipping`, `OptimizeNonSkippingGroups`, метрики компилятора.
- [ComponentCallbacks2](https://developer.android.com/reference/android/content/ComponentCallbacks2) — какие уровни `onTrimMemory` не доставляются с API 34 и задепрекейчены в 35.
- [Now in Android: стратегия тестирования](https://github.com/android/nowinandroid/wiki/Testing-strategy-and-how-to-test) — эталонный пример того, как Google рекомендует тестировать.

## Референсные проекты для чтения кода

- [android/nowinandroid](https://github.com/android/nowinandroid) — модуляризация, offline-first, тесты, baseline profile в одном месте. Читать целиком.
- [android/compose-samples](https://github.com/android/compose-samples) — паттерны Compose.
- [Metro](https://www.zacsweers.dev/metro-is-stable/) — DI как compiler plugin, если хотите понимать, куда движется тема сборки и DI.

## Подготовка к интервью

- [Android System Design Interview Guide 2026](https://www.androidsystemdesign.dev/blog/android-system-design-interview-guide) — фреймворк ответа, outbox-паттерн, разбор задач по компаниям.
- [Android System Design Interview: A Complete Guide](https://www.systemdesignhandbook.com/guides/android-system-design-interview/) — структура секции, ожидания по уровням.
- [Senior Android Engineer — Interview Kit](https://blog.stackademic.com/senior-android-engineer-interview-kit-e1994e90f93f) — теория, сценарии и кодинг по шести блокам.
- [50 Android Interview Questions That Senior Developers Actually Get Asked](https://medium.com/@ramadan123sayed/50-android-interview-questions-that-senior-developers-actually-get-asked-compose-coroutines-19b44600e8e5) — с ответами в коде.
- [Топ-10 вопросов с Android-собеседований в 2026 (Хабр)](https://habr.com/ru/articles/1053262/) — русскоязычный разбор с подвохами.

## Российский рынок: форматы компаний

- [Алгоритмическая секция Яндекса: критерии и подготовка](https://yandex.ru/jobs/interview/algorithms) — первоисточник от самой компании: что оценивают, как решать, где тренироваться (CodeRun, Яндекс Контест).
- [Новый формат собеседований в Яндекс (Хабр)](https://habr.com/ru/articles/882030/) — разбор секции Advanced Code: IDE на своём компьютере, интернет разрешён, задача «дописать код / реализовать функцию под тест».
- [Собеседование Avito Mobile 2026](https://enigmai.ru/interview/avito/avito-mobile-2026/) — платформенная секция, лайв-кодинг в формате «почини проект», System Design.
- [Avito playbook: секции найма](https://github.com/avito-tech/playbook/blob/master/recruitment-and-office.md) — официальное описание секций от компании.
- hh.ru по запросу «Senior Android» — читайте 20–30 актуальных вакансий подряд перед началом подготовки: это самый честный источник требований и вилок.

## Углублённые темы

- [Offline-first Android architecture: полный гид](https://tiwariashuism.medium.com/offline-first-android-architecture-the-complete-engineering-guide-be78c102c59d) — стратегии синка, конфликты, граничные случаи.
- [Room + Offline-First для Android в 2026](https://medium.com/@ramadan123sayed/room-offline-first-architecture-the-complete-guide-for-android-in-2026-962ecd56a9ca) — с чеклистом.
- [WorkManager Internals](https://doveletter.dev/articles/workmanager-internals) — как устроены гарантии доставки.
- [Android Security Hardening Checklist](https://pankajjangid.medium.com/the-android-security-hardening-checklist-for-production-apps-f94f295283de) — pinning, Keystore, Play Integrity, анти-инструментирование.
- [Testing Architecture: тесты, которые ловят баги](https://medium.com/@prosper.kalu/testing-architecture-writing-tests-that-actually-catch-bugs-not-just-lines-06b4c459a17d) — инфраструктура корутинных тестов, Turbine, скриншот-тесты.
- [Hilt vs Koin 2026](https://sharpskill.dev/en/blog/android/android-dependency-injection-hilt-vs-koin) — цифры по времени сборки, старту и размеру.
- [Is Kotlin Multiplatform production ready in 2026?](https://www.kmpship.app/blog/is-kotlin-multiplatform-production-ready-2026) и [Compose Multiplatform 1.8.0 стабилен для iOS](https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/).

## Книги

- «Kotlin Coroutines: Deep Dive», Marcin Moskała — лучший источник по корутинам, читать целиком.
- «Jetpack Compose Internals», Jorge Castillo — про slot table, snapshot-систему и компилятор.
- «Effective Kotlin», Marcin Moskała — идиоматика и производительность.
- «Designing Data-Intensive Applications», Martin Kleppmann — главы про репликацию и консистентность полезны для конфликтов синка.
- «Cracking the Coding Interview» или Grokking-курсы — если алгоритмическая секция обязательна.

## Тренажёры и практика

- `Algorithms_LeetCode_Easy_Medium_Senior_Android_Guide.markdown` в этой же папке — начинайте отсюда, а не с внешних курсов: там разобраны все паттерны блока 14 чеклиста с кодом на Kotlin и типовыми ошибками.
- [LeetCode](https://leetcode.com/studyplan/top-interview-150/) — списки Top Interview 150 и [Grind 75](https://www.techinterviewhandbook.org/grind75/), уровень Medium, темы из блока 14 чеклиста.
- [CodeRun](https://coderun.yandex.ru/) и Яндекс Контест — если целитесь в Яндекс: задачи в том же формате, что на секции.
- Мок-интервью: коллеги, [Pramp](https://www.pramp.com), профильные телеграм-чаты Android-сообщества, платные площадки с реальными интервьюерами из целевых компаний.
- Разбор реальных трейсов: возьмите Perfetto-трейс старта своего приложения ([ui.perfetto.dev](https://ui.perfetto.dev/)) и разберите его до конца хотя бы один раз.

## Регулярное чтение

- [Android Developers Blog](https://android-developers.googleblog.com/) и [Now in Android](https://developer.android.com/series/now-in-android) — изменения платформы.
- [Android Weekly](https://androidweekly.net/) — недельный дайджест.
- [ProAndroidDev](https://proandroiddev.com/) — практические статьи по архитектуре и Compose.
- [Kotlin Blog](https://blog.jetbrains.com/kotlin/) от JetBrains — релизы языка, KMP, Compose Multiplatform.
- [Release notes AndroidX](https://developer.android.com/jetpack/androidx/versions/all-channel) — быстрый способ узнать, что реально поменялось в библиотеках.

---

**Про достоверность.** Часть материалов выше — блоги и SEO-статьи; в них встречаются неточности,
особенно в номерах версий и датах. Всё, что вы планируете утверждать на интервью как факт
(даты дедлайнов Play, статус стабильности библиотеки, поведение API), проверяйте по официальной
документации — она в первом разделе.

**Доступность ссылок проверена 14.08.2026.** Ссылки на Medium и LeetCode отдают 403 роботам,
но открываются в браузере — это нормально. Блоги живут хуже документации: если ссылка умерла,
не ищите её в кэше, а берите первоисточник из первого раздела. Проверять весь список стоит
раз в пару месяцев — быстрее всего это делает `curl -o /dev/null -w '%{http_code}'` по всем URL
из файла.
