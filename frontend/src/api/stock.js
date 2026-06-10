import api from './axios'

export const purchaseStock = (data) => api.post('/stock/purchase/', data)

export const bulkPurchaseStock = (data) => api.post('/stock/purchase/bulk/', data)

export const saleStock = (data) => api.post('/stock/sale/', data)

export const getStockLevels = (params) => api.get('/stock/', { params })

export const getStockReport = (params) => api.get('/stock/report/', { params })
