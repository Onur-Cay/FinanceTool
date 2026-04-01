import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Settings } from '@/lib/types'

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getSettings()
      setSettings(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(async (updates: Record<string, string>) => {
    try {
      const data = await api.updateSettings(updates)
      setSettings(data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const currency = settings.currency || '£'

  return { settings, loading, error, refetch: fetchSettings, updateSettings, currency }
}
