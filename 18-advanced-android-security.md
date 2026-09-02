# Продвинутая безопасность Android приложений

Материал объединяет практику аудита Android-приложений и подход к созданию SDK/защитных компонентов. Он дополняет `16-security-deep.md`: там - короткий ответ для общего интервью, здесь - как проводить анализ, проектировать защиту и честно объяснять её ограничения.

> Принцип: Android-клиент и его runtime контролируются атакующим. APK можно извлечь и изменить, а процесс - отладить или инструментировать. Клиентская защита повышает стоимость атаки и даёт сигналы риска; доверенная граница для авторизации, денег, лимитов и итоговых решений находится на backend.

---

## 1. Как отвечать и проводить аудит

Удобная структура ответа на интервью и finding в отчёте:

```text
Входная точка -> доверительная граница -> сценарий -> влияние
-> безопасное подтверждение -> минимальное исправление -> regression test
```

Например: внешний deep link приходит в exported Activity, параметр попадает в privileged flow, UI считает пользователя авторизованным, но backend не подтверждает право. Подтверждение выполняют только в тестовом контуре и отдельным тестовым аккаунтом. Исправление: строгий allowlist URI и server-side AuthZ; регрессия: инструментальный тест внешнего Intent и API-контрактный тест доступа к объекту другого пользователя.

### 1.1. Scope и форматы работ

До анализа фиксируют package name, версию, SHA-256 APK/AAB, signing certificate, `minSdk`/`targetSdk`, ABI, тестовые аккаунты, API endpoints, разрешённые действия, лимиты нагрузки и правила хранения данных. Отдельно согласовывают proxy, root/emulator, динамическую инструментализацию и модифицированные тестовые APK.

| Формат | Дано | Что даёт | Ограничение |
| --- | --- | --- | --- |
| Whitebox | Исходники, CI/CD, backend-контракты | Находит первопричины и покрывает бизнес-логику | Нужны актуальная сборка и время на код |
| Graybox | APK/AAB, тестовые данные, часть документации | Хороший баланс статического и динамического анализа | Не все серверные предположения проверяемы |
| Blackbox | Release-сборка и согласованный стенд | Показывает реальную внешнюю поверхность | Труднее установить первопричину |

Автоматический сканер - источник гипотез, не доказательство. Finding подтверждён, когда понятны достижимость, влияние и уместность в конкретном контексте.

### 1.2. Карта доверительных границ

Для каждого входа надо спросить: кто его контролирует, где он валидируется, куда передаётся, может ли другой UID вызвать компонент, проверены ли permission/caller/user, и подтверждает ли backend действие независимо.

- Android IPC: Activity, Service, Receiver, Provider, `Intent`, `PendingIntent`, Binder;
- URI и браузерные границы: deep link, App Link, OAuth redirect, WebView и JS bridge;
- сеть: TLS, redirect, cookie, token, retry, API AuthZ и replay;
- устройство: storage, backup, cache, screenshots, notifications, clipboard и logs;
- build/runtime: APK, DEX, native `.so`, signing, dependencies, R8 и защитный SDK;
- backend: сессия, право на объект, лимит, nonce, идемпотентность, risk policy.

---

## 2. Android IPC, компоненты и ввод

### 2.1. Exported components и confused deputy

`android:exported="true"` делает компонент публичным API. Чужое приложение не наследует permissions приложения-жертвы, но может заставить его выполнить действие со своими правами. Это component hijacking/confused deputy.

- По умолчанию ставьте `exported="false"`.
- Для внешнего контракта задайте минимальную permission (для доверенных приложений - signature permission), валидируйте все поля и caller там, где это применимо.
- Не считайте прохождение через «правильный» UI доказательством права. Критичное действие авторизует backend.
- Проверяйте merged manifest: зависимость способна добавить provider, receiver и permission.

### 2.2. Intents, PendingIntent и broadcasts

Нельзя без проверки передавать `Intent`, полученный извне, в `startActivity`, `startService` или `bindService`: вложенный Intent может открыть неэкспортируемый компонент либо передать URI-grant в контексте доверенного UID.

Безопасный порядок:

1. Предпочесть explicit `Intent`, задать component или package.
2. Если нужен forwarding, allowlist action, component, scheme, host, path и extras; применять `IntentSanitizer`.
3. Удалить ненужные `FLAG_GRANT_*_URI_PERMISSION`; не форвардить Binder, token и mutable `PendingIntent`.
4. Создавать `PendingIntent` с `FLAG_IMMUTABLE`, если изменение содержимого не является контрактом.
5. Для dynamic receiver выбирать `RECEIVER_NOT_EXPORTED`, если внешний broadcast не нужен; не передавать секреты в broadcast.

### 2.3. Deep links и OAuth

`Uri.parse()` только разбирает строку, но не делает её безопасной. Проверяют независимо scheme, host, path, тип и размер параметров. Для публичных ссылок применяют verified App Links; неизвестные `intent:`, `file:` и custom scheme не открывают автоматически.

Deep link может открыть экран, но не подтверждает личность, оплату или право. OAuth запускают в browser/Custom Tabs, используют PKCE, `state`, точный redirect URI и TTL. После redirect backend подтверждает итог операции.

### 2.4. ContentProvider и FileProvider

Provider должен быть `exported="false"`, когда межприложенный доступ не нужен. Иначе нужны узкие `readPermission`/`writePermission`, минимальные path-permissions и проверка semantic authorization. В `call()` framework не знает, какие именно данные читаются или меняются, поэтому реализация самостоятельно проверяет permission и caller.

Для `ContentProvider` проверяют `UriMatcher`, allowlist projection/sort columns, parameterized selection args, лимиты размера и canonical path. `FileProvider` не должен публиковать широкие корни или каталоги с секретами. URI-grant выдают точечно ожидаемому package, на короткий срок и без лишних флагов.

---

## 3. Данные, криптография и биометрия

### 3.1. Практическая модель хранения

| Актив | Подход | Чего избегать |
| --- | --- | --- |
| Небольшая настройка | DataStore/internal storage | External storage для чувствительных данных |
| Token/PII | Короткий TTL, ciphertext во internal credential-encrypted storage | `Intent`, clipboard, logs, cache и backup |
| Ключ | Android Keystore по alias | Ключ/IV в APK, `BuildConfig` или preferences |
| БД/файл | AEAD-шифрование данных или проверенная защищённая БД | Шифрование без миграции, recovery и rotation |

Keystore защищает ключевой материал; приложение получает ключ по alias, а не байты закрытого ключа. Возможны TEE/StrongBox, но StrongBox доступен не везде и медленнее. Потеря/инвалидация ключа, очистка данных и переустановка должны вести в контролируемый recovery/logout, а не в crash или резервную копию ключа рядом с ciphertext.

`EncryptedSharedPreferences` и `EncryptedFile` из `androidx.security:security-crypto` находятся в maintenance mode. Для новых решений выбирайте DataStore/internal storage и явную криптографию через Keystore там, где модель угроз действительно требует application-level encryption.

### 3.2. AEAD, nonce и ротация

Применяйте platform crypto (`java.security`, `javax.crypto`) и AEAD, обычно `AES/GCM/NoPadding`: свежий случайный IV при каждом шифровании, ciphertext с authentication tag и AAD, связывающий запись с user ID, типом и версией схемы. Для случайности - `SecureRandom`, не `Random`.

У ciphertext должны быть `version` и `keyId`. Новый ключ пишет, старый временно только читает. `AEADBadTagException` означает, что данные нельзя частично использовать: запись удаляют и запускают безопасное восстановление.

### 3.3. Биометрия и attestation

`BiometricPrompt` показывает системный UI; приложение не получает биометрические шаблоны. Результат callback сам по себе не граница: патченный клиент способен его подделать. Для защиты локального секрета ключ Keystore создают с `setUserAuthenticationRequired(true)` и используют через `CryptoObject`; тогда успешная сильная биометрия или credential открывают именно криптооперацию.

Обрабатывайте отсутствие биометрии, lockout, изменение lock screen и `KeyPermanentlyInvalidatedException`. Биометрия не заменяет server-side AuthN/AuthZ. Key attestation проверяется backend, который валидирует цепочку, challenge, security level и актуальный статус ключей.

### 3.4. Утечки вне storage

Проверяйте Auto Backup/data extraction rules, WebView cache, изображения recent tasks, screenshots, notifications, accessibility labels, analytics и crash reports. `FLAG_SECURE` разумен для экранов с особо чувствительным содержимым, но не защищает от скомпрометированного runtime и не является заменой server-side подтверждения.

---

## 4. Сеть и API как настоящая граница

### 4.1. TLS и redirects

Release-вариант использует HTTPS, системные trust anchors и отключённый cleartext. Пользовательский CA допустим исключительно через `<debug-overrides>` debug-подписи; trust-all `TrustManager`, `HostnameVerifier { true }` и `handler.proceed()` в `onReceivedSslError` недопустимы.

Pinning дополняет, но не заменяет TLS. Обычно пинят SPKI, имеют как минимум текущий и резервный pin, тестируют ротацию и предусматривают kill switch. Он не защищает от атакующего внутри процесса, поэтому не следует чинить обход hook-ами ещё одним локальным if.

Redirect разрешают только на ожидаемые HTTPS origins; credentials, cookies и `Authorization` не переносят на другой origin. WebView и OkHttp имеют разные cookie jars и независимые настройки TLS/pinning.

### 4.2. Сессии, retry и replay

- Access token короткоживущий; refresh token защищён сильнее, ротируется и отзывается сервером.
- Один координированный refresh на `401`, без бесконечного цикла и гонки параллельных запросов.
- Retry только для временных безопасных ошибок, с лимитом, exponential backoff и jitter.
- Изменяющий состояние `POST` имеет idempotency key, а критичное действие - server-issued nonce, привязанные action/user/session/TTL.
- AuthZ проверяется сервером для каждого объекта и действия; `userId`, `role`, цена и client flag никогда не являются источником истины.

---

## 5. WebView, SDK и native boundary

### 5.1. WebView

WebView включают только для контролируемого контента. Navigation ограничивают HTTPS origin allowlist; запрещают `file:`, `content:`, неизвестные deep links и `intent:` URL, если нет явного и безопасного контракта. Без необходимости отключают file/content access, universal access from file URLs, mixed content, multiple windows и third-party cookies. JavaScript и DOM storage включают только для конкретного trusted flow.

`addJavascriptInterface` оставляет минимальный типизированный API с проверкой origin и схемы сообщений. Bridge не должен выдавать tokens, filesystem или произвольные привилегированные команды. Для OAuth, платежей и критичных внешних flow предпочтительны Custom Tabs/system browser.

### 5.2. SDK и supply chain

Интеграция SDK расширяет trust boundary. Нужны инвентаризация зависимостей/SBOM, SCA, pinning версий, review permissions/manifest/сетевых доменов/данных SDK и возможность отключить его server-side флагом. Хост-приложение отвечает за privacy и Data Safety также для кода SDK.

Публичный SDK API должен быть минимальным, Java-friendly и backward-compatible. Инициализация не требует `Activity`, если достаточно application context; permission dialog не показывается неожиданно при обычном старте. Зависимости transport, clock, random source, storage и feature flags инъецируются для тестирования.

### 5.3. JNI и native code

Native-код оправдан производительностью или зрелой библиотекой, но не скрывает секреты и добавляет ABI/FFI/memory-safety риски. JNI boundary делают узкой: валидируют типы и длины, ограничивают буферы, корректно переводят ошибки, собирают нужные ABI и запускают sanitizers в тестах. Rust сокращает часть memory-safety рисков, но `unsafe` и FFI требуют того же аудита.

---

## 6. RASP и anti-fraud

Root, emulator, debugger, hook и tamper detection - вероятностные сигналы, а не абсолютные факты. Каждый легко скрывается, а ложные срабатывания задевают CI, QA, accessibility и нестандартные OEM-устройства.

Хороший probe возвращает `signalId`, confidence, версию правила, техническую причину и ошибку измерения. На backend отправляют минимизированную категорию/хеш, а не список установленных приложений или локальные пути.

```text
Android SDK -> versioned signals -> backend enrichment -> risk policy
                                          -> ALLOW | OBSERVE | CHALLENGE | LIMIT | REVIEW | DENY
```

Сначала правило запускают в shadow mode, затем раскатывают сегментами. Измеряют coverage, latency, решения, challenge completion, подтверждённые FP/FN и срезы по API level/OEM/региону/accessibility. Нужны owner, feature flag и kill switch.

Play Integrity добавляет серверу подписанный сигнал о распознанном Play приложении, устройстве и лицензировании. Запрос делают близко к защищаемому действию, связывают его с `requestHash`/nonce и проверяют ответ на backend. Вердикт не кэшируют как вечное право; policy имеет fallback на ошибки сервиса и не сводится к единственному bool.

---

## 7. Защита DEX и устойчивость к reverse engineering

### 7.1. Реалистичная цель

DEX нельзя сделать секретным после доставки пользователю: атакующий может извлечь APK, наблюдать память и перехватить расшифрованный/исполняемый код. Поэтому цель - увеличить стоимость статического и динамического анализа, затруднить массовый repackaging и получить risk signals. Авторизацию, секреты и ценное решение переносите на backend.

Базовый release baseline:

1. Включить R8: shrinking, obfuscation, optimization; минимальные корректные keep rules.
2. Защищать signing key и выпускать reproducible release-артефакт; хранить `mapping.txt` в закрытом crash/retrace процессе.
3. Проверять фактический APK/AAB: manifest, строковые ресурсы, DEX, native libs, permissions, debug/test endpoints.
4. Не размещать API secrets в DEX, resources, assets, `BuildConfig` или JNI.
5. Подтверждать критичные операции backend-ом и привязывать запрос к nonce/session/attestation.

### 7.2. Embedded DEX - системная защита Android 10+

Android 10+ может исполнять DEX прямо из APK. Это затрудняет локальную замену уже скомпилированного кода, потому что ART не опирается на отдельный предварительно скомпилированный артефакт. Цена - производительность: ART использует JIT, поэтому решение принимают только после измерения startup и критичных flow на целевых устройствах.

```xml
<application
    android:useEmbeddedDex="true"
    ... />
```

```kotlin
android {
    packaging {
        dex {
            useLegacyPackaging = false
        }
    }
}
```

Это не шифрование и не защита от runtime hook-ов; это один слой для конкретного класса локальной модификации. Он требует Android 10+ и проверки поведения/размера APK после сборки.

### 7.3. Шифрование/виртуализация DEX коммерческим протектором

Протектор может применять string/class encryption, control-flow obfuscation, code virtualization, integrity checks, anti-tamper, anti-debugging и anti-hooking. Расшифрованный фрагмент всё равно появляется в памяти, поэтому такие механизмы не образуют доверенную границу. Их сила - в стоимости массового анализа, полиморфизме релизов и сигналах для backend risk policy.

Критерии выбора:

| Критерий | Что проверить до закупки |
| --- | --- |
| Угроза | IP/repackaging, fraud, credential theft, compliance; какие действия защищаются |
| Совместимость | `minSdk`, AGP/Kotlin, Compose, Hilt/reflection, JNI, dynamic feature, split APK, 16 KB native libs |
| Техники | Нужны ли encryption, virtualization, RASP, app attestation, защита ресурсов/строк |
| Операции | Gradle/CI интеграция, reproducibility, mapping/retrace, release time, поддержка и SLA |
| UX | cold start, ANR, батарея, offline/fallback, accessibility и ложные срабатывания |
| Проверка | Защищённый release candidate, security regression, rollback и kill switch |

Из известных коммерческих классов решений: Guardsquare DexGuard (compiler-based protection и RASP), Promon SHIELD (runtime protection) и решения класса Appdome. Их выбирают через PoC на собственном приложении, а не по перечню маркетинговых фич. Для особенно регулируемых приложений необходимы независимый mobile pentest и проверка защищённого, а не debug, артефакта.

### 7.4. Ранний bootstrap через ContentProvider

ContentProvider действительно создаются системой при запуске процесса до обычного UI flow и до `Application.onCreate()`. Поэтому библиотечные startup-провайдеры иногда используют для установки ранних лёгких hooks или инициализации telemetry.

Однако `ContentProvider.onCreate()` вызывается на main thread. В нём нельзя делать сетевую аттестацию, распаковку/расшифровку большого DEX, сканирование файловой системы, синхронный I/O или тяжёлый root/hook scan: это ухудшает cold start и повышает ANR-риск. Android рекомендует откладывать нетривиальную инициализацию provider до реального использования.

Практичный дизайн:

```text
Provider bootstrap (микросекунды/миллисекунды)
  -> идемпотентно фиксирует process-local состояние и запускает bounded async подготовку
Application/Startup
  -> конфигурирует SDK и UI-safe обработку результата
Перед ценным действием
  -> свежий Play Integrity/request binding + backend risk policy
Backend
  -> final AuthZ, nonce/replay/idempotency и policy decision
```

Provider обязательно `exported="false"`, без внешней data surface. Учтите multiprocess: каждый процесс имеет свой `Application`, provider и singleton-граф. Bootstrap должен быть идемпотентен и не считать факт запуска доказательством целостности.

### 7.5. Динамическая загрузка DEX

Для Play-публикации не проектируйте защиту вокруг загрузки удалённого исполняемого DEX. Google прямо рекомендует избегать dynamic code loading, а многие формы удалённой загрузки нарушают правила Google Play. Для доставки функций используйте подписанный App Bundle, Play Feature Delivery/dynamic feature modules или обновление приложения.

Если локальная динамическая загрузка кода юридически и технически необходима (например, управляемое enterprise-окружение), минимальный безопасный контракт такой:

1. Код находится во internal storage приложения или в ином явно доверенном scoped location, не на shared external storage.
2. Перед загрузкой проверяются идентификатор версии, размер, digest и цифровая подпись; публичный ключ pinned в уже доверенном приложении.
3. Проверка подписи покрывает и код, и метаданные. Один SHA-256, хранящийся рядом с DEX, не защищает от подмены обоих файлов.
4. Загрузка атомарна: download во временный файл, verify, fsync/rename, затем load; прежняя валидная версия остаётся до успешной активации.
5. Есть allowlist module IDs, rollback, telemetry без секретов и fail-closed для модуля, но не бесконечный crash loop всего приложения.
6. Даже валидный DEX не получает права сверх UID приложения; его входы и privileged actions всё равно валидируются, а backend не доверяет ему.

Проверка security до загрузки не делает загрузчик неуязвимым на rooted/hooked устройстве: атакующий может перехватить и verifier, и class loader. Поэтому она защищает от случайной/части локальной подмены, а критичное действие продолжает требовать server-side authorization и свежий attestation signal.

---

## 8. Практика проверки защищённого релиза

### До включения enforcement

- Инвентаризировать критичные активы/операции и сформулировать attacker model.
- Прогнать защищённый release APK на реальных устройствах, emulator, разных API/OEM и в offline/poor-network режимах.
- Проверить login/refresh/logout, deep links, платежи, WebView/OAuth, process death, multi-process и accessibility.
- Сравнить startup, frame time, размер, батарею, crash/ANR и false positive с контрольной версией.
- Выполнить SAST/SCA/secret scan, manifest review и разрешённый статический/динамический аудит APK.
- Включить RASP/attestation сначала в shadow mode; задать kill switch и runbook инцидента.

### Негативные regression tests

| Сценарий | Ожидание |
| --- | --- |
| Exported component от другого UID | Закрыт либо требует permission и валидирует вход |
| Deep link с чужим host/path/типом | Не открывает privileged flow |
| TLS error/неверный hostname | Запрос не продолжает работу и не отправляет credentials |
| Повтор критичного API-запроса | Сервер отклоняет/reuses idempotent result |
| Token после logout/expiry | Сервер его не принимает |
| Повреждённый локальный модуль | Не загружается, есть recovery без crash loop |
| Сбой Integrity/защиты | Есть предсказуемый UX и серверный fallback |

---

## 9. OWASP Mobile Top 10 как карта аудита

| Категория OWASP 2024 | Android-фокус | Главное исправление |
| --- | --- | --- |
| M1 Improper Credential Usage | Tokens в logcat/URL/storage/backup | Короткий TTL, Keystore, redaction, revoke |
| M2 Supply Chain | Dependency, SDK, CI, signing | SBOM/SCA, pinning, provenance, review |
| M3 AuthN/AuthZ | IDOR, client role/user ID, local gate | AuthZ на backend для каждого действия |
| M4 Input/Output Validation | Intent, URI, Provider, WebView, parser | Schema, limits, allowlist, parameterized SQL |
| M5 Insecure Communication | TLS bypass, redirect, debug CA в release | Standard TLS, HTTPS allowlist, no `proceed()` |
| M6 Privacy | Excess telemetry/SDK/device data | Минимизация, consent, retention, Data Safety |
| M7 Binary Protections | Readable/tampered APK | R8, protection PoC, integrity signals, backend |
| M8 Misconfiguration | Exported/debuggable/backup/permissions | Secure defaults и release artifact review |
| M9 Data Storage | PII в файлах/cache/screenshots | Internal storage, backup exclusions, cleanup |
| M10 Cryptography | Static key/IV, ECB, weak random | Keystore, AEAD, `SecureRandom`, rotation |

Один сценарий может относиться к нескольким категориям. В отчёте описывают первопричину и влияние один раз, а стандарты приводят как классификацию, не как дубликаты findings.

---

## 10. Вопросы для интервью

1. Как начать graybox-анализ APK и зафиксировать допустимый scope?
2. Почему exported component может стать confused deputy без передачи ему ваших permissions?
3. Как отличить проверку UI от доверительной границы в backend?
4. Как безопасно обработать forwarded Intent и URI grants?
5. Что проверять у `ContentProvider` и `FileProvider`?
6. Почему `Uri.parse()` не является валидацией deep link?
7. Что хранит Android Keystore, а что должно лежать в ciphertext storage?
8. Почему биометрия без `CryptoObject` не является защитой локального секрета?
9. Как организовать refresh token без гонки и бесконечного retry?
10. Почему pinning не лечит attacker-controlled runtime?
11. Какие настройки WebView запрещены по умолчанию и почему?
12. Почему root/hook detection - сигнал, а не единственное решение?
13. Чем R8 отличается от коммерческого протектора и зачем `mapping.txt`?
14. Что даёт `android:useEmbeddedDex`, какова цена и чего он не решает?
15. Почему нельзя выполнять тяжёлую security-проверку в `ContentProvider.onCreate()`?
16. Почему remote DEX loading не подходит как типовая стратегия Google Play приложения?
17. Как проверять локальный DEX-модуль до загрузки и почему этого недостаточно против hook-ов?
18. Как выбрать DexGuard/Promon/Appdome-класс решения без опоры на маркетинг?
19. Какие метрики и rollout нужны до включения RASP enforcement?
20. Какой минимальный набор regression tests доказывает, что защищённая release-сборка не сломала продукт?

---

## Источники

- [Android security risks](https://developer.android.com/privacy-and-security/risks)
- [Dynamic code loading](https://developer.android.com/privacy-and-security/risks/dynamic-code-loading)
- [Run embedded DEX from APK](https://developer.android.com/privacy-and-security/security-dex)
- [ContentProvider API reference](https://developer.android.com/reference/android/content/ContentProvider)
- [Play Integrity overview](https://developer.android.com/google/play/integrity/overview)
- [Android Keystore](https://developer.android.com/privacy-and-security/keystore)
- [OWASP MASVS](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [OWASP Mobile Top 10](https://owasp.org/www-project-mobile-top-10/)
- [DexGuard](https://www.guardsquare.com/dexguard)