/**
 * ProductImage API shape: { thumbnail, medium, full } or null.
 * Supports legacy string URLs during transition.
 */

function normalizeProductImage(productImage) {
  if (!productImage) {
    return null
  }
  if (typeof productImage === 'string') {
    return { thumbnail: productImage, medium: productImage, full: productImage }
  }
  return productImage
}

export function getProductThumbnail(product) {
  return normalizeProductImage(product?.ProductImage)?.thumbnail ?? null
}

export function getProductMedium(product) {
  const image = normalizeProductImage(product?.ProductImage)
  return image?.medium ?? image?.full ?? null
}

export function hasProductImage(product) {
  return Boolean(getProductThumbnail(product) || getProductMedium(product))
}
