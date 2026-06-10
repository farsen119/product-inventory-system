import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './common/LoadingSpinner'

export default function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <LoadingSpinner label="Loading..." />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/products" replace />
  }

  return children
}
