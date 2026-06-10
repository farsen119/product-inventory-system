import { cn, cardClass } from '../../utils/ui'

export default function DashboardChartCard({
  title,
  description,
  action,
  children,
  className,
  compact = false,
}) {
  return (
    <section className={cn(cardClass, 'overflow-hidden', className)}>
      <div className="border-b border-slate-100 px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      </div>
      <div className={cn(compact ? 'p-4' : 'p-4 md:p-5')}>{children}</div>
    </section>
  )
}
