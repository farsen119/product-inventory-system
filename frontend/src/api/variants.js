import api from './axios'

export const getVariants = (productId) =>
  api.get(`/products/${productId}/variants/`)

export const addVariant = (productId, data) =>
  api.post(`/products/${productId}/variants/`, data)

export const updateVariant = (variantId, data) =>
  api.put(`/variants/${variantId}/`, data)

export const patchVariant = (variantId, data) =>
  api.patch(`/variants/${variantId}/`, data)

export const deleteVariant = (variantId) =>
  api.delete(`/variants/${variantId}/`)
