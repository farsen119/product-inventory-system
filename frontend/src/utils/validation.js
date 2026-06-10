/**
 * Client-side validation helpers used before API calls (Phase 6 forms will use these).
 */

export function validateRequired(value, fieldName) {
  if (!value || !String(value).trim()) {
    return `${fieldName} is required.`
  }
  return null
}

export function validatePositiveNumber(value, fieldName) {
  const number = Number(value)
  if (Number.isNaN(number) || number <= 0) {
    return `${fieldName} must be a positive number.`
  }
  return null
}

export function validateVariants(variants = []) {
  const errors = {}

  if (!variants.length) {
    errors.variants = 'At least one variant is required.'
    return errors
  }

  const seenNames = new Set()

  variants.forEach((variant, index) => {
    const name = (variant.name || '').trim()
    if (!name) {
      errors[`variant_${index}_name`] = 'Variant name is required.'
    } else if (seenNames.has(name.toLowerCase())) {
      errors[`variant_${index}_name`] = `Duplicate variant name "${name}".`
    } else {
      seenNames.add(name.toLowerCase())
    }

    const options = (variant.options || [])
      .map((option) => String(option).trim())
      .filter(Boolean)

    if (!options.length) {
      errors[`variant_${index}_options`] = 'Each variant needs at least one option.'
    }
  })

  return errors
}

export function previewSubVariantNames(productName, variants = []) {
  const groups = variants
    .map((variant) =>
      (variant.options || [])
        .map((option) => String(option).trim())
        .filter(Boolean),
    )
    .filter((group) => group.length)

  if (!groups.length) {
    return []
  }

  const combine = (groups, prefix = []) => {
    if (!groups.length) {
      return [`${productName} / ${prefix.join(' / ')}`]
    }
    const [first, ...rest] = groups
    return first.flatMap((option) => combine(rest, [...prefix, option]))
  }

  return combine(groups)
}
