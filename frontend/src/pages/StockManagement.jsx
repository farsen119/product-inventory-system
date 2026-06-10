import { useEffect, useMemo, useState } from 'react'
import { getProducts } from '../api/products'
import PageHeader from '../components/common/PageHeader'
import DataTable from '../components/common/DataTable'
import Pagination from '../components/common/Pagination'
import PurchaseForm from '../components/stock/PurchaseForm'
import SaleForm from '../components/stock/SaleForm'
import StockOverviewChart from '../components/stock/StockOverviewChart'
import StatCard from '../components/dashboard/StatCard'
import { useStockLevels } from '../hooks/useStock'
import {
  countLowStockItems,
  isLowStockSubVariant,
} from '../utils/stock'
import {
  alertError,
  badgeDanger,
  badgeNeutral,
  badgeWarning,
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  formatStock,
  labelClass,
  selectClass,
} from '../utils/ui'
import { showApiError, showSuccess } from '../utils/toast'

export default function StockManagement() {
  const { levels, loading, error, params, pagination, setParams, refresh } = useStockLevels()
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    getProducts({ page_size: 100, active: 'true' })
      .then(({ data }) => setProducts(data.results || []))
      .catch((err) => showApiError(err, 'Failed to load products for filter.'))
      .finally(() => setLoadingProducts(false))
  }, [])

  const stats = useMemo(() => {
    const totalUnits = levels.reduce((sum, row) => sum + Number(row.stock || 0), 0)
    const lowStock = countLowStockItems(levels)
    return { totalUnits, lowStock, skuCount: levels.length }
  }, [levels])

  const columns = [
    { key: 'product_name', label: 'Product' },
    { key: 'name', label: 'Sub-Variant' },
    { key: 'sku_code', label: 'SKU' },
    {
      key: 'stock',
      label: 'Stock',
      render: (row) => {
        const stock = Number(row.stock || 0)
        const lowStock = isLowStockSubVariant(row)
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className={lowStock ? badgeWarning : badgeNeutral}>
              {formatStock(stock)}
            </span>
            {lowStock && <span className={badgeDanger}>Low stock</span>}
          </span>
        )
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={row.active !== false ? badgeNeutral : badgeNeutral}>
          {row.status || (row.active !== false ? 'Active' : 'Archived')}
        </span>
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      render: (row) => new Date(row.updated_at).toLocaleString(),
    },
  ]

  const handleRefresh = async () => {
    await refresh()
    showSuccess('Stock levels refreshed.')
  }

  return (
    <div>
      <PageHeader
        title="Stock Management"
        description="Purchase, sell, and monitor inventory in real time."
        action={
          <button type="button" className={btnSecondary} onClick={handleRefresh}>
            Refresh
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total units (this page)" value={formatStock(stats.totalUnits)} />
        <StatCard label="Sub-variants tracked" value={stats.skuCount} />
        <StatCard label="Low stock alerts" value={stats.lowStock} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <div className={cardBodyClass}>
            <PurchaseForm onSuccess={refresh} />
          </div>
        </section>
        <section className={cardClass}>
          <div className={cardBodyClass}>
            <SaleForm onSuccess={refresh} />
          </div>
        </section>
      </div>

      <section className={cn(cardClass, 'mb-6')}>
        <div className={cardBodyClass}>
          <StockOverviewChart />
        </div>
      </section>

      <section className={cardClass}>
        <div className={cardBodyClass}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Current Stock Levels</h2>
              {stats.lowStock > 0 && (
                <span className={cn(badgeWarning, 'mt-2')}>{stats.lowStock} low stock on this page</span>
              )}
            </div>
            <div className="min-w-[200px]">
              <label htmlFor="stock-product-filter" className={labelClass}>
                Filter by product
              </label>
              <select
                id="stock-product-filter"
                className={selectClass}
                value={params.product_id}
                disabled={loadingProducts}
                onChange={(event) =>
                  setParams((current) => ({
                    ...current,
                    product_id: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">All products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.ProductName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className={cn(alertError, 'mb-4')}>{error}</div>}

          <DataTable
            columns={columns}
            rows={levels}
            loading={loading}
            emptyTitle="No stock data"
            emptyMessage="Create products and record purchases to see stock here."
          />

          <Pagination
            page={params.page}
            pageSize={params.page_size}
            totalPages={pagination.totalPages}
            totalCount={pagination.count}
            onPageChange={(page) => setParams((current) => ({ ...current, page }))}
            onPageSizeChange={(pageSize) =>
              setParams((current) => ({ ...current, page_size: pageSize, page: 1 }))
            }
          />
        </div>
      </section>
    </div>
  )
}
