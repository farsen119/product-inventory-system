import { toast } from 'react-toastify'
import { getApiErrorMessage } from './apiErrors'

export const showSuccess = (message) => toast.success(message)

export const showError = (message) => toast.error(message)

export const showInfo = (message) => toast.info(message)

export const showWarning = (message) => toast.warning(message)

export const showApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  showError(getApiErrorMessage(error, fallback))
}

export const toastPromise = (promise, messages = {}) =>
  toast.promise(promise, {
    pending: messages.pending || 'Please wait...',
    success: messages.success || 'Done!',
    error: {
      render: ({ data }) =>
        getApiErrorMessage(data, messages.error || 'Something went wrong.'),
    },
  })
