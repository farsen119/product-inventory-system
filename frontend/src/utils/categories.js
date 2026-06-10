export function getCategoryName(product) {
  return product?.category?.name ?? null
}

export function applyCategoryIdToPayload(payload, categoryId, isFormData = false) {
  const normalizedId = categoryId || null

  if (isFormData) {
    payload.append('category_id', normalizedId ?? '')
    return payload
  }

  payload.category_id = normalizedId
  return payload
}
