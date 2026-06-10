import api from './axios'

export const getProducts = (params) => api.get('/products/', { params })

export const getProduct = (id) => api.get(`/products/${id}/`)

export const createProduct = (data) => {
  // Do NOT set Content-Type for FormData — axios must add the boundary automatically
  return api.post('/products/', data)
}

export const updateProduct = (id, data) => api.patch(`/products/${id}/`, data)

export const deleteProduct = (id, hard = false) =>
  api.delete(`/products/${id}/`, { params: hard ? { hard: 'true' } : {} })

export const getSubVariants = (productId, params = {}) =>
  api.get(`/products/${productId}/subvariants/`, { params })
