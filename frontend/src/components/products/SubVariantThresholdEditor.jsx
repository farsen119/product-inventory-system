import { useEffect, useState } from 'react'
import { patchSubVariant } from '../../api/subvariants'
import { btnSecondary, cn, formatStock, inputClass } from '../../utils/ui'
import { showApiError, showSuccess } from '../../utils/toast'

export default function SubVariantThresholdEditor({
  subVariant,
  disabled = false,
  onUpdated,
  compact = false,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  const threshold = subVariant?.low_stock_threshold ?? 5

  useEffect(() => {
    setDraft(String(threshold))
  }, [threshold, subVariant?.id])

  const handleSave = async () => {
    const value = Number(draft)
    if (Number.isNaN(value) || value < 0) {
      showApiError({ response: { data: { detail: 'Threshold must be zero or greater.' } } })
      return
    }

    setSaving(true)
    try {
      const { data } = await patchSubVariant(subVariant.id, {
        low_stock_threshold: String(value),
      })
      onUpdated?.(data)
      setEditing(false)
      showSuccess('Low stock threshold updated.')
    } catch (error) {
      showApiError(error, 'Failed to update threshold.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setDraft(String(threshold))
    setEditing(false)
  }

  if (disabled || subVariant?.active === false) {
    return <span className="text-slate-500">{formatStock(threshold)}</span>
  }

  if (!editing) {
    return (
      <div className={cn('inline-flex items-center gap-2', compact && 'gap-1')}>
        <span className="text-slate-700">{formatStock(threshold)}</span>
        <button
          type="button"
          className={cn(btnSecondary, 'px-2 py-1 text-[11px]')}
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min="0"
        step="1"
        className={cn(inputClass(), compact ? 'w-20 py-1.5 text-xs' : 'w-24')}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            handleSave()
          }
          if (event.key === 'Escape') {
            handleCancel()
          }
        }}
        disabled={saving}
        aria-label="Low stock threshold"
      />
      <button
        type="button"
        className={cn(btnSecondary, 'px-2 py-1 text-[11px]')}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button
        type="button"
        className={cn(btnSecondary, 'px-2 py-1 text-[11px]')}
        onClick={handleCancel}
        disabled={saving}
      >
        Cancel
      </button>
    </div>
  )
}
