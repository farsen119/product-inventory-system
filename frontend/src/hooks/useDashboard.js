import { useCallback, useEffect, useState } from 'react'
import { getDashboard } from '../api/dashboard'
import { getApiErrorMessage } from '../utils/apiErrors'

export function useDashboard(initialParams = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useState({
    days: 30,
    recent_limit: 10,
    top_limit: 5,
    ...initialParams,
  })

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: response } = await getDashboard(params)
      setData(response)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load dashboard.'))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [params.days, params.recent_limit, params.top_limit])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  return {
    data,
    loading,
    error,
    params,
    setParams,
    refresh: fetchDashboard,
  }
}
