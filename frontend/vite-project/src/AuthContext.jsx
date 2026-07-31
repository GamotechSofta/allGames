import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchBalance,
  fetchMe,
  getStoredUser,
  login as loginApi,
  setStoredUser,
} from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser())
  const [loading, setLoading] = useState(Boolean(getStoredUser()?.token))

  const applyUser = useCallback((data) => {
    setStoredUser(data)
    setUser(data)
  }, [])

  const refresh = useCallback(async () => {
    if (!getStoredUser()?.token) {
      setLoading(false)
      return null
    }
    try {
      const me = await fetchMe()
      applyUser(me.data)
      return me.data
    } catch {
      setStoredUser(null)
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [applyUser])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(
    async (phone, password) => {
      const res = await loginApi({ phone, password })
      applyUser(res.data)
      return res.data
    },
    [applyUser],
  )

  const logout = useCallback(() => {
    setStoredUser(null)
    setUser(null)
  }, [])

  const refreshBalance = useCallback(async () => {
    const res = await fetchBalance()
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, balance: res.data.balance }
      setStoredUser(next)
      return next
    })
    return res.data.balance
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh, refreshBalance }),
    [user, loading, login, logout, refresh, refreshBalance],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
