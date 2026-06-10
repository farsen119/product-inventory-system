import { Link } from 'react-router-dom'
import DataTable from '../common/DataTable'
import { useAuth } from '../../context/AuthContext'
import {
  alertError,
  badgeDanger,
  badgeSuccess,
  btnSecondary,
  cn,
  formatStock,
} from '../../utils/ui'

const columns = [
  {
    key: 'created_at',
    label: 'Date & Time',
    render: (row) => (
      <span className="text-slate-600">{new Date(row.created_at).toLocaleString()}</span>
    ),
  },
  {
    key: 'product_name',
    label: 'Product',
    render: (row) => <span className="font-medium text-slate-900">{row.product_name}</span>,
  },
  { key: 'sub_variant_name', label: 'Sub-Variant' },
  {
    key: 'transaction_type',
    label: 'Type',
    render: (row) => (
      <span className={row.transaction_type === 'PURCHASE' ? badgeSuccess : badgeDanger}>
        {row.transaction_type === 'PURCHASE' ? 'Purchase' : 'Sale'}
      </span>
    ),
  },
  {
    key: 'quantity',
    label: 'Qty',
    render: (row) => <span className="font-medium">{formatStock(row.quantity)}</span>,
  },
  {
    key: 'running_balance',
    label: 'Balance',
    render: (row) =>
      row.running_balance != null ? formatStock(row.running_balance) : '—',
  },
]

export default function RecentTransactionsTable({ transactions = [], loading, error }) {
  const { isAdmin } = useAuth()

  return (
    <>
      {error && <div className={cn(alertError, 'mb-4')}>{error}</div>}

      <DataTable
        columns={columns}
        rows={transactions}
        loading={loading}
        emptyTitle="No transactions yet"
        emptyMessage="Record a purchase or sale from Stock Management to see activity here."
      />

      {isAdmin && transactions.length > 0 && (
        <div className="mt-4 flex justify-end">
          <Link to="/stock/report" className={cn(btnSecondary, 'px-3 py-1.5 text-xs')}>
            View full report →
          </Link>
        </div>
      )}
    </>
  )
}
