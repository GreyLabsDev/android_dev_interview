import { Link, Outlet } from 'react-router-dom'
import { useTraining } from '../app/TrainingContext'

export function AppLayout() {
  const { reset } = useTraining()

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" onClick={reset}>
          Android Interview Trainer
        </Link>
        <nav aria-label="Основная навигация">
          <Link to="/" onClick={reset}>
            Темы
          </Link>
          <Link to="/theory" onClick={reset}>
            Вся теория
          </Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        Материалы для подготовки к собеседованию Senior Android Developer
      </footer>
    </div>
  )
}
