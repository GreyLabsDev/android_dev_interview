import { topicIds, type TrainingRun } from '../domain/models'

const STORAGE_KEY = 'android-interview-trainer:run'

function isTrainingRun(value: unknown): value is TrainingRun {
  if (!value || typeof value !== 'object') return false
  const run = value as Partial<TrainingRun>
  return (
    run.version === 1 &&
    topicIds.includes(run.topicId as TrainingRun['topicId']) &&
    Array.isArray(run.deck) &&
    typeof run.optionOrder === 'object' &&
    run.optionOrder !== null &&
    typeof run.offset === 'number' &&
    Array.isArray(run.batchQuestionIds) &&
    Array.isArray(run.batchAnswers) &&
    Array.isArray(run.allAnswers) &&
    typeof run.completed === 'boolean'
  )
}

export function loadTrainingRun(): TrainingRun | null {
  try {
    const serialized = sessionStorage.getItem(STORAGE_KEY)
    if (!serialized) return null
    const parsed: unknown = JSON.parse(serialized)
    if (!isTrainingRun(parsed)) {
      clearTrainingRun()
      return null
    }
    return parsed
  } catch {
    clearTrainingRun()
    return null
  }
}

export function saveTrainingRun(run: TrainingRun) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(run))
}

export function clearTrainingRun() {
  sessionStorage.removeItem(STORAGE_KEY)
}
