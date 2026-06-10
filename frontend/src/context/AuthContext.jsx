import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  const isAuthenticated = Boolean(
    localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'),
  )
  const isAdmin = Boolean(user?.is_superuser)

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/token/', { username, password })
    localStorage.setItem('accessToken', data.access)
    localStorage.setItem('refreshToken', data.refresh)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }, [])

  const refreshUser = useCallback(async () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')

    if (!accessToken && !refreshToken) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const { data } = await api.get('/me/')
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      isAdmin,
      login,
      logout,
    }),
    [user, loading, isAuthenticated, isAdmin, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
