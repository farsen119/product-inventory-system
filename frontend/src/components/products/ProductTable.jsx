import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import DataTable from '../common/DataTable'
import { getCategoryName } from '../../utils/categories'
import { getProductThumbnail } from '../../utils/images'
import {
  alertError,
  badgeNeutral,
  badgeSuccess,
  badgeWarning,
  formatStock,
  btnDanger,
  btnSecondary,
  cn,
} from '../../utils/ui'

export default function ProductTable({
  products,
  loading,
  error,
  onView,
  onDelete,
}) {
  const { isAdmin } = useAuth()

  const columns = [
    {
      key: 'ProductImage',
      label: 'Image',
      render: (row) => {
        const thumbnail = getProductThumbnail(row)
        return thumbnail ? (
          <img
            src={thumbnail}
            alt={row.ProductName}
            className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
          />
        ) : (
          <span className="text-xs text-slate-400">No image</span>
        )
      },
    },
    {
      key: 'ProductName',
      label: 'Product Name',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.ProductName}</span>
          {row.has_low_stock && (
            <span className={badgeWarning} title={`${row.low_stock_count} sub-variant(s) low on stock`}>
              {row.low_stock_count} low
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'ProductCode',
      label: 'Product Code',
      render: (row) => <span className="font-semibold text-slate-900">{row.ProductCode}</span>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => getCategoryName(row) || '—',
    },
    { key: 'HSNCode', label: 'HSN Code' },
    {
      key: 'TotalStock',
      label: 'Total Stock',
      render: (row) => (
        <span className="font-semibold text-slate-900">{formatStock(row.TotalStock)}</span>
      ),
    },
    {
      key: 'CreatedDate',
      label: 'Created Date',
      render: (row) => new Date(row.CreatedDate).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={row.status === 'Active' ? badgeSuccess : badgeNeutral}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={cn(btnSecondary, 'px-3 py-1.5 text-xs')} onClick={() => onView(row.id)}>
            View
          </button>
          <Link to={`/products/${row.id}/edit`} className={cn(btnSecondary, 'px-3 py-1.5 text-xs')}>
            Edit
          </Link>
          {isAdmin && (
            <button
              type="button"
              className={cn(btnDanger, 'px-3 py-1.5 text-xs')}
              onClick={() => onDelete(row)}
            >
              Delete
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      {error && <div className={cn(alertError, 'mb-4')}>{error}</div>}
      <DataTable
        columns={columns}
        rows={products}
        loading={loading}
        emptyTitle="No products found"
        emptyMessage="Create your first product or adjust search filters."
      />
    </>
  )
}
