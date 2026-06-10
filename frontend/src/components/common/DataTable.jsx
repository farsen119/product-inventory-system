import EmptyState from './EmptyState'
import LoadingSpinner from './LoadingSpinner'

export default function DataTable({
  columns,
  rows,
  loading = false,
  emptyTitle = 'No records found',
  emptyMessage,
  rowKey = 'id',
}) {
  if (loading) {
    return <LoadingSpinner label="Loading data..." />
  }

  if (!rows?.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row[rowKey]} className="hover:bg-slate-50/80 transition-colors">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
