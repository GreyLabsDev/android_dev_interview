import type {
  AnswerRecord,
  Question,
  TopicId,
  TrainingRun,
} from './models'

export const BATCH_SIZE = 20

function secureRandom() {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1)
    globalThis.crypto.getRandomValues(value)
    return (value[0] ?? 0) / 0x1_0000_0000
  }
  return Math.random()
}

export function shuffle<T>(
  items: readonly T[],
  random: () => number = secureRandom,
): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [
      result[swapIndex] as T,
      result[index] as T,
    ]
  }
  return result
}

export function createTrainingRun(
  topicId: TopicId,
  questions: readonly Question[],
  random: () => number = secureRandom,
): TrainingRun {
  if (questions.length < BATCH_SIZE || questions.length % BATCH_SIZE !== 0) {
    throw new Error(`Question count for ${topicId} must be a positive multiple of ${BATCH_SIZE}`)
  }

  const deck = shuffle(
    questions.map((question) => question.id),
    random,
  )
  const optionOrder = Object.fromEntries(
    questions.map((question) => [
      question.id,
      shuffle(
        question.options.map((option) => option.id),
        random,
      ),
    ]),
  )

  return {
    version: 1,
    topicId,
    deck,
    optionOrder,
    offset: 0,
    batchQuestionIds: deck.slice(0, BATCH_SIZE),
    batchAnswers: [],
    allAnswers: [],
    completed: false,
  }
}

export function recordAnswer(
  run: TrainingRun,
  question: Question,
  selectedOptionId: string,
): TrainingRun {
  if (!run.batchQuestionIds.includes(question.id)) {
    throw new Error('Question does not belong to the current batch')
  }
  if (run.batchAnswers.some((answer) => answer.questionId === question.id)) {
    return run
  }
  if (!question.options.some((option) => option.id === selectedOptionId)) {
    throw new Error('Unknown answer option')
  }

  const answer: AnswerRecord = {
    questionId: question.id,
    selectedOptionId,
    correct: selectedOptionId === question.correctOptionId,
  }
  const batchAnswers = [...run.batchAnswers, answer]
  const allAnswers = [...run.allAnswers, answer]
  const isBatchFinished = batchAnswers.length === run.batchQuestionIds.length
  const isLastBatch = run.offset + BATCH_SIZE >= run.deck.length

  return {
    ...run,
    batchAnswers,
    allAnswers,
    completed: isBatchFinished && isLastBatch,
  }
}

export function continueTraining(run: TrainingRun): TrainingRun {
  if (run.batchAnswers.length !== run.batchQuestionIds.length) {
    throw new Error('Current batch is not finished')
  }
  if (run.completed) {
    throw new Error('Topic is already completed')
  }

  const offset = run.offset + BATCH_SIZE
  return {
    ...run,
    offset,
    batchQuestionIds: run.deck.slice(offset, offset + BATCH_SIZE),
    batchAnswers: [],
  }
}

export function score(answers: readonly AnswerRecord[]) {
  const correct = answers.filter((answer) => answer.correct).length
  const total = answers.length
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
  }
}
