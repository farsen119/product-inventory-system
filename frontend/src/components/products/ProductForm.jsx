import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { createProduct } from '../../api/products'
import FormField from '../common/FormField'
import CategorySelect from './CategorySelect'
import SubVariantPreview from './SubVariantPreview'
import VariantBuilder from './VariantBuilder'
import { useCategories } from '../../hooks/useCategories'
import { applyCategoryIdToPayload } from '../../utils/categories'
import { getSelectedFile } from '../../utils/files'
import {
  btnPrimary,
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  inputClass,
} from '../../utils/ui'
import { validateVariants } from '../../utils/validation'
import { showApiError, showError, toastPromise } from '../../utils/toast'

function parseVariants(variants = []) {
  return variants.map((variant) => ({
    name: variant.name.trim(),
    options: variant.optionsText
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean),
  }))
}

export default function ProductForm() {
  const navigate = useNavigate()
  const { categories, loading: categoriesLoading } = useCategories()
  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      ProductName: '',
      ProductCode: '',
      HSNCode: '',
      category_id: '',
      ProductImage: null,
      variants: [],
    },
  })

  const productName = watch('ProductName')
  const variants = watch('variants')
  const imageField = watch('ProductImage')
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFileName, setImageFileName] = useState('')

  useEffect(() => {
    const file = getSelectedFile(imageField)
    if (!file) {
      setImagePreview(null)
      setImageFileName('')
      return undefined
    }

    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    setImageFileName(file.name)
    return () => URL.revokeObjectURL(previewUrl)
  }, [imageField])

  const clearImage = () => {
    setValue('ProductImage', null)
    setImagePreview(null)
    setImageFileName('')
  }

  const onSubmit = async (values) => {
    if (!values.variants?.length) {
      setError('variants', {
        type: 'manual',
        message: 'Save at least one variant before creating the product.',
      })
      showError('Save at least one variant before creating the product.')
      return
    }

    const parsedVariants = parseVariants(values.variants)
    const variantErrors = validateVariants(parsedVariants)
    if (Object.keys(variantErrors).length) {
      const message = variantErrors.variants || 'Please fix variant errors before submitting.'
      setError('variants', { type: 'manual', message })
      showError(message)
      return
    }
    const imageFile = getSelectedFile(values.ProductImage)

    let requestData
    if (imageFile) {
      requestData = new FormData()
      requestData.append('ProductName', values.ProductName.trim())
      requestData.append('ProductCode', values.ProductCode.trim())
      if (values.HSNCode?.trim()) {
        requestData.append('HSNCode', values.HSNCode.trim())
      }
      requestData.append('ProductImage', imageFile)
      requestData.append('variants', JSON.stringify(parsedVariants))
      applyCategoryIdToPayload(requestData, values.category_id, true)
    } else {
      requestData = {
        ProductName: values.ProductName.trim(),
        ProductCode: values.ProductCode.trim(),
        variants: parsedVariants,
        ...(values.HSNCode?.trim() ? { HSNCode: values.HSNCode.trim() } : {}),
      }
      applyCategoryIdToPayload(requestData, values.category_id)
    }

    try {
      await toastPromise(createProduct(requestData), {
        pending: 'Creating product...',
        success: 'Product created! Sub-variants generated automatically.',
        error: 'Failed to create product.',
      })
      navigate('/products')
    } catch (error) {
      showApiError(error, 'Failed to create product.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <section className={cn(cardClass, 'mb-6')}>
        <div className={cardBodyClass}>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Product details</h2>
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
            <FormField label="Product image" name="ProductImage" error={errors.ProductImage} hint="Optional — JPG, PNG, or WebP">
              {(fieldError, errorId) => (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    className={inputClass(fieldError)}
                    aria-describedby={errorId}
                    {...register('ProductImage')}
                  />
                  {imagePreview && (
                    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Preview
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-800">{imageFileName}</p>
                        <button
                          type="button"
                          className={cn(btnSecondary, 'mt-3 px-3 py-1.5 text-xs')}
                          onClick={clearImage}
                        >
                          Remove image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FormField>
          </div>
        </div>
      </section>

      <section className={cn(cardClass, 'mb-6')}>
        <div className={cardBodyClass}>
          <VariantBuilder control={control} errors={errors} />
        </div>
      </section>

      <section className={cn(cardClass, 'mb-6')}>
        <div className={cardBodyClass}>
          <SubVariantPreview productName={productName} variants={variants} />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Product'}
        </button>
        <button type="button" className={btnSecondary} onClick={() => navigate('/products')} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}
