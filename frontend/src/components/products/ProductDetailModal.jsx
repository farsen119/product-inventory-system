import LoadingSpinner from '../common/LoadingSpinner'
import SubVariantThresholdEditor from './SubVariantThresholdEditor'
import { getCategoryName } from '../../utils/categories'
import { getProductMedium } from '../../utils/images'
import {
  countLowStockItems,
  getSubVariantRowClass,
  isLowStockSubVariant,
} from '../../utils/stock'
import {
  badgeDanger,
  badgeNeutral,
  badgeSuccess,
  badgeWarning,
  formatStock,
} from '../../utils/ui'

function DetailItem({ label, value, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{children ?? value ?? '—'}</dd>
    </div>
  )
}

function SectionTitle({ title, badge }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {badge}
    </div>
  )
}

function DataTableMini({ columns, rows, emptyMessage }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className={row.rowClass}>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2.5 text-slate-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ProductDetailModal({ product, loading, onProductChange }) {
  if (loading) {
    return <LoadingSpinner label="Loading product..." />
  }

  if (!product) {
    return null
  }

  const imageUrl = getProductMedium(product)
  const subVariants = product.sub_variants || []
  const lowStockCount = countLowStockItems(subVariants)

  const variantRows = (product.variants || []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    options: variant.options || [],
  }))

  const handleSubVariantUpdated = (updated) => {
    if (!product || !onProductChange) return
    onProductChange({
      ...product,
      sub_variants: product.sub_variants.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item,
      ),
    })
  }

  const subVariantRows = subVariants.map((item) => ({
    ...item,
    rowClass: getSubVariantRowClass(item),
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        {imageUrl ? (
          <div className="flex justify-center md:justify-start">
            <img
              src={imageUrl}
              alt={product.ProductName}
              className="h-44 w-44 rounded-xl border border-slate-200 object-cover shadow-sm"
            />
          </div>
        ) : (
          <div className="flex h-44 w-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
            No image
          </div>
        )}

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Product Code" value={product.ProductCode} />
          <DetailItem label="HSN Code" value={product.HSNCode} />
          <DetailItem label="Category" value={getCategoryName(product)} />
          <DetailItem label="Total Stock" value={formatStock(product.TotalStock)} />
          <DetailItem label="Status">
            <span className={product.Active ? badgeSuccess : badgeNeutral}>
              {product.Active ? 'Active' : 'Inactive'}
            </span>
          </DetailItem>
        </dl>
      </div>

      <div>
        <SectionTitle title="Variants" />
        <DataTableMini
          emptyMessage="No variants"
          rows={variantRows}
          columns={[
            {
              key: 'name',
              label: 'Variant',
              render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
            },
            {
              key: 'options',
              label: 'Options',
              render: (row) => (
                <div className="flex flex-wrap gap-1">
                  {row.options.map((option) => (
                    <span key={option.id} className={badgeNeutral}>
                      {option.value}
                    </span>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </div>

      <div>
        <SectionTitle
          title="Sub-Variants & Stock"
          badge={
            lowStockCount > 0 ? (
              <span className={badgeWarning}>
                {lowStockCount} low stock sub-variant{lowStockCount === 1 ? '' : 's'}
              </span>
            ) : null
          }
        />
        <DataTableMini
          emptyMessage="No sub-variants"
          rows={subVariantRows}
          columns={[
            { key: 'name', label: 'Sub-Variant' },
            {
              key: 'sku_code',
              label: 'SKU',
              render: (row) => <span className="text-slate-500">{row.sku_code || '—'}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <span className={row.active ? badgeSuccess : badgeNeutral}>
                  {row.status || (row.active ? 'Active' : 'Archived')}
                </span>
              ),
            },
            {
              key: 'low_stock_threshold',
              label: 'Threshold',
              render: (row) => (
                <SubVariantThresholdEditor
                  subVariant={row}
                  compact
                  onUpdated={handleSubVariantUpdated}
                />
              ),
            },
            {
              key: 'stock',
              label: 'Stock',
              render: (row) => {
                const lowStock = isLowStockSubVariant(row)
                return (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={lowStock ? badgeWarning : badgeNeutral}>
                      {formatStock(row.stock)}
                    </span>
                    {lowStock && <span className={badgeDanger}>Low stock</span>}
                  </span>
                )
              },
            },
          ]}
        />
      </div>
    </div>
  )
}
