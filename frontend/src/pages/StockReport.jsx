import { useEffect, useState } from 'react'
import PageHeader from '../components/common/PageHeader'
import Pagination from '../components/common/Pagination'
import StockReportTable, { stockReportColumns } from '../components/stock/StockReportTable'
import TransactionChart from '../components/stock/TransactionChart'
import { getProducts } from '../api/products'
import { useStockReport } from '../hooks/useStock'
import {
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  inputClass,
  labelClass,
  selectClass,
} from '../utils/ui'
import { exportToCsv } from '../utils/csvExport'
import { showApiError, showSuccess, showWarning } from '../utils/toast'

export default function StockReport() {
  const { report, loading, error, params, pagination, setParams } = useStockReport()
  const [products, setProducts] = useState([])

  useEffect(() => {
    getProducts({ page_size: 100 })
      .then(({ data }) => setProducts(data.results || []))
      .catch((err) => showApiError(err, 'Failed to load products for filter.'))
  }, [])

  const handleExport = () => {
    if (!report.length) {
      showWarning('No data to export. Adjust filters or add transactions first.')
      return
    }

    const exportColumns = stockReportColumns.map(({ key, label }) => ({ key, label }))
    const exported = exportToCsv(
      `stock-report-${new Date().toISOString().slice(0, 10)}.csv`,
      report.map((row) => ({
        ...row,
        created_at: new Date(row.created_at).toLocaleString(),
      })),
      exportColumns,
    )

    if (exported) {
      showSuccess('Report exported to CSV.')
    }
  }

  return (
    <div>
      <PageHeader
        title="Stock Report"
        description="Full transaction history for admin users."
        action={
          <button type="button" className={btnSecondary} onClick={handleExport}>
            Export CSV
          </button>
        }
      />

      <section className={cn(cardClass, 'mb-6')}>
        <div className={cardBodyClass}>
          <TransactionChart filterParams={params} />
        </div>
      </section>

      <section className={cardClass}>
        <div className={cardBodyClass}>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Start date</label>
              <input
                type="date"
                className={inputClass()}
                value={params.start_date}
                onChange={(event) =>
                  setParams((current) => ({ ...current, start_date: event.target.value, page: 1 }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>End date</label>
              <input
                type="date"
                className={inputClass()}
                value={params.end_date}
                onChange={(event) =>
                  setParams((current) => ({ ...current, end_date: event.target.value, page: 1 }))
                }
              />
            </div>
            <div>
              <label className={labelClass}>Product</label>
              <select
                className={selectClass()}
                value={params.product_id}
                onChange={(event) =>
                  setParams((current) => ({
                    ...current,
                    product_id: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.ProductName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Transaction type</label>
              <select
                className={selectClass()}
                value={params.transaction_type}
                onChange={(event) =>
                  setParams((current) => ({
                    ...current,
                    transaction_type: event.target.value,
                    page: 1,
                  }))
                }
              >
                <option value="">All Types</option>
                <option value="PURCHASE">Purchase</option>
                <option value="SALE">Sale</option>
              </select>
            </div>
          </div>

          <StockReportTable report={report} loading={loading} error={error} />

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
