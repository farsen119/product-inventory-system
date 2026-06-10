import { useCallback, useEffect, useState } from 'react'
import { getCategories } from '../api/categories'
import { getApiErrorMessage } from '../utils/apiErrors'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getCategories({ page_size: 100 })
      setCategories(data.results || [])
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load categories.'))
      setCategories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return { categories, loading, error, refresh: fetchCategories }
}
