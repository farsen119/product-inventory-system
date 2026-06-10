import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  filterNavigation,
  isNavGroupActive,
  isNavLinkActive,
} from '../../config/navigation'
import { cn, navLinkClass } from '../../utils/ui'

function NavIcon({ name }) {
  const icons = {
    dashboard: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
    ),
    products: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    ),
    categories: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    ),
    stock: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
  }

  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  )
}

function SidebarLink({ to, label, end, onNavigate }) {
  const { pathname } = useLocation()

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={cn(
        navLinkClass,
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
        isNavLinkActive(to, pathname, end)
          ? 'bg-slate-800 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      {label}
    </NavLink>
  )
}

function SidebarGroup({ item, open, onToggle, onNavigate }) {
  const { pathname } = useLocation()
  const active = isNavGroupActive(item, pathname)

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <span className="flex items-center gap-3">
          <NavIcon name={item.id} />
          {item.label}
        </span>
        <svg
          className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="mt-1 ml-4 space-y-0.5 border-l border-slate-200 pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end={child.end}
              onClick={onNavigate}
              className={cn(
                navLinkClass,
                'block rounded-lg px-3 py-2 text-sm transition',
                isNavLinkActive(child.to, pathname, child.end)
                  ? 'bg-slate-800 text-white font-medium'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
              )}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarContent({ onNavigate }) {
  const { isAdmin } = useAuth()
  const { pathname } = useLocation()
  const items = filterNavigation(isAdmin)

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {}
    items.forEach((item) => {
      if (item.children && isNavGroupActive(item, pathname)) {
        initial[item.id] = true
      }
    })
    return initial
  })

  const toggleGroup = (id) => {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
      {items.map((item) =>
        item.children ? (
          <SidebarGroup
            key={item.id}
            item={item}
            open={openGroups[item.id] ?? isNavGroupActive(item, pathname)}
            onToggle={() => toggleGroup(item.id)}
            onNavigate={onNavigate}
          />
        ) : (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={cn(
              navLinkClass,
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
              isNavLinkActive(item.to, pathname, item.end)
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <NavIcon name={item.id} />
            {item.label}
          </NavLink>
        ),
      )}
    </nav>
  )
}

export default function Sidebar({ mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
            I
          </div>
          <span className="font-semibold text-slate-900">Inventory</span>
        </div>

        <SidebarContent onNavigate={onClose} />
      </aside>
    </>
  )
}

export { SidebarLink }
