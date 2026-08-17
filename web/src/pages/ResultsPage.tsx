import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTraining } from '../app/TrainingContext'
import { questionById } from '../content'
import { topics } from '../content/topics'
import { score } from '../domain/session'

export function ResultsPage() {
  const navigate = useNavigate()
  const { run, continueTopic, reset, start } = useTraining()
  const topic = topics.find((item) => item.id === run?.topicId)

  useEffect(() => {
    if (!run?.completed) return
    const resetAfterLeavingFinalResult = () => {
      if (!window.location.hash.startsWith('#/results')) reset()
    }
    window.addEventListener('hashchange', resetAfterLeavingFinalResult)
    return () => window.removeEventListener('hashchange', resetAfterLeavingFinalResult)
  }, [reset, run?.completed])

  if (
    !run ||
    !topic ||
    run.batchAnswers.length !== run.batchQuestionIds.length
  ) {
    return (
      <div className="page narrow-page empty-state">
        <h1>Готового результата нет</h1>
        <Link className="button button-primary" to="/" onClick={reset}>
          Выбрать тему
        </Link>
      </div>
    )
  }

  const batchScore = score(run.batchAnswers)
  const totalScore = score(run.allAnswers)
  const completedBatches = Math.ceil(run.allAnswers.length / run.batchQuestionIds.length)
  const activeTopicId = topic.id

  const subtopicScores = [...new Set(
    run.allAnswers
      .map((answer) => questionById.get(answer.questionId)?.subtopic)
      .filter((subtopic) => subtopic !== undefined),
  )]
    .map((subtopic) => {
      const answers = run.allAnswers.filter(
        (answer) => questionById.get(answer.questionId)?.subtopic === subtopic,
      )
      return { subtopic, ...score(answers) }
    })
    .sort((left, right) => left.percent - right.percent)

  function continueRun() {
    continueTopic()
    navigate(`/training/${activeTopicId}`)
  }

  function restart() {
    reset()
    start(activeTopicId)
    navigate(`/training/${activeTopicId}`)
  }

  return (
    <div className="page narrow-page results-page">
      <p className="eyebrow">
        {run.completed ? 'Тема пройдена полностью' : `Блок ${completedBatches} завершён`}
      </p>
      <h1>{topic.title}</h1>

      <section className="score-card" aria-label="Результат">
        <div className="score-circle">
          <strong>{run.completed ? totalScore.percent : batchScore.percent}%</strong>
          <span>правильных ответов</span>
        </div>
        <div className="score-details">
          <p>
            <strong>{batchScore.correct} из {batchScore.total}</strong>
            {' '}в текущем блоке
          </p>
          <p>
            <strong>{totalScore.correct} из {totalScore.total}</strong>
            {' '}за всю длинную тренировку
          </p>
          <p>
            Завершено блоков: <strong>{completedBatches}</strong>
          </p>
        </div>
      </section>

      {run.completed && (
        <section className="subtopic-results">
          <h2>Результат по подразделам</h2>
          <div className="subtopic-list">
            {subtopicScores.map((item) => (
              <div key={item.subtopic}>
                <span>{item.subtopic}</span>
                <strong>{item.correct}/{item.total} · {item.percent}%</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="result-actions">
        {!run.completed && (
          <button className="button button-primary" type="button" onClick={continueRun}>
            Продолжить тему: ещё 20 вопросов
          </button>
        )}
        <button className="button button-secondary" type="button" onClick={restart}>
          Пройти тему заново
        </button>
        <Link className="button button-ghost" to="/" onClick={reset}>
          На главный экран
        </Link>
      </div>
    </div>
  )
}
