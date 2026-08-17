import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTraining } from '../app/TrainingContext'
import { questionsByTopic } from '../content'
import { topics } from '../content/topics'

export function HomePage() {
  const navigate = useNavigate()
  const { start, reset } = useTraining()

  useEffect(() => {
    reset()
  }, [reset])

  function startTopic(topicId: (typeof topics)[number]['id']) {
    reset()
    start(topicId)
    navigate(`/training/${topicId}`)
  }

  return (
    <div className="page page-home">
      <section className="hero">
        <p className="eyebrow">Senior Android · тренировка памяти</p>
        <h1>Выберите тему</h1>
        <p>
          В каждой тренировке 20 вопросов. Продолжайте следующими блоками,
          чтобы пройти всю тему без повторов.
        </p>
      </section>

      <section className="topic-grid" aria-label="Темы тренировок">
        {topics.map((topic) => (
          <article className="topic-card" key={topic.id}>
            <div>
              <p className="topic-count">
                {questionsByTopic[topic.id].length} вопросов
              </p>
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
            </div>
            <div>
              <p className="topic-source">{topic.sources.join(' · ')}</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => startTopic(topic.id)}
              >
                Начать тренировку
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
