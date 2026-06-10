export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export const inputBase =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2'

export function inputClass(invalid = false) {
  return cn(
    inputBase,
    invalid
      ? 'border-red-300 focus:border-red-400 focus:ring-red-500/15'
      : 'border-slate-200 focus:border-slate-400 focus:ring-slate-500/10',
  )
}

export const selectClass = inputClass

export const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

export const hintClass = 'mt-1 text-xs text-slate-500'

export const errorClass = 'mt-1 text-xs text-red-600'

export const cardClass = 'rounded-xl border border-slate-200 bg-white shadow-sm'

export const cardBodyClass = 'p-5 md:p-6'

export const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium no-underline transition focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed'

export const btnPrimary = cn(
  btnBase,
  'bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-500/30',
)

export const btnSecondary = cn(
  btnBase,
  'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-500/20',
)

export const btnDanger = cn(
  btnBase,
  'border border-red-200 bg-white text-red-600 hover:bg-red-50 focus:ring-red-500/20',
)

export const btnGhost = cn(
  btnBase,
  'text-slate-600 hover:bg-slate-100 focus:ring-slate-500/20',
)

export const btnSm = 'px-3 py-1.5 text-xs rounded-md'

export const badgeBase =
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset'

export const badgeSuccess = cn(badgeBase, 'bg-emerald-50 text-emerald-700 ring-emerald-600/20')

export const badgeDanger = cn(badgeBase, 'bg-red-50 text-red-700 ring-red-600/20')

export const badgeWarning = cn(badgeBase, 'bg-amber-50 text-amber-700 ring-amber-600/20')

export const badgeNeutral = cn(badgeBase, 'bg-slate-100 text-slate-600 ring-slate-500/20')

export const badgeInfo = cn(badgeBase, 'bg-slate-50 text-slate-700 ring-slate-500/20')

export const alertError =
  'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'

export function formatStock(value) {
  const num = Math.round(Number(value || 0))
  return num.toLocaleString()
}

export const alertInfo =
  'rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 text-center'

/* Nav links — override Bootstrap default underline + blue link color */
export const navLinkClass =
  'no-underline hover:no-underline focus:no-underline decoration-transparent'
