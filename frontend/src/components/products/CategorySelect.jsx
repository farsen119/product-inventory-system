import { cn, selectClass } from '../../utils/ui'

export default function CategorySelect({
  value,
  onChange,
  categories = [],
  loading = false,
  allowAll = false,
  allowUncategorized = false,
  allLabel = 'All categories',
  uncategorizedLabel = 'Uncategorized',
  emptyLabel = 'No category',
  placeholder,
  className,
  disabled = false,
  id,
  name,
  invalid = false,
  ...rest
}) {
  const isControlled = value !== undefined

  return (
    <select
      id={id}
      name={name}
      className={cn(selectClass(invalid), className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
      {...(isControlled ? { value: value ?? '', onChange } : {})}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {allowAll && <option value="">{allLabel}</option>}
      {allowUncategorized && <option value="uncategorized">{uncategorizedLabel}</option>}
      {!allowAll && !placeholder && <option value="">{emptyLabel}</option>}
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  )
}
