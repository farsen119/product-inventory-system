import { errorClass, hintClass, labelClass } from '../../utils/ui'

export default function FormField({
  label,
  name,
  error,
  hint,
  required = false,
  children,
  className = 'mb-4',
}) {
  const errorId = error ? `${name}-error` : undefined

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className={labelClass}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children(error, errorId)}
      {hint && !error && <p className={hintClass}>{hint}</p>}
      {error && (
        <p id={errorId} className={errorClass} role="alert">
          {error.message || error}
        </p>
      )}
    </div>
  )
}
