import { useCallback, useEffect, useState } from 'react'
import { getStockLevels, getStockReport } from '../api/stock'
import { getApiErrorMessage } from '../utils/apiErrors'

export function useStockLevels(initialParams = {}) {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useState({
    page: 1,
    page_size: 10,
    product_id: '',
    ...initialParams,
  })
  const [pagination, setPagination] = useState({
    count: 0,
    totalPages: 1,
  })

  const fetchLevels = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = {
        page: params.page,
        page_size: params.page_size,
      }
      if (params.product_id) {
        query.product_id = params.product_id
      }

      const { data } = await getStockLevels(query)
      setLevels(data.results || [])
      setPagination({
        count: data.count || 0,
        totalPages: Math.max(1, Math.ceil((data.count || 0) / params.page_size)),
      })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load stock levels.'))
      setLevels([])
    } finally {
      setLoading(false)
    }
  }, [params.page, params.page_size, params.product_id])

  useEffect(() => {
    fetchLevels()
  }, [fetchLevels])

  return {
    levels,
    loading,
    error,
    params,
    pagination,
    setParams,
    refresh: fetchLevels,
  }
}

export function useStockReport(initialParams = {}) {
  const [report, setReport] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [params, setParams] = useState({
    page: 1,
    page_size: 20,
    start_date: '',
    end_date: '',
    product_id: '',
    transaction_type: '',
    ...initialParams,
  })
  const [pagination, setPagination] = useState({
    count: 0,
    totalPages: 1,
  })

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const query = {
        page: params.page,
        page_size: params.page_size,
      }
      if (params.start_date) query.start_date = params.start_date
      if (params.end_date) query.end_date = params.end_date
      if (params.product_id) query.product_id = params.product_id
      if (params.transaction_type) query.transaction_type = params.transaction_type

      const { data } = await getStockReport(query)
      setReport(data.results || [])
      setPagination({
        count: data.count || 0,
        totalPages: Math.max(1, Math.ceil((data.count || 0) / params.page_size)),
      })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load stock report.'))
      setReport([])
    } finally {
      setLoading(false)
    }
  }, [
    params.page,
    params.page_size,
    params.start_date,
    params.end_date,
    params.product_id,
    params.transaction_type,
  ])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  return {
    report,
    loading,
    error,
    params,
    pagination,
    setParams,
    refresh: fetchReport,
  }
}
