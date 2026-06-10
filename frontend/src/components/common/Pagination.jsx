import { btnSecondary, cn } from '../../utils/ui'

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  totalCount,
}) {
  if (totalPages <= 1 && !onPageSizeChange) {
    return null
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
        {totalCount != null && <span>{totalCount} total items</span>}
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            Per page
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/10"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(btnSecondary, 'px-3 py-1.5 text-sm')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="px-2 text-sm text-slate-500">
          Page {page} of {totalPages || 1}
        </span>
        <button
          type="button"
          className={cn(btnSecondary, 'px-3 py-1.5 text-sm')}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
