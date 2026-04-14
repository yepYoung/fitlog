import { lazy, Suspense } from 'react'
import { Routes, Route, Outlet } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import FloatingTimer from './components/FloatingTimer'
import BackgroundDecor from './components/BackgroundDecor'

const Home = lazy(() => import('./pages/Home'))
const Feeling = lazy(() => import('./pages/Feeling'))
const FoodRecord = lazy(() => import('./pages/FoodRecord'))
const ExerciseRecord = lazy(() => import('./pages/ExerciseRecord'))
const History = lazy(() => import('./pages/History'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Settings = lazy(() => import('./pages/Settings'))

function MainLayout() {
  return (
    <div className="min-h-screen max-w-lg mx-auto relative">
      <Toast />
      <main className="pb-20">
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <Suspense>
      <BackgroundDecor />
      <FloatingTimer />
      <Routes>
        <Route path="/record/food" element={<FoodRecord />} />
        <Route path="/record/exercise" element={<ExerciseRecord />} />
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="feeling" element={<Feeling />} />
          <Route path="history" element={<History />} />
          <Route path="stats" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
