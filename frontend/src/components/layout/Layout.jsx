import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { showInfo } from '../../utils/toast'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    showInfo('You have been logged out.')
    navigate('/login')
  }

  return (
    <div className="app-shell h-screen overflow-hidden bg-slate-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex h-screen min-w-0 flex-col lg:ml-64">
        <Navbar onLogout={handleLogout} onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
