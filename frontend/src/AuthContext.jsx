import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  fetchBalance,
  fetchMe,
  getStoredUser,
  login as loginApi,
  register as registerApi,
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

  const register = useCallback(
    async (phone, password, username) => {
      const res = await registerApi({ phone, password, username })
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
    const balance = res.data.balance
    setUser((prev) => {
      if (!prev) return prev
      if (Number(prev.balance) === Number(balance)) return prev
      const next = { ...prev, balance }
      setStoredUser(next)
      return next
    })
    return balance
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh, refreshBalance }),
    [user, loading, login, register, logout, refresh, refreshBalance],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
