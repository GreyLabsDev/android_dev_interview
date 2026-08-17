export const topicIds = [
  'kotlin',
  'compose',
  'coroutines',
  'jvm-memory',
  'android-sdk',
  'dependency-injection',
] as const

export type TopicId = (typeof topicIds)[number]
export type Difficulty = 'basic' | 'senior' | 'expert'
export type QuestionKind = 'theory' | 'scenario' | 'code'

export interface Topic {
  id: TopicId
  title: string
  description: string
  sources: string[]
}

export interface AnswerOption {
  id: string
  text: string
}

export interface Explanation {
  summary: string
  mechanism: string
  trap?: string
  example?: string
  verification?: string
}

export interface SourceRef {
  file: string
  section: string
}

export interface Question {
  id: string
  topicId: TopicId
  subtopic: string
  difficulty: Difficulty
  kind: QuestionKind
  prompt: string
  code?: {
    language: 'kotlin'
    value: string
  }
  options: AnswerOption[]
  correctOptionId: string
  explanation: Explanation
  source: SourceRef
  tags: string[]
  version?: {
    asOf: string
    reviewAfter: string
  }
}

export interface AnswerRecord {
  questionId: string
  selectedOptionId: string
  correct: boolean
}

export interface TrainingRun {
  version: 1
  topicId: TopicId
  deck: string[]
  optionOrder: Record<string, string[]>
  offset: number
  batchQuestionIds: string[]
  batchAnswers: AnswerRecord[]
  allAnswers: AnswerRecord[]
  completed: boolean
}
