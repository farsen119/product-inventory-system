export function isLowStockSubVariant(item) {
  if (item?.is_low_stock != null) {
    return Boolean(item.is_low_stock)
  }

  const stock = Number(item?.stock || 0)
  const threshold = Number(item?.low_stock_threshold ?? 5)
  return item?.active !== false && stock <= threshold
}

export function getStockBadgeClass(item) {
  return isLowStockSubVariant(item) ? 'text-bg-warning' : 'text-bg-success'
}

export function getSubVariantRowClass(item) {
  if (item?.active === false) {
    return 'bg-slate-50/80'
  }
  if (isLowStockSubVariant(item)) {
    return 'bg-amber-50/60'
  }
  return ''
}

export function countLowStockItems(items = []) {
  return items.filter((item) => isLowStockSubVariant(item)).length
}
