import type { Question, TopicId } from '../domain/models'
import { androidSdkQuestions } from './androidSdk'
import { composeQuestions } from './compose'
import { coroutinesQuestions } from './coroutines'
import { dependencyInjectionQuestions } from './dependencyInjection'
import { jvmMemoryQuestions } from './jvmMemory'
import { kotlinQuestions } from './kotlin'

export const questionsByTopic: Record<TopicId, Question[]> = {
  kotlin: kotlinQuestions,
  compose: composeQuestions,
  coroutines: coroutinesQuestions,
  'jvm-memory': jvmMemoryQuestions,
  'android-sdk': androidSdkQuestions,
  'dependency-injection': dependencyInjectionQuestions,
}

export const allQuestions = Object.values(questionsByTopic).flat()
export const questionById = new Map(
  allQuestions.map((question) => [question.id, question]),
)
