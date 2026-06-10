import api from './axios'

export const patchSubVariant = (id, data) => api.patch(`/subvariants/${id}/`, data)
