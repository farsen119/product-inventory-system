import { Link } from 'react-router-dom'
import { badgeDanger, badgeWarning, cn, formatStock, navLinkClass } from '../../utils/ui'

export default function LowStockAlerts({ alerts = [], totalCount = 0 }) {
  if (!totalCount) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center">
        <svg className="mb-2 h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-slate-600">All stock levels look healthy</p>
        <p className="mt-1 text-xs text-slate-400">No sub-variants are at or below their threshold</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        {totalCount} sub-variant{totalCount === 1 ? '' : 's'} need attention
        {alerts.length < totalCount && ` · showing ${alerts.length}`}
      </p>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {alerts.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
              <p className="truncate text-xs text-slate-500">{item.product_name}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className={badgeWarning}>{formatStock(item.stock)} left</span>
              <p className="mt-1 text-[11px] text-slate-400">
                threshold {formatStock(item.low_stock_threshold)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className={badgeDanger}>Action needed</span>
        <Link to="/stock" className={cn(navLinkClass, 'text-xs font-semibold text-slate-700 hover:text-slate-900')}>
          Manage stock →
        </Link>
      </div>
    </div>
  )
}
