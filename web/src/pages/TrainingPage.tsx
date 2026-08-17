import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTraining } from '../app/TrainingContext'
import { questionById, questionsByTopic } from '../content'
import { topics } from '../content/topics'
import { materials } from '../generated/materials'

function normalizeHeading(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_~]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

function materialUrl(file: string, section: string) {
  const material = materials.find((item) => item.file === file)
  if (!material) return '/theory'
  const heading = material.headings.find(
    (item) => normalizeHeading(item.title) === normalizeHeading(section),
  )
  const query = heading ? `?section=${encodeURIComponent(heading.slug)}` : ''
  return `/theory/${material.slug}${query}`
}

export function TrainingPage() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const { run, answer, reset } = useTraining()
  const [questionIndex, setQuestionIndex] = useState(() =>
    run ? Math.min(run.batchAnswers.length, run.batchQuestionIds.length - 1) : 0,
  )

  const topic = topics.find((item) => item.id === topicId)
  const isValidRun = run && topic && run.topicId === topic.id
  const questionId = isValidRun ? run.batchQuestionIds[questionIndex] : undefined
  const question = questionId ? questionById.get(questionId) : undefined
  const selectedAnswer = question
    ? run?.batchAnswers.find((item) => item.questionId === question.id)
    : undefined

  const orderedOptions = useMemo(() => {
    if (!question || !run) return []
    const order = run.optionOrder[question.id] ?? question.options.map((item) => item.id)
    return order
      .map((optionId) => question.options.find((option) => option.id === optionId))
      .filter((option) => option !== undefined)
  }, [question, run])

  if (!isValidRun || !question) {
    return (
      <div className="page narrow-page empty-state">
        <h1>Тренировка не найдена</h1>
        <p>Запустите новую тренировку с главного экрана.</p>
        <Link className="button button-primary" to="/" onClick={reset}>
          Выбрать тему
        </Link>
      </div>
    )
  }

  const totalQuestions = questionsByTopic[topic.id].length
  const currentInBatch = questionIndex + 1
  const covered = run.offset + currentInBatch
  const batchSize = run.batchQuestionIds.length

  function goNext() {
    if (questionIndex + 1 >= batchSize) {
      navigate('/results')
      return
    }
    setQuestionIndex((index) => index + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="page narrow-page training-page">
      <div className="training-meta">
        <div>
          <p className="eyebrow">{topic.title}</p>
          <h1>
            Вопрос {currentInBatch} из {run.batchQuestionIds.length}
          </h1>
        </div>
        <div className="coverage">
          Покрытие темы: {Math.min(covered, totalQuestions)} / {totalQuestions}
        </div>
      </div>

      <progress
        aria-label="Прогресс текущей тренировки"
        max={run.batchQuestionIds.length}
        value={currentInBatch}
      />

      <article className="question-card">
        <div className="question-tags">
          <span>{question.subtopic}</span>
          <span>{question.difficulty}</span>
        </div>
        <h2>{question.prompt}</h2>
        {question.code && <pre><code>{question.code.value}</code></pre>}

        <div className="answer-list" role="group" aria-label="Варианты ответа">
          {orderedOptions.map((option) => {
            const isCorrect = option.id === question.correctOptionId
            const isSelected = option.id === selectedAnswer?.selectedOptionId
            const stateClass = selectedAnswer
              ? isCorrect
                ? 'answer-correct'
                : isSelected
                  ? 'answer-wrong'
                  : 'answer-muted'
              : ''
            return (
              <button
                className={`answer-option ${stateClass}`}
                disabled={Boolean(selectedAnswer)}
                key={option.id}
                type="button"
                onClick={() => answer(question, option.id)}
              >
                <span>{option.text}</span>
                {selectedAnswer && isCorrect && <strong>Верно</strong>}
                {selectedAnswer && isSelected && !isCorrect && <strong>Ваш ответ</strong>}
              </button>
            )
          })}
        </div>
      </article>

      {selectedAnswer && (
        <aside
          className={`explanation ${selectedAnswer.correct ? 'is-correct' : 'is-wrong'}`}
          aria-live="polite"
        >
          <p className="eyebrow">{selectedAnswer.correct ? 'Правильно' : 'Неверно'}</p>
          <h2>{question.explanation.summary}</h2>
          <p>{question.explanation.mechanism}</p>
          {question.explanation.trap && (
            <p><strong>Ловушка:</strong> {question.explanation.trap}</p>
          )}
          {question.explanation.example && (
            <pre><code>{question.explanation.example}</code></pre>
          )}
          {question.explanation.verification && (
            <p><strong>Как проверить:</strong> {question.explanation.verification}</p>
          )}
          <div className="explanation-actions">
            <Link
              className="button button-secondary"
              rel="noreferrer"
              target="_blank"
              to={materialUrl(question.source.file, question.source.section)}
            >
              Открыть источник
            </Link>
            <button className="button button-primary" type="button" onClick={goNext}>
              {currentInBatch === run.batchQuestionIds.length ? 'Показать результат' : 'Следующий вопрос'}
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
