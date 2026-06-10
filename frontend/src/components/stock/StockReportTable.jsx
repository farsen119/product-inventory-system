import DataTable from '../common/DataTable'
import { alertError, badgeDanger, badgeSuccess, cn, formatStock } from '../../utils/ui'

const columns = [
  {
    key: 'created_at',
    label: 'Date & Time',
    render: (row) => new Date(row.created_at).toLocaleString(),
  },
  { key: 'product_name', label: 'Product' },
  { key: 'sub_variant_name', label: 'Sub-Variant' },
  {
    key: 'transaction_type',
    label: 'Type',
    render: (row) => (
      <span className={row.transaction_type === 'PURCHASE' ? badgeSuccess : badgeDanger}>
        {row.transaction_type}
      </span>
    ),
  },
  {
    key: 'quantity',
    label: 'Quantity',
    render: (row) => formatStock(row.quantity),
  },
  {
    key: 'running_balance',
    label: 'Running Balance',
    render: (row) => formatStock(row.running_balance),
  },
  {
    key: 'notes',
    label: 'Notes',
    render: (row) => row.notes || '—',
  },
]

export default function StockReportTable({ report, loading, error }) {
  return (
    <>
      {error && <div className={cn(alertError, 'mb-4')}>{error}</div>}
      <DataTable
        columns={columns}
        rows={report}
        loading={loading}
        emptyTitle="No transactions found"
        emptyMessage="Adjust filters or record stock movements to see report data."
      />
    </>
  )
}

export { columns as stockReportColumns }
