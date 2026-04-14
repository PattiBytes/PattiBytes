import { useCallback, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useRequireAuthAction() {
  const { user } = useAuth()
  const [showAuthSheet, setShowAuthSheet] = useState(false)

  const requireAuth = useCallback((action: () => void) => {
    if (!user) {
      setShowAuthSheet(true)
      return
    }
    action()
  }, [user])

  return {
    user,
    showAuthSheet,
    setShowAuthSheet,
    requireAuth,
  }
}