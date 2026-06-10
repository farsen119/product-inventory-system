import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteProduct, getProduct } from '../api/products'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import Pagination from '../components/common/Pagination'
import CategorySelect from '../components/products/CategorySelect'
import ProductDetailModal from '../components/products/ProductDetailModal'
import ProductTable from '../components/products/ProductTable'
import { useCategories } from '../hooks/useCategories'
import { useProducts } from '../hooks/useProducts'
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  inputClass,
  labelClass,
} from '../utils/ui'
import { showApiError, toastPromise } from '../utils/toast'

export default function ProductList() {
  const {
    products,
    loading,
    error,
    params,
    pagination,
    setPage,
    setPageSize,
    setSearch,
    setCategory,
    refresh,
  } = useProducts()
  const { categories, loading: categoriesLoading } = useCategories()

  const [viewProduct, setViewProduct] = useState(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleView = async (productId) => {
    setViewOpen(true)
    setViewLoading(true)
    setViewProduct(null)
    try {
      const { data } = await getProduct(productId)
      setViewProduct(data)
    } catch (err) {
      showApiError(err, 'Failed to load product details.')
      setViewOpen(false)
    } finally {
      setViewLoading(false)
    }
  }

  const closeView = () => {
    setViewOpen(false)
    setViewProduct(null)
    setViewLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await toastPromise(deleteProduct(deleteTarget.id), {
        pending: 'Deleting product...',
        success: `"${deleteTarget.ProductName}" deleted successfully.`,
        error: 'Failed to delete product.',
      })
      setDeleteTarget(null)
      refresh()
    } catch (err) {
      showApiError(err, 'Failed to delete product.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Browse and manage your product catalog."
        action={
          <Link to="/products/create" className={btnPrimary}>
            Create Product
          </Link>
        }
      />

      <section className={cardClass}>
        <div className={cardBodyClass}>
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="product-category-filter" className={labelClass}>
                Category
              </label>
              <CategorySelect
                id="product-category-filter"
                value={params.category}
                onChange={(event) => setCategory(event.target.value)}
                categories={categories}
                loading={categoriesLoading}
                allowAll
                allowUncategorized
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="product-search" className={labelClass}>
                Search
              </label>
              <input
                id="product-search"
                type="search"
                className={inputClass()}
                placeholder="Search by name or product code..."
                value={params.search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          <ProductTable
            products={products}
            loading={loading}
            error={error}
            onView={handleView}
            onDelete={setDeleteTarget}
          />

          <Pagination
            page={params.page}
            pageSize={params.page_size}
            totalPages={pagination.totalPages}
            totalCount={pagination.count}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </section>

      <Modal
        open={viewOpen}
        size="xl"
        title={viewProduct?.ProductName || 'Product Details'}
        onClose={closeView}
        footer={
          viewProduct && (
            <Link to={`/products/${viewProduct.id}/edit`} className={btnPrimary} onClick={closeView}>
              Edit Product
            </Link>
          )
        }
      >
        <ProductDetailModal
          product={viewProduct}
          loading={viewLoading}
          onProductChange={setViewProduct}
        />
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Product"
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
            <button type="button" className={btnDanger} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>{deleteTarget?.ProductName}</strong>? This will
          deactivate the product (soft delete).
        </p>
      </Modal>
    </div>
  )
}
