import { useState } from 'react'
import { useFieldArray } from 'react-hook-form'
import FormField from '../common/FormField'
import { showSuccess } from '../../utils/toast'
import {
  alertError,
  badgeInfo,
  badgeNeutral,
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  inputClass,
} from '../../utils/ui'

function parseOptionsText(text) {
  return String(text || '')
    .split(',')
    .map((option) => option.trim())
    .filter(Boolean)
}

export default function VariantBuilder({ control, errors }) {
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'variants',
  })

  const [draftName, setDraftName] = useState('')
  const [draftOptions, setDraftOptions] = useState('')
  const [draftErrors, setDraftErrors] = useState({})
  const [editingIndex, setEditingIndex] = useState(null)

  const resetDraft = () => {
    setDraftName('')
    setDraftOptions('')
    setDraftErrors({})
    setEditingIndex(null)
  }

  const validateDraft = (savedVariants, excludeIndex = null) => {
    const nextErrors = {}
    const name = draftName.trim()
    const options = parseOptionsText(draftOptions)

    if (!name) {
      nextErrors.name = 'Variant name is required.'
    }

    if (!options.length) {
      nextErrors.optionsText = 'Enter at least one comma-separated option.'
    }

    const duplicateIndex = savedVariants.findIndex(
      (variant, index) =>
        index !== excludeIndex && variant.name?.trim().toLowerCase() === name.toLowerCase(),
    )
    if (name && duplicateIndex >= 0) {
      nextErrors.name = `Variant "${name}" already saved.`
    }

    setDraftErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSaveVariant = () => {
    const savedVariants = fields.map((field) => field)

    if (!validateDraft(savedVariants, editingIndex)) {
      return
    }

    const payload = {
      name: draftName.trim(),
      optionsText: draftOptions.trim(),
    }

    if (editingIndex !== null) {
      update(editingIndex, payload)
      showSuccess(`Variant "${payload.name}" updated.`)
    } else {
      append(payload)
      showSuccess(`Variant "${payload.name}" saved. Add another or create the product.`)
    }

    resetDraft()
  }

  const handleEditVariant = (index) => {
    const variant = fields[index]
    setDraftName(variant.name || '')
    setDraftOptions(variant.optionsText || '')
    setDraftErrors({})
    setEditingIndex(index)
  }

  const handleRemoveVariant = (index) => {
    remove(index)
    if (editingIndex === index) {
      resetDraft()
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Variants</h3>
          <p className="mt-1 text-sm text-slate-500">
            Fill in each variant and click <strong className="font-medium text-slate-700">Save Variant</strong> before adding the next one.
          </p>
        </div>
        <span className={badgeInfo}>{fields.length} saved</span>
      </div>

      {errors.variants?.message && (
        <div className={cn(alertError, 'mb-4')}>{errors.variants.message}</div>
      )}

      {typeof errors.variants === 'string' && (
        <div className={cn(alertError, 'mb-4')}>{errors.variants}</div>
      )}

      {fields.length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={cn(
                cardClass,
                editingIndex === index && 'border-slate-400 ring-1 ring-slate-300',
              )}
            >
              <div className={cn(cardBodyClass, 'py-4')}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={cn(badgeInfo, 'mb-2')}>Variant {index + 1}</span>
                    <p className="font-semibold text-slate-900">{field.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parseOptionsText(field.optionsText).map((option) => (
                        <span key={option} className={badgeNeutral}>
                          {option}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={cn(btnSecondary, 'px-3 py-1.5 text-xs')}
                      onClick={() => handleEditVariant(index)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={cn(btnDanger, 'px-3 py-1.5 text-xs')}
                      onClick={() => handleRemoveVariant(index)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={cn(cardClass, 'bg-slate-50/60')}>
        <div className={cardBodyClass}>
          <h4 className="mb-4 text-sm font-semibold text-slate-900">
            {editingIndex !== null ? `Edit Variant ${editingIndex + 1}` : 'Add Variant'}
          </h4>
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <FormField
                label="Variant name"
                name="draft_variant_name"
                error={draftErrors.name ? { message: draftErrors.name } : null}
                required
              >
                {() => (
                  <input
                    type="text"
                    placeholder="e.g. Size"
                    className={inputClass(Boolean(draftErrors.name))}
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                )}
              </FormField>
            </div>
            <div className="md:col-span-8">
              <FormField
                label="Options"
                name="draft_variant_options"
                error={draftErrors.optionsText ? { message: draftErrors.optionsText } : null}
                hint="Comma-separated values, e.g. S, M, L"
                required
              >
                {() => (
                  <input
                    type="text"
                    placeholder="S, M, L"
                    className={inputClass(Boolean(draftErrors.optionsText))}
                    value={draftOptions}
                    onChange={(event) => setDraftOptions(event.target.value)}
                  />
                )}
              </FormField>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={cn(btnPrimary, 'bg-emerald-700 hover:bg-emerald-600')} onClick={handleSaveVariant}>
              {editingIndex !== null ? 'Update Variant' : 'Save Variant'}
            </button>
            {editingIndex !== null && (
              <button type="button" className={btnSecondary} onClick={resetDraft}>
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
