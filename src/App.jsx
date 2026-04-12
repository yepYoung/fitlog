import { Routes, Route, Outlet } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Toast from './components/Toast'
import Home from './pages/Home'
import FoodRecord from './pages/FoodRecord'
import ExerciseRecord from './pages/ExerciseRecord'
import History from './pages/History'
import Statistics from './pages/Statistics'
import Settings from './pages/Settings'

function MainLayout() {
  return (
    <div className="min-h-screen max-w-lg mx-auto relative">
      <Toast />
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/record/food" element={<FoodRecord />} />
      <Route path="/record/exercise" element={<ExerciseRecord />} />
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="history" element={<History />} />
        <Route path="stats" element={<Statistics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
