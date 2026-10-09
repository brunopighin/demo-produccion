import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex h-dvh bg-surface">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
