import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Toast from './Toast'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto relative">
      <Toast />
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
