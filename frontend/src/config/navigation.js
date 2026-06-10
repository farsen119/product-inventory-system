export const navigation = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    to: '/dashboard',
    end: true,
  },
  {
    id: 'products',
    label: 'Products',
    children: [
      { to: '/products', label: 'All Products', end: true },
      { to: '/products/create', label: 'Create Product' },
    ],
  },
  {
    id: 'categories',
    label: 'Category',
    to: '/categories',
    adminOnly: true,
  },
  {
    id: 'stock',
    label: 'Stock',
    children: [
      { to: '/stock', label: 'Stock Management', end: true },
      { to: '/stock/report', label: 'Stock Report', adminOnly: true },
    ],
  },
]

export function filterNavigation(isAdmin) {
  return navigation
    .map((item) => {
      if (item.adminOnly && !isAdmin) return null
      if (item.children) {
        const children = item.children.filter((child) => !child.adminOnly || isAdmin)
        if (!children.length) return null
        return { ...item, children }
      }
      return item
    })
    .filter(Boolean)
}

export function isNavGroupActive(item, pathname) {
  if (item.to) {
    return item.end ? pathname === item.to : pathname.startsWith(item.to)
  }
  return item.children?.some((child) =>
    child.end ? pathname === child.to : pathname.startsWith(child.to),
  )
}

export function isNavLinkActive(to, pathname, end = false) {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}
