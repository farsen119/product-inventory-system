import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DashboardChartCard from '../components/dashboard/DashboardChartCard'
import LowStockAlerts from '../components/dashboard/LowStockAlerts'
import RecentTransactionsTable from '../components/dashboard/RecentTransactionsTable'
import StatCard from '../components/dashboard/StatCard'
import StockMovementsLineChart from '../components/dashboard/StockMovementsLineChart'
import TopProductsChart from '../components/dashboard/TopProductsChart'
import { useAuth } from '../context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import {
  alertError,
  btnSecondary,
  cardClass,
  cn,
  formatStock,
  navLinkClass,
} from '../utils/ui'
import { showSuccess } from '../utils/toast'

const PERIOD_OPTIONS = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
]

const heroBtnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100'

const heroBtnOutline =
  'inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, loading, error, params, setParams, refresh } = useDashboard()

  const handleRefresh = async () => {
    await refresh()
    showSuccess('Dashboard refreshed.')
  }

  const handlePeriodChange = (days) => {
    setParams((current) => ({ ...current, days }))
  }

  if (loading && !data) {
    return <LoadingSpinner label="Loading dashboard..." />
  }

  const recentCount = data?.recent_transactions?.length ?? 0
  const movementsDays = data?.movements_days ?? params.days
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-5">
      {/* Welcome header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-white md:px-7 md:py-6">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-slate-400">{today}</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight md:text-2xl">
              {getGreeting()}, {user?.username || 'there'}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Here&apos;s your inventory overview.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/stock" className={cn(navLinkClass, heroBtnPrimary)}>
              Manage Stock
            </Link>
            <Link to="/products/create" className={cn(navLinkClass, heroBtnOutline)}>
              Add Product
            </Link>
            <button
              type="button"
              className={heroBtnOutline}
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className={cn(alertError, 'flex items-center justify-between gap-3')}>
          <span>{error}</span>
          <button type="button" className={btnSecondary} onClick={refresh}>
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total Products"
          value={data?.total_products ?? 0}
          subtitle="Active in catalog"
          icon="products"
          accent="slate"
        />
        <StatCard
          label="Total Stock Units"
          value={formatStock(data?.total_stock_units)}
          subtitle="Across all sub-variants"
          icon="stock"
          accent="emerald"
        />
        <StatCard
          label="Total Sales"
          value={formatStock(data?.total_sales_units)}
          subtitle={`${data?.sales_count ?? 0} sales · last ${movementsDays} days`}
          icon="sales"
          accent="rose"
        />
        <StatCard
          label="Recent Transactions"
          value={recentCount}
          subtitle={`Last ${params.recent_limit} activities`}
          icon="activity"
          accent="violet"
        />
        <StatCard
          label="Low Stock Alerts"
          value={data?.low_stock_count ?? 0}
          subtitle="Sub-variants at or below threshold"
          icon="alert"
          accent="amber"
        />
      </div>

      {/* Charts — side by side from lg, compact height */}
      <div className="grid gap-4 lg:grid-cols-5">
        <DashboardChartCard
          className="lg:col-span-3"
          compact
          title="Stock Movements"
          description={`Last ${movementsDays} days`}
          action={
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-semibold transition',
                    params.days === option.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                  onClick={() => handlePeriodChange(option.value)}
                  disabled={loading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          }
        >
          {loading && data ? (
            <LoadingSpinner label="Updating..." />
          ) : (
            <StockMovementsLineChart
              movements={data?.stock_movements ?? []}
              days={movementsDays}
            />
          )}
        </DashboardChartCard>

        <DashboardChartCard
          className="lg:col-span-2"
          compact
          title="Top Products"
          description="Share of total inventory"
        >
          {loading && data ? (
            <LoadingSpinner label="Updating..." />
          ) : (
            <TopProductsChart
              products={data?.top_products_by_stock ?? []}
              totalStockUnits={data?.total_stock_units}
            />
          )}
        </DashboardChartCard>
      </div>

      {/* Low stock alerts */}
      <section className={cardClass}>
        <div className="border-b border-slate-100 px-4 py-3 md:px-5">
          <h2 className="text-sm font-semibold text-slate-900">Low Stock Alerts</h2>
          <p className="text-xs text-slate-500">Sub-variants that need restocking</p>
        </div>
        <div className="p-4 md:p-5">
          <LowStockAlerts
            alerts={data?.low_stock_alerts ?? []}
            totalCount={data?.low_stock_count ?? 0}
          />
        </div>
      </section>

      {/* Recent activity */}
      <section className={cardClass}>
        <div className="border-b border-slate-100 px-4 py-3 md:px-5">
          <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          <p className="text-xs text-slate-500">Latest purchase and sale transactions</p>
        </div>
        <div className="p-4 md:p-5">
          <RecentTransactionsTable
            transactions={data?.recent_transactions ?? []}
            loading={loading && !data}
            error={error && !data ? error : ''}
          />
        </div>
      </section>
    </div>
  )
}
