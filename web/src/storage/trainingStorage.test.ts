import { beforeEach, describe, expect, it } from 'vitest'
import { createTrainingRun } from '../domain/session'
import type { Question } from '../domain/models'
import {
  clearTrainingRun,
  loadTrainingRun,
  saveTrainingRun,
} from './trainingStorage'

const bank: Question[] = Array.from({ length: 20 }, (_, index) => ({
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
  explanation: { summary: 'A', mechanism: 'A is correct' },
  source: { file: 'README.md', section: 'Kotlin' },
  tags: ['test'],
}))

describe('training storage', () => {
  beforeEach(() => sessionStorage.clear())

  it('saves and restores a run', () => {
    const run = createTrainingRun('kotlin', bank, () => 0.4)
    saveTrainingRun(run)
    expect(loadTrainingRun()).toEqual(run)
  })

  it('clears corrupted data', () => {
    sessionStorage.setItem('android-interview-trainer:run', '{bad json')
    expect(loadTrainingRun()).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('clears explicitly', () => {
    saveTrainingRun(createTrainingRun('kotlin', bank))
    clearTrainingRun()
    expect(loadTrainingRun()).toBeNull()
  })
})
