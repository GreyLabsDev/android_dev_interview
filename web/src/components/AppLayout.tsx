import { Link, Outlet } from 'react-router-dom'
import { useTraining } from '../app/TrainingContext'
import { useThemeMode } from '../app/useThemeMode'

export function AppLayout() {
  const { reset } = useTraining()
  const { mode, toggle } = useThemeMode()

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/" onClick={reset}>
          Android Interview Trainer
        </Link>
        <div className="header-actions">
          <nav aria-label="Основная навигация">
            <Link to="/" onClick={reset}>
              Темы
            </Link>
            <Link to="/theory" onClick={reset}>
              Теория
            </Link>
          </nav>
          <button
            aria-checked={mode === 'dark'}
            aria-label={
              mode === 'dark'
                ? 'Использовать тему устройства'
                : 'Включить принудительную тёмную тему'
            }
            className="theme-toggle"
            role="switch"
            title={mode === 'dark' ? 'Тёмная тема' : 'Тема устройства'}
            type="button"
            onClick={toggle}
          >
            <span className="theme-label">
              {mode === 'dark' ? 'Тёмная' : 'Как на устройстве'}
            </span>
            <span aria-hidden="true" className="switch-track">
              <span className="switch-thumb" />
            </span>
          </button>
        </div>
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
