import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import { formatStock } from '../../utils/ui'
import '../../utils/chartSetup'

function formatDateLabel(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function hasMovementData(movements = []) {
  return movements.some(
    (row) => Number(row.purchase || 0) > 0 || Number(row.sale || 0) > 0,
  )
}

export function getMovementTotals(movements = []) {
  return movements.reduce(
    (acc, row) => ({
      purchase: acc.purchase + Number(row.purchase || 0),
      sale: acc.sale + Number(row.sale || 0),
    }),
    { purchase: 0, sale: 0 },
  )
}

export default function StockMovementsLineChart({ movements = [], days = 30 }) {
  const totals = useMemo(() => getMovementTotals(movements), [movements])
  const hasData = movements.length > 0 && hasMovementData(movements)

  const chartData = useMemo(
    () => ({
      labels: movements.map((row) => formatDateLabel(row.date)),
      datasets: [
        {
          label: 'Purchase',
          data: movements.map((row) => Number(row.purchase || 0)),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: 'Sale',
          data: movements.map((row) => Number(row.sale || 0)),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
      ],
    }),
    [movements],
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 8,
            padding: 12,
            color: '#64748b',
            font: { size: 11, weight: '500' },
          },
        },
        tooltip: {
          backgroundColor: '#0f172a',
          padding: 10,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          border: { display: false },
          ticks: {
            maxTicksLimit: days > 60 ? 7 : 10,
            maxRotation: 0,
            color: '#94a3b8',
            font: { size: 10 },
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          ticks: { precision: 0, color: '#94a3b8', font: { size: 10 } },
          grid: { color: 'rgba(148, 163, 184, 0.12)' },
        },
      },
    }),
    [days],
  )

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
        <svg className="mb-2 h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        <p className="text-sm font-medium text-slate-600">No movement data yet</p>
        <p className="mt-1 text-xs text-slate-400">Record purchases or sales to see the chart</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:max-w-xs">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2">
          <p className="text-[11px] font-medium text-emerald-600">Purchased</p>
          <p className="text-lg font-bold text-emerald-700">{formatStock(totals.purchase)}</p>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
          <p className="text-[11px] font-medium text-indigo-600">Sold</p>
          <p className="text-lg font-bold text-indigo-700">{formatStock(totals.sale)}</p>
        </div>
      </div>

      <div className="h-[320px] w-full sm:h-[380px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
