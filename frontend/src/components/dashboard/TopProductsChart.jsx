import { useMemo } from 'react'
import { formatStock } from '../../utils/ui'

function formatPercent(value) {
  if (value >= 10) return `${Math.round(value)}%`
  if (value >= 1) return `${value.toFixed(1)}%`
  if (value > 0) return `${value.toFixed(2)}%`
  return '0%'
}

export default function TopProductsChart({ products = [], totalStockUnits }) {
  const { totalInventory, topStockSum } = useMemo(() => {
    const fromProducts = products.reduce((sum, row) => sum + Number(row.TotalStock || 0), 0)
    const total = Number(totalStockUnits) > 0 ? Number(totalStockUnits) : fromProducts
    return {
      totalInventory: total,
      topStockSum: fromProducts,
    }
  }, [products, totalStockUnits])

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
        <p className="text-sm font-medium text-slate-600">No products with stock</p>
        <p className="mt-1 text-xs text-slate-400">Add products and record purchases</p>
      </div>
    )
  }

  const topShareOfInventory = totalInventory > 0 ? (topStockSum / totalInventory) * 100 : 0

  return (
    <div>
      <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <span className="font-medium text-slate-800">{formatStock(totalInventory)}</span> total units
        in inventory · top {products.length} hold{' '}
        <span className="font-medium text-slate-800">{formatPercent(topShareOfInventory)}</span>
      </div>

      <div className="space-y-4">
        {products.map((product, index) => {
          const stock = Number(product.TotalStock || 0)
          const shareOfInventory = totalInventory > 0 ? (stock / totalInventory) * 100 : 0
          const barWidth = Math.max(shareOfInventory, stock > 0 ? 0.5 : 0)
          const name = product.ProductName || product.ProductCode || 'Unknown'

          return (
            <div key={product.id}>
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">
                      {formatPercent(shareOfInventory)} of total inventory
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-900">{formatStock(stock)}</p>
                  <p className="text-[11px] text-slate-400">units</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-slate-700 to-slate-500 transition-all duration-500"
                  style={{ width: `${Math.min(barWidth, 100)}%` }}
                  title={`${formatStock(stock)} units (${formatPercent(shareOfInventory)} of inventory)`}
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
        Bar length shows each product&apos;s share of your total stock — not compared to the top
        product only.
      </p>
    </div>
  )
}
