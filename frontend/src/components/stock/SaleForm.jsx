import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getProducts, getSubVariants } from '../../api/products'
import { saleStock } from '../../api/stock'
import FormField from '../common/FormField'
import { alertInfo, btnPrimary, formatStock, inputClass, selectClass } from '../../utils/ui'
import { showApiError, showError, toastPromise } from '../../utils/toast'

export default function SaleForm({ onSuccess }) {
  const [products, setProducts] = useState([])
  const [subVariants, setSubVariants] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadingSubVariants, setLoadingSubVariants] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      product_id: '',
      sub_variant_id: '',
      quantity: '',
      notes: '',
    },
  })

  const productId = watch('product_id')
  const subVariantId = watch('sub_variant_id')

  const selectedSubVariant = useMemo(
    () => subVariants.find((item) => item.id === subVariantId),
    [subVariants, subVariantId],
  )

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

  const onSubmit = async (values) => {
    const available = Number(selectedSubVariant?.stock || 0)
    const quantity = Number(values.quantity)

    if (quantity > available) {
      showError(`Insufficient stock. Available: ${available}`)
      return
    }

    try {
      await toastPromise(
        saleStock({
          sub_variant_id: values.sub_variant_id,
          quantity,
          notes: values.notes?.trim() || '',
        }),
        {
          pending: 'Recording sale...',
          success: 'Sale recorded successfully!',
          error: 'Sale failed.',
        },
      )
      reset({ product_id: '', sub_variant_id: '', quantity: '', notes: '' })
      setSubVariants([])
      onSuccess?.()
    } catch (error) {
      showApiError(error, 'Sale failed.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3 className="mb-4 text-base font-semibold text-slate-900">Sale Stock</h3>
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
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.ProductName} ({product.ProductCode})
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormField label="Sub-variant" name="sub_variant_id" error={errors.sub_variant_id} required>
          {(fieldError, errorId) => (
            <select
              className={selectClass(fieldError)}
              aria-describedby={errorId}
              disabled={!productId || loadingSubVariants}
              {...register('sub_variant_id', { required: 'Select a sub-variant.' })}
            >
              <option value="">
                {loadingSubVariants ? 'Loading...' : 'Select sub-variant...'}
              </option>
              {subVariants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (stock: {formatStock(item.stock)})
                </option>
              ))}
            </select>
          )}
        </FormField>
        {selectedSubVariant && (
          <div className="md:col-span-2">
            <div className={alertInfo}>
              Available stock: <strong className="text-slate-900">{formatStock(selectedSubVariant.stock)}</strong>
            </div>
          </div>
        )}
        <FormField label="Quantity" name="quantity" error={errors.quantity} required>
          {(fieldError, errorId) => (
            <input
              type="number"
              min="1"
              step="1"
              max={selectedSubVariant ? Number(selectedSubVariant.stock) : undefined}
              className={inputClass(fieldError)}
              aria-describedby={errorId}
              {...register('quantity', {
                required: 'Quantity is required.',
                min: { value: 1, message: 'Quantity must be at least 1.' },
                validate: (value) => {
                  if (!selectedSubVariant) {
                    return true
                  }
                  return (
                    Number(value) <= Number(selectedSubVariant.stock) ||
                    `Cannot sell more than ${selectedSubVariant.stock}.`
                  )
                },
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
              placeholder="Order ID, customer name, etc."
              {...register('notes')}
            />
          )}
        </FormField>
      </div>
      <button type="submit" className={`${btnPrimary} mt-4`} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Record Sale'}
      </button>
    </form>
  )
}
