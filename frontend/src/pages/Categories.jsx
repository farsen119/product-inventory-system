import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../api/categories'
import DataTable from '../components/common/DataTable'
import FormField from '../components/common/FormField'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import Pagination from '../components/common/Pagination'
import { getApiErrorMessage } from '../utils/apiErrors'
import {
  alertError,
  btnDanger,
  btnPrimary,
  btnSecondary,
  cardBodyClass,
  cardClass,
  cn,
  inputClass,
} from '../utils/ui'
import { showApiError, toastPromise } from '../utils/toast'

const emptyForm = { name: '', description: '' }

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [pagination, setPagination] = useState({ count: 0, totalPages: 1 })
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: emptyForm })

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = { page, page_size: pageSize }
      if (search.trim()) {
        query.search = search.trim()
      }
      const { data } = await getCategories(query)
      setCategories(data.results || [])
      setPagination({
        count: data.count || 0,
        totalPages: Math.max(1, Math.ceil((data.count || 0) / pageSize)),
      })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load categories.'))
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const openCreate = () => {
    setEditingCategory(null)
    reset(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (category) => {
    setEditingCategory(category)
    reset({
      name: category.name || '',
      description: category.description || '',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    if (isSubmitting) return
    setFormOpen(false)
    setEditingCategory(null)
    reset(emptyForm)
  }

  const onSubmit = async (values) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || '',
    }

    try {
      if (editingCategory) {
        await toastPromise(updateCategory(editingCategory.id, payload), {
          pending: 'Saving category...',
          success: 'Category updated successfully.',
          error: 'Failed to update category.',
        })
      } else {
        await toastPromise(createCategory(payload), {
          pending: 'Creating category...',
          success: 'Category created successfully.',
          error: 'Failed to create category.',
        })
      }
      closeForm()
      fetchCategories()
    } catch (err) {
      showApiError(err, editingCategory ? 'Failed to update category.' : 'Failed to create category.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await toastPromise(deleteCategory(deleteTarget.id), {
        pending: 'Deleting category...',
        success: `"${deleteTarget.name}" deleted. Linked products are now uncategorized.`,
        error: 'Failed to delete category.',
      })
      setDeleteTarget(null)
      fetchCategories()
    } catch (err) {
      showApiError(err, 'Failed to delete category.')
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'name', label: 'Name' },
    {
      key: 'description',
      label: 'Description',
      render: (row) => row.description || '—',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={cn(btnSecondary, 'px-3 py-1.5 text-xs')} onClick={() => openEdit(row)}>
            Edit
          </button>
          <button
            type="button"
            className={cn(btnDanger, 'px-3 py-1.5 text-xs')}
            onClick={() => setDeleteTarget(row)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage product categories. Super admins can create, edit, and delete categories."
        action={
          <button type="button" className={btnPrimary} onClick={openCreate}>
            Create Category
          </button>
        }
      />

      <section className={cardClass}>
        <div className={cardBodyClass}>
          <div className="mb-5">
            <input
              type="search"
              className={inputClass()}
              placeholder="Search categories..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>

          {error && <div className={cn(alertError, 'mb-4')}>{error}</div>}

          <DataTable
            columns={columns}
            rows={categories}
            loading={loading}
            emptyTitle="No categories yet"
            emptyMessage="Create your first category to organize products."
          />

          <Pagination
            page={page}
            pageSize={pageSize}
            totalPages={pagination.totalPages}
            totalCount={pagination.count}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      </section>

      <Modal
        open={formOpen}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        onClose={closeForm}
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={closeForm} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" form="category-form" className={btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField label="Name" name="name" error={errors.name} required>
            {(fieldError, errorId) => (
              <input
                type="text"
                className={inputClass(fieldError)}
                aria-describedby={errorId}
                {...register('name', { required: 'Category name is required.' })}
              />
            )}
          </FormField>
          <FormField label="Description" name="description" error={errors.description} hint="Optional">
            {(fieldError, errorId) => (
              <textarea
                rows={3}
                className={inputClass(fieldError)}
                aria-describedby={errorId}
                {...register('description')}
              />
            )}
          </FormField>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete Category"
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
          Delete <strong>{deleteTarget?.name}</strong>? Products in this category will become
          uncategorized. This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
