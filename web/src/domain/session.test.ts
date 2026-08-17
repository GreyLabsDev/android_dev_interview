import { describe, expect, it } from 'vitest'
import type { Question } from './models'
import {
  BATCH_SIZE,
  continueTraining,
  createTrainingRun,
  recordAnswer,
  score,
  shuffle,
} from './session'

function questions(count = 40): Question[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `kotlin-${index}`,
    topicId: 'kotlin',
    subtopic: 'Types',
    difficulty: 'basic',
    kind: 'theory',
    prompt: `Question ${index}`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
      { id: 'd', text: 'D' },
    ],
    correctOptionId: 'a',
    explanation: { summary: 'A', mechanism: 'Because A' },
    source: { file: 'Kotlin_Senior_Android_Guide.markdown', section: 'Types' },
    tags: ['types'],
  }))
}

describe('training session', () => {
  it('shuffles without mutating source', () => {
    const source = [1, 2, 3, 4]
    const result = shuffle(source, () => 0)
    expect(source).toEqual([1, 2, 3, 4])
    expect(result).toEqual([2, 3, 4, 1])
  })

  it('creates a batch of twenty unique questions', () => {
    const run = createTrainingRun('kotlin', questions(), () => 0.5)
    expect(run.batchQuestionIds).toHaveLength(BATCH_SIZE)
    expect(new Set(run.batchQuestionIds).size).toBe(BATCH_SIZE)
    expect(run.deck).toHaveLength(40)
  })

  it('rejects a bank that cannot form complete batches', () => {
    expect(() => createTrainingRun('kotlin', questions(21))).toThrow(
      'positive multiple of 20',
    )
  })

  it('continues with unseen questions and completes the topic', () => {
    const bank = questions()
    let run = createTrainingRun('kotlin', bank, () => 0.5)
    const firstBatch = [...run.batchQuestionIds]

    for (const id of firstBatch) {
      run = recordAnswer(run, bank.find((item) => item.id === id)!, 'a')
    }
    run = continueTraining(run)

    expect(run.batchQuestionIds.some((id) => firstBatch.includes(id))).toBe(false)
    for (const id of run.batchQuestionIds) {
      run = recordAnswer(run, bank.find((item) => item.id === id)!, 'b')
    }

    expect(run.completed).toBe(true)
    expect(score(run.allAnswers)).toEqual({ correct: 20, total: 40, percent: 50 })
  })
})
