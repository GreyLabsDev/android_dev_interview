import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { questionsByTopic } from '../content'
import type { Question, TopicId, TrainingRun } from '../domain/models'
import {
  continueTraining,
  createTrainingRun,
  recordAnswer,
} from '../domain/session'
import {
  clearTrainingRun,
  loadTrainingRun,
  saveTrainingRun,
} from '../storage/trainingStorage'

interface TrainingContextValue {
  run: TrainingRun | null
  start: (topicId: TopicId) => TrainingRun
  answer: (question: Question, optionId: string) => TrainingRun
  continueTopic: () => TrainingRun
  reset: () => void
}

const TrainingContext = createContext<TrainingContextValue | null>(null)

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<TrainingRun | null>(() => loadTrainingRun())

  const update = useCallback((next: TrainingRun) => {
    saveTrainingRun(next)
    setRun(next)
    return next
  }, [])

  const start = useCallback(
    (topicId: TopicId) => update(createTrainingRun(topicId, questionsByTopic[topicId])),
    [update],
  )

  const answer = useCallback(
    (question: Question, optionId: string) => {
      if (!run) throw new Error('Training has not started')
      return update(recordAnswer(run, question, optionId))
    },
    [run, update],
  )

  const continueTopic = useCallback(() => {
    if (!run) throw new Error('Training has not started')
    return update(continueTraining(run))
  }, [run, update])

  const reset = useCallback(() => {
    clearTrainingRun()
    setRun(null)
  }, [])

  const value = useMemo(
    () => ({ run, start, answer, continueTopic, reset }),
    [answer, continueTopic, reset, run, start],
  )

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useTraining() {
  const value = useContext(TrainingContext)
  if (!value) throw new Error('useTraining must be used inside TrainingProvider')
  return value
}
