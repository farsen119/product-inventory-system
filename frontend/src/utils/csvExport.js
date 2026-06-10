/**
 * Export an array of objects to CSV and trigger browser download.
 */
export function exportToCsv(filename, rows, columns) {
  if (!rows.length) {
    return false
  }

  const headers = columns.map((col) => col.label)
  const keys = columns.map((col) => col.key)

  const escape = (value) => {
    const text = value == null ? '' : String(value)
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [
    headers.join(','),
    ...rows.map((row) => keys.map((key) => escape(row[key])).join(',')),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  return true
}
