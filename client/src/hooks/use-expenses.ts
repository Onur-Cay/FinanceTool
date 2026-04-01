import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Expense } from '@/lib/types'

export function useExpenses(params?: Record<string, string>) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getExpenses(params)
      setExpenses(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(params)])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  return { expenses, loading, error, refetch: fetchExpenses }
}
