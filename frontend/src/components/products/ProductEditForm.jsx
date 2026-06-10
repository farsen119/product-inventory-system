import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { getProduct, updateProduct } from '../../api/products'
import FormField from '../common/FormField'
import LoadingSpinner from '../common/LoadingSpinner'
import CategorySelect from './CategorySelect'
import SubVariantThresholdEditor from './SubVariantThresholdEditor'
import VariantManager from './VariantManager'
import { useCategories } from '../../hooks/useCategories'
import { applyCategoryIdToPayload } from '../../utils/categories'
import { getSelectedFile } from '../../utils/files'
import { getProductMedium, hasProductImage } from '../../utils/images'
import { getSubVariantRowClass, isLowStockSubVariant } from '../../utils/stock'
import {
  alertError,
  badgeDanger,
  badgeNeutral,
  badgeSuccess,
  badgeWarning,
  btnPrimary,
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  formatStock,
  inputClass,
  navLinkClass,
} from '../../utils/ui'
import { showApiError, toastPromise } from '../../utils/toast'

export default function ProductEditForm({ productId }) {
  const navigate = useNavigate()
  const { categories, loading: categoriesLoading } = useCategories()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      ProductName: '',
      ProductCode: '',
      HSNCode: '',
      category_id: '',
      Active: true,
      ProductImage: null,
    },
  })

  const productName = watch('ProductName')

  const handleSubVariantUpdated = (updated) => {
    setProduct((current) => {
      if (!current) return current
      return {
        ...current,
        sub_variants: current.sub_variants.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      }
    })
  }

  const loadProduct = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const { data } = await getProduct(productId)
      setProduct(data)
      reset({
        ProductName: data.ProductName || '',
        ProductCode: data.ProductCode || '',
        HSNCode: data.HSNCode || '',
        category_id: data.category?.id || '',
        Active: Boolean(data.Active),
        ProductImage: null,
      })
    } catch (error) {
      setLoadError('Failed to load product.')
      showApiError(error, 'Failed to load product.')
    } finally {
      setLoading(false)
    }
  }, [productId, reset])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  const onSubmit = async (values) => {
    const imageFile = getSelectedFile(values.ProductImage)
    let requestData

    if (imageFile) {
      requestData = new FormData()
      requestData.append('ProductName', values.ProductName.trim())
      requestData.append('ProductCode', values.ProductCode.trim())
      requestData.append('HSNCode', values.HSNCode?.trim() || '')
      requestData.append('Active', values.Active ? 'true' : 'false')
      requestData.append('ProductImage', imageFile)
      applyCategoryIdToPayload(requestData, values.category_id, true)
    } else {
      requestData = {
        ProductName: values.ProductName.trim(),
        ProductCode: values.ProductCode.trim(),
        HSNCode: values.HSNCode?.trim() || '',
        Active: values.Active,
      }
      applyCategoryIdToPayload(requestData, values.category_id)
    }

    try {
      await toastPromise(updateProduct(productId, requestData), {
        pending: 'Saving product...',
        success: 'Product updated successfully!',
        error: 'Failed to update product.',
      })
      navigate('/products')
    } catch (error) {
      showApiError(error, 'Failed to update product.')
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading product..." />
  }

  if (loadError || !product) {
    return (
      <div className={cn(alertError, 'flex flex-wrap items-center justify-between gap-3')}>
        <span>{loadError || 'Product not found.'}</span>
        <Link to="/products" className={cn(navLinkClass, btnSecondary, 'px-3 py-1.5 text-sm')}>
          Back to products
        </Link>
      </div>
    )
  }

  const currentImageUrl = getProductMedium(product)
  const activeCount = product.sub_variants?.filter((item) => item.active !== false).length || 0
  const archivedCount = product.sub_variants?.filter((item) => item.active === false).length || 0

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <section className={cardClass}>
          <div className={cardBodyClass}>
            <h2 className="mb-5 text-base font-semibold text-slate-900">Product details</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Product name" name="ProductName" error={errors.ProductName} required>
                {(fieldError, errorId) => (
                  <input
                    type="text"
                    className={inputClass(fieldError)}
                    aria-describedby={errorId}
                    {...register('ProductName', { required: 'Product name is required.' })}
                  />
                )}
              </FormField>
              <FormField label="Product code" name="ProductCode" error={errors.ProductCode} required>
                {(fieldError, errorId) => (
                  <input
                    type="text"
                    className={inputClass(fieldError)}
                    aria-describedby={errorId}
                    {...register('ProductCode', { required: 'Product code is required.' })}
                  />
                )}
              </FormField>
              <FormField label="HSN code" name="HSNCode" error={errors.HSNCode} hint="Optional">
                {(fieldError, errorId) => (
                  <input
                    type="text"
                    className={inputClass(fieldError)}
                    aria-describedby={errorId}
                    {...register('HSNCode')}
                  />
                )}
              </FormField>
              <FormField label="Category" name="category_id" error={errors.category_id} hint="Optional">
                {(fieldError, errorId) => (
                  <CategorySelect
                    aria-describedby={errorId}
                    invalid={Boolean(fieldError)}
                    categories={categories}
                    loading={categoriesLoading}
                    {...register('category_id')}
                  />
                )}
              </FormField>
              <FormField
                label="Product image"
                name="ProductImage"
                error={errors.ProductImage}
                hint={hasProductImage(product) ? 'Upload to replace current image' : 'Optional'}
              >
                {(fieldError, errorId) => (
                  <input
                    type="file"
                    accept="image/*"
                    className={inputClass(fieldError)}
                    aria-describedby={errorId}
                    {...register('ProductImage')}
                  />
                )}
              </FormField>
              {currentImageUrl && (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Current image
                  </p>
                  <img
                    src={currentImageUrl}
                    alt={product.ProductName}
                    className="h-28 w-28 rounded-xl border border-slate-200 object-cover"
                  />
                </div>
              )}
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500/20"
                {...register('Active')}
              />
              <span className="text-sm text-slate-700">Product is active</span>
            </label>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              <button type="submit" className={btnPrimary} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Product Details'}
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => navigate('/products')}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      </form>

      <section className={cardClass}>
        <div className={cardBodyClass}>
          <VariantManager
            productId={productId}
            productName={productName || product.ProductName}
            variants={product.variants || []}
            onChanged={loadProduct}
          />
        </div>
      </section>

      <section className={cardClass}>
        <div className={cardBodyClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-900">
              Sub-Variants ({activeCount} active
              {archivedCount > 0 && ` · ${archivedCount} archived`})
            </h2>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Removing an option archives its sub-variants when stock is zero. If stock remains, the
            change is blocked until stock is cleared.
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Name', 'SKU', 'Status', 'Threshold', 'Stock'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(product.sub_variants || []).map((item) => {
                  const lowStock = isLowStockSubVariant(item)
                  return (
                    <tr key={item.id} className={getSubVariantRowClass(item)}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-3 text-slate-500">{item.sku_code || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={item.active ? badgeSuccess : badgeNeutral}>
                          {item.status || (item.active ? 'Active' : 'Archived')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <SubVariantThresholdEditor
                          subVariant={item}
                          compact
                          onUpdated={handleSubVariantUpdated}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={lowStock ? badgeWarning : badgeNeutral}>
                            {formatStock(item.stock)}
                          </span>
                          {lowStock && <span className={badgeDanger}>Low stock</span>}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
