import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { btnSecondary, cn, navLinkClass } from '../../utils/ui'

export default function Navbar({ onLogout, onMenuClick }) {
  const { user, isAdmin } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <Link to="/dashboard" className={cn(navLinkClass, 'flex items-center gap-2.5 min-w-0 text-slate-900')}>
          <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
            I
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-900">Inventory System</div>
            <div className="hidden sm:block text-xs text-slate-500">Stock Management Portal</div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:block text-right">
          <div className="text-sm font-medium text-slate-800">{user?.username}</div>
          <div className="text-xs text-slate-500">{isAdmin ? 'Super Admin' : 'Staff'}</div>
        </div>
        {isAdmin && (
          <span className="hidden sm:inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            Admin
          </span>
        )}
        <button type="button" className={cn(btnSecondary, 'px-3 py-2 text-sm')} onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}
