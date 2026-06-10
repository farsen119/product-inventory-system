import { useCallback, useEffect, useState } from 'react'
import { getProducts } from '../api/products'
import { getApiErrorMessage } from '../utils/apiErrors'

export function useProducts(initialParams = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useState({
    page: 1,
    page_size: 10,
    search: '',
    category: '',
    ...initialParams,
  })
  const [pagination, setPagination] = useState({
    count: 0,
    totalPages: 1,
  })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = {
        page: params.page,
        page_size: params.page_size,
      }
      if (params.search) {
        query.search = params.search
      }
      if (params.category === 'uncategorized') {
        query.uncategorized = 'true'
      } else if (params.category) {
        query.category = params.category
      }

      const { data } = await getProducts(query)
      setProducts(data.results || [])
      setPagination({
        count: data.count || 0,
        totalPages: Math.max(1, Math.ceil((data.count || 0) / params.page_size)),
      })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load products.'))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [params.page, params.page_size, params.search, params.category])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const setPage = (page) => setParams((current) => ({ ...current, page }))
  const setPageSize = (pageSize) =>
    setParams((current) => ({ ...current, page_size: pageSize, page: 1 }))
  const setSearch = (search) =>
    setParams((current) => ({ ...current, search, page: 1 }))
  const setCategory = (category) =>
    setParams((current) => ({ ...current, category, page: 1 }))

  return {
    products,
    loading,
    error,
    params,
    pagination,
    setPage,
    setPageSize,
    setSearch,
    setCategory,
    refresh: fetchProducts,
  }
}
