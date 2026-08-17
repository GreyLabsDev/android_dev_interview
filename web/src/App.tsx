import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { TrainingProvider } from './app/TrainingContext'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { TrainingPage } from './pages/TrainingPage'
import './App.css'

const TheoryPage = lazy(() =>
  import('./pages/TheoryPage').then((module) => ({ default: module.TheoryPage })),
)

function TheoryRoute() {
  return (
    <Suspense fallback={<div className="page">Загружаем материалы…</div>}>
      <TheoryPage />
    </Suspense>
  )
}

function App() {
  return (
    <HashRouter>
      <TrainingProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="training/:topicId" element={<TrainingPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="theory" element={<TheoryRoute />} />
            <Route path="theory/:slug" element={<TheoryRoute />} />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </TrainingProvider>
    </HashRouter>
  )
}

export default App
