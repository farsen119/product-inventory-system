import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getProducts, getSubVariants } from '../../api/products'
import { bulkPurchaseStock, purchaseStock } from '../../api/stock'
import FormField from '../common/FormField'
import { btnPrimary, cn, formatStock, inputClass, selectClass } from '../../utils/ui'
import { showApiError, toastPromise } from '../../utils/toast'

export default function PurchaseForm({ onSuccess }) {
  const [products, setProducts] = useState([])
  const [subVariants, setSubVariants] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingSubVariants, setLoadingSubVariants] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      product_id: '',
      sub_variant_id: '',
      quantity: '',
      notes: '',
      apply_to_all: false,
    },
  })

  const productId = watch('product_id')
  const applyToAll = watch('apply_to_all')

  useEffect(() => {
    getProducts({ page_size: 100, active: 'true' })
      .then(({ data }) => setProducts(data.results || []))
      .catch((error) => showApiError(error, 'Failed to load products.'))
      .finally(() => setLoadingProducts(false))
  }, [])

  useEffect(() => {
    if (!productId) {
      setSubVariants([])
      return
    }

    setLoadingSubVariants(true)
    getSubVariants(productId, { page_size: 100 })
      .then(({ data }) => setSubVariants(Array.isArray(data) ? data : data.results || []))
      .catch((error) => {
        showApiError(error, 'Failed to load sub-variants.')
        setSubVariants([])
      })
      .finally(() => setLoadingSubVariants(false))
  }, [productId])

  useEffect(() => {
    if (applyToAll) {
      setValue('sub_variant_id', '')
    }
  }, [applyToAll, setValue])

  const activeSubVariants = useMemo(
    () => subVariants.filter((item) => item.active !== false),
    [subVariants],
  )

  const onSubmit = async (values) => {
    const quantity = Number(values.quantity)
    const notes = values.notes?.trim() || ''

    try {
      if (values.apply_to_all) {
        await toastPromise(
          bulkPurchaseStock({
            product_id: values.product_id,
            quantity,
            notes,
          }),
          {
            pending: 'Recording bulk purchase...',
            success: `Added ${formatStock(quantity)} units to each sub-variant.`,
            error: 'Bulk purchase failed.',
          },
        )
        reset({
          product_id: '',
          sub_variant_id: '',
          quantity: '',
          notes: '',
          apply_to_all: false,
        })
        setSubVariants([])
        onSuccess?.()
        return
      }

      await toastPromise(
        purchaseStock({
          sub_variant_id: values.sub_variant_id,
          quantity,
          notes,
        }),
        {
          pending: 'Recording purchase...',
          success: 'Stock purchased successfully!',
          error: 'Purchase failed.',
        },
      )
      reset({
        product_id: '',
        sub_variant_id: '',
        quantity: '',
        notes: '',
        apply_to_all: false,
      })
      setSubVariants([])
      onSuccess?.()
    } catch (error) {
      showApiError(error, values.apply_to_all ? 'Bulk purchase failed.' : 'Purchase failed.')
    }
  }

  const productOptions = useMemo(
    () =>
      products.map((product) => (
        <option key={product.id} value={product.id}>
          {product.ProductName} ({product.ProductCode})
        </option>
      )),
    [products],
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Purchase Stock</h3>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Product" name="product_id" error={errors.product_id} required>
          {(fieldError, errorId) => (
            <select
              className={selectClass(fieldError)}
              aria-describedby={errorId}
              disabled={loadingProducts}
              {...register('product_id', { required: 'Select a product.' })}
            >
              <option value="">Select product...</option>
              {productOptions}
            </select>
          )}
        </FormField>

        {!applyToAll && (
          <FormField
            label="Sub-variant"
            name="sub_variant_id"
            error={errors.sub_variant_id}
            required={!applyToAll}
          >
            {(fieldError, errorId) => (
              <select
                className={selectClass(fieldError)}
                aria-describedby={errorId}
                disabled={!productId || loadingSubVariants}
                {...register('sub_variant_id', {
                  required: applyToAll ? false : 'Select a sub-variant.',
                })}
              >
                <option value="">
                  {loadingSubVariants ? 'Loading...' : 'Select sub-variant...'}
                </option>
                {activeSubVariants.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (stock: {formatStock(item.stock)})
                  </option>
                ))}
              </select>
            )}
          </FormField>
        )}

        <FormField
          label={applyToAll ? 'Quantity per sub-variant' : 'Quantity'}
          name="quantity"
          error={errors.quantity}
          required
        >
          {(fieldError, errorId) => (
            <input
              type="number"
              min="1"
              step="1"
              className={inputClass(fieldError)}
              aria-describedby={errorId}
              {...register('quantity', {
                required: 'Quantity is required.',
                min: { value: 1, message: 'Quantity must be at least 1.' },
              })}
            />
          )}
        </FormField>

        <FormField label="Notes" name="notes" error={errors.notes} hint="Optional">
          {(fieldError, errorId) => (
            <input
              type="text"
              className={inputClass(fieldError)}
              aria-describedby={errorId}
              placeholder="Supplier reference, invoice number, etc."
              {...register('notes')}
            />
          )}
        </FormField>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500/20"
            disabled={!productId || loadingSubVariants}
            {...register('apply_to_all')}
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">
              Apply same quantity to all sub-variants
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              {productId && !loadingSubVariants
                ? `Updates all ${activeSubVariants.length} active color/size combinations at once.`
                : 'Select a product first.'}
            </span>
          </span>
        </label>

        {applyToAll && productId && activeSubVariants.length > 0 && (
          <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Will update {activeSubVariants.length} sub-variants
            </p>
            <ul className="space-y-1 text-xs text-slate-600">
              {activeSubVariants.map((item) => (
                <li key={item.id} className="truncate">
                  {item.name} — current stock: {formatStock(item.stock)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        type="submit"
        className={cn(btnPrimary, 'mt-4')}
        disabled={isSubmitting || (applyToAll && activeSubVariants.length === 0)}
      >
        {isSubmitting
          ? 'Saving...'
          : applyToAll
            ? `Record Bulk Purchase (${activeSubVariants.length} variants)`
            : 'Record Purchase'}
      </button>
    </form>
  )
}
