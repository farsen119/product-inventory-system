import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { addVariant, deleteVariant, updateVariant } from '../../api/variants'
import FormField from '../common/FormField'
import Modal from '../common/Modal'
import SubVariantPreview from './SubVariantPreview'
import {
  alertInfo,
  badgeNeutral,
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  inputClass,
} from '../../utils/ui'
import { showApiError, toastPromise } from '../../utils/toast'

function optionsToText(options = []) {
  return options.map((option) => option.value).join(', ')
}

function parseOptionsText(text) {
  return String(text || '')
    .split(',')
    .map((option) => option.trim())
    .filter(Boolean)
}

export default function VariantManager({ productId, productName, variants = [], onChanged }) {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const addForm = useForm({
    defaultValues: { name: '', optionsText: '' },
  })

  const editForm = useForm({
    defaultValues: { name: '', optionsText: '' },
  })

  const watchAddName = addForm.watch('name')
  const watchAddOptions = addForm.watch('optionsText')
  const watchEditName = editForm.watch('name')
  const watchEditOptions = editForm.watch('optionsText')

  const startEdit = (variant) => {
    setEditingId(variant.id)
    editForm.reset({
      name: variant.name,
      optionsText: optionsToText(variant.options),
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    editForm.reset({ name: '', optionsText: '' })
  }

  const handleAddVariant = async (values) => {
    const payload = {
      name: values.name.trim(),
      options: parseOptionsText(values.optionsText),
    }

    if (!payload.options.length) {
      addForm.setError('optionsText', { message: 'Enter at least one option.' })
      return
    }

    try {
      await toastPromise(addVariant(productId, payload), {
        pending: 'Adding variant...',
        success: 'Variant added. Sub-variants regenerated.',
        error: 'Failed to add variant.',
      })
      addForm.reset({ name: '', optionsText: '' })
      onChanged?.()
    } catch (error) {
      showApiError(error, 'Failed to add variant.')
    }
  }

  const handleUpdateVariant = async (values) => {
    const payload = {
      name: values.name.trim(),
      options: parseOptionsText(values.optionsText),
    }

    if (!payload.options.length) {
      editForm.setError('optionsText', { message: 'Enter at least one option.' })
      return
    }

    try {
      await toastPromise(updateVariant(editingId, payload), {
        pending: 'Updating variant...',
        success: 'Variant updated. Sub-variants regenerated.',
        error: 'Failed to update variant.',
      })
      cancelEdit()
      onChanged?.()
    } catch (error) {
      showApiError(error, 'Failed to update variant.')
    }
  }

  const handleDeleteVariant = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await toastPromise(deleteVariant(deleteTarget.id), {
        pending: 'Deleting variant...',
        success: `"${deleteTarget.name}" removed. Sub-variants updated.`,
        error: 'Failed to delete variant.',
      })
      setDeleteTarget(null)
      if (editingId === deleteTarget.id) {
        cancelEdit()
      }
      onChanged?.()
    } catch (error) {
      showApiError(error, 'Failed to delete variant.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-base font-semibold text-slate-900">Manage Variants</h2>
      <p className="mb-5 text-sm text-slate-500">
        Adding options creates only new sub-variants. Removing options archives obsolete
        sub-variants (never deleted). Changes are blocked while affected stock is greater than zero.
      </p>

      <div className="mb-6 space-y-3">
        {variants.length === 0 ? (
          <div className={alertInfo}>No variants yet. Add one below.</div>
        ) : (
          variants.map((variant) => (
            <div key={variant.id} className={cn(cardClass, 'border-slate-200')}>
              <div className={cn(cardBodyClass, 'py-4')}>
                {editingId === variant.id ? (
                  <form onSubmit={editForm.handleSubmit(handleUpdateVariant)} noValidate>
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        label="Variant name"
                        name="edit_name"
                        error={editForm.formState.errors.name}
                        required
                      >
                        {(fieldError, errorId) => (
                          <input
                            type="text"
                            className={inputClass(fieldError)}
                            aria-describedby={errorId}
                            {...editForm.register('name', { required: 'Variant name is required.' })}
                          />
                        )}
                      </FormField>
                      <div className="md:col-span-2">
                        <FormField
                          label="Options"
                          name="edit_options"
                          error={editForm.formState.errors.optionsText}
                          hint="Comma-separated"
                          required
                        >
                          {(fieldError, errorId) => (
                            <input
                              type="text"
                              className={inputClass(fieldError)}
                              aria-describedby={errorId}
                              {...editForm.register('optionsText', {
                                required: 'At least one option is required.',
                              })}
                            />
                          )}
                        </FormField>
                      </div>
                    </div>
                    <div className="my-4">
                      <SubVariantPreview
                        productName={productName}
                        variants={[{ name: watchEditName, optionsText: watchEditOptions }]}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className={cn(btnPrimary, 'px-3 py-1.5 text-xs')}
                        disabled={editForm.formState.isSubmitting}
                      >
                        Save
                      </button>
                      <button type="button" className={cn(btnSecondary, 'px-3 py-1.5 text-xs')} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{variant.name}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(variant.options || []).map((option) => (
                          <span key={option.id} className={badgeNeutral}>
                            {option.value}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={cn(btnSecondary, 'px-3 py-1.5 text-xs')}
                        onClick={() => startEdit(variant)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={cn(btnDanger, 'px-3 py-1.5 text-xs')}
                        onClick={() => setDeleteTarget(variant)}
                        disabled={variants.length <= 1}
                        title={variants.length <= 1 ? 'Product must keep at least one variant' : ''}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <div className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Add New Variant</h3>
          <form onSubmit={addForm.handleSubmit(handleAddVariant)} noValidate>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="Variant name"
                name="add_name"
                error={addForm.formState.errors.name}
                required
              >
                {(fieldError, errorId) => (
                  <input
                    type="text"
                    placeholder="e.g. Material"
                    className={inputClass(fieldError)}
                    aria-describedby={errorId}
                    {...addForm.register('name', { required: 'Variant name is required.' })}
                  />
                )}
              </FormField>
              <div className="md:col-span-2">
                <FormField
                  label="Options"
                  name="add_options"
                  error={addForm.formState.errors.optionsText}
                  hint="Comma-separated, e.g. Cotton, Polyester"
                  required
                >
                  {(fieldError, errorId) => (
                    <input
                      type="text"
                      placeholder="Cotton, Polyester"
                      className={inputClass(fieldError)}
                      aria-describedby={errorId}
                      {...addForm.register('optionsText', {
                        required: 'At least one option is required.',
                      })}
                    />
                  )}
                </FormField>
              </div>
            </div>
            <div className="my-4">
              <SubVariantPreview
                productName={productName}
                variants={[{ name: watchAddName, optionsText: watchAddOptions }]}
              />
            </div>
            <button
              type="submit"
              className={cn(btnSecondary, 'px-3 py-1.5 text-xs')}
              disabled={addForm.formState.isSubmitting}
            >
              + Add Variant
            </button>
          </form>
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Variant"
        onClose={() => !deleting && setDeleteTarget(null)}
        footer={
          <>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button type="button" className={btnDanger} onClick={handleDeleteVariant} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <p>
          Delete variant <strong>{deleteTarget?.name}</strong>? Sub-variants will be regenerated.
          Variants with existing stock cannot be removed if it would orphan stock.
        </p>
      </Modal>
    </div>
  )
}
