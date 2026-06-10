import { useMemo } from 'react'
import { previewSubVariantNames } from '../../utils/validation'
import { alertInfo, badgeNeutral } from '../../utils/ui'

export default function SubVariantPreview({ productName, variants = [] }) {
  const parsedVariants = useMemo(
    () =>
      variants.map((variant) => ({
        name: (variant.name || '').trim(),
        options: (variant.optionsText || '')
          .split(',')
          .map((option) => option.trim())
          .filter(Boolean),
      })),
    [variants],
  )

  const previewNames = useMemo(
    () => previewSubVariantNames(productName || 'Product', parsedVariants),
    [productName, parsedVariants],
  )

  if (!previewNames.length) {
    return (
      <div className={alertInfo}>
        Add variant names and comma-separated options to preview sub-variants.
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Sub-variant preview</h3>
        <span className={badgeNeutral}>{previewNames.length} will be created</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sub-Variant Name
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {previewNames.map((name, index) => (
              <tr key={name}>
                <td className="px-4 py-2 text-slate-500">{index + 1}</td>
                <td className="px-4 py-2 text-slate-900">{name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
