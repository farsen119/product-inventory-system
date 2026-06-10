const STATUS_FALLBACKS = {
  400: 'Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to perform this action.",
  404: 'The requested item was not found.',
  409: 'This action conflicts with existing data. It may already exist.',
  500: 'Server error. Please try again later.',
}

function extractDetail(data) {
  if (!data) {
    return null
  }

  if (typeof data.detail === 'string') {
    return data.detail
  }

  if (Array.isArray(data.detail)) {
    return data.detail.join(', ')
  }

  if (typeof data === 'object') {
    const messages = []
    Object.entries(data).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        messages.push(`${field}: ${value.join(', ')}`)
      } else if (typeof value === 'string') {
        messages.push(`${field}: ${value}`)
      }
    })
    if (messages.length) {
      return messages.join(' | ')
    }
  }

  return null
}

/**
 * Extract a user-friendly message from Django REST Framework error responses.
 */
export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const status = error?.response?.status
  const data = error?.response?.data
  const detailMessage = extractDetail(data)

  if (detailMessage) {
    return detailMessage
  }

  if (!error?.response) {
    return error?.message?.includes('Network Error')
      ? 'Cannot reach the server. Make sure Django is running on port 8000.'
      : fallback
  }

  if (status && STATUS_FALLBACKS[status]) {
    return STATUS_FALLBACKS[status]
  }

  return fallback
}
