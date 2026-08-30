import type { Topic } from '../domain/models'

export const topics: Topic[] = [
  {
    id: 'kotlin',
    title: 'Kotlin',
    description: 'Система типов, объектная модель, generics, коллекции и JVM interop.',
    sources: ['Kotlin_Senior_Android_Guide.markdown'],
  },
  {
    id: 'compose',
    title: 'Jetpack Compose',
    description: 'Runtime, state, recomposition, layout, effects и производительность.',
    sources: ['Jetpack_Compose_Senior_Android_Guide.markdown'],
  },
  {
    id: 'coroutines',
    title: 'Kotlin Coroutines',
    description: 'Android scopes, Flow, тестирование, callback bridges и live-coding паттерны.',
    sources: ['08-coroutines-android.md'],
  },
  {
    id: 'jvm-memory',
    title: 'JVM Memory',
    description: 'ART, GC, ссылки, утечки, native memory, OOM и профили компиляции.',
    sources: ['09-jvm-memory-deep.md'],
  },
  {
    id: 'android-sdk',
    title: 'Android SDK',
    description: 'Компоненты, lifecycle, фоновые ограничения, Binder, permissions и storage.',
    sources: ['10-android-sdk-deep.md'],
  },
  {
    id: 'dependency-injection',
    title: 'Dependency Injection',
    description: 'Dagger/Hilt, scopes, Gradle, R8, варианты сборки и CI/CD.',
    sources: ['13-di-build-deep.md'],
  },
]
