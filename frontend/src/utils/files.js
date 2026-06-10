/**
 * Extract a valid File from a react-hook-form file input value.
 * Returns null when no file was chosen.
 */
export function getSelectedFile(fileValue) {
  if (!fileValue) {
    return null
  }

  if (fileValue instanceof File) {
    return fileValue.size > 0 ? fileValue : null
  }

  if (typeof FileList !== 'undefined' && fileValue instanceof FileList) {
    const file = fileValue[0]
    return file && file.size > 0 ? file : null
  }

  if (Array.isArray(fileValue) && fileValue[0] instanceof File) {
    return fileValue[0].size > 0 ? fileValue[0] : null
  }

  return null
}
