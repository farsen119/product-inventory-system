export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <div
        className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700"
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm">{label}</p>
    </div>
  )
}
