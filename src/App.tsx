import { lazy, Suspense } from 'react'
import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import FloatingTimer from './components/FloatingTimer'
import CloudGate from './components/CloudGate'

const Home = lazy(() => import('./pages/Home'))
const FoodRecord = lazy(() => import('./pages/FoodRecord'))
const ExerciseRecord = lazy(() => import('./pages/ExerciseRecord'))
const Cycling = lazy(() => import('./pages/Cycling'))
const History = lazy(() => import('./pages/History'))
const Statistics = lazy(() => import('./pages/Statistics'))
const Settings = lazy(() => import('./pages/Settings'))

function MainLayout() {
  return (
    <div className="min-h-screen max-w-lg mx-auto relative">
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
    <CloudGate><Suspense>
      <Toast />
      <FloatingTimer />
      <Routes>
        <Route path="/record/food" element={<FoodRecord />} />
        <Route path="/record/exercise" element={<ExerciseRecord />} />
        <Route path="/record/exercise/cycling" element={<Cycling />} />
        <Route path="/cycling" element={<Navigate to="/record/exercise/cycling" replace />} />
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="feeling" element={<Navigate to="/" replace />} />
          <Route path="history" element={<History />} />
          <Route path="stats" element={<Statistics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense></CloudGate>
  )
}
