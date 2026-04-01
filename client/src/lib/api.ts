const BASE_URL = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || res.statusText)
  }
  return res.json()
}

export const api = {
  // Expenses
  getExpenses(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/expenses${query}`)
  },
  createExpense(data: any) {
    return request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) })
  },
  updateExpense(id: number, data: any) {
    return request<any>(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  deleteExpense(id: number) {
    return request<void>(`/expenses/${id}`, { method: 'DELETE' })
  },

  // Categories
  getCategories() {
    return request<any[]>('/categories')
  },
  createCategory(data: any) {
    return request<any>('/categories', { method: 'POST', body: JSON.stringify(data) })
  },
  updateCategory(id: number, data: any) {
    return request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  deleteCategory(id: number) {
    return request<void>(`/categories/${id}`, { method: 'DELETE' })
  },
  createSubCategory(categoryId: number, data: any) {
    return request<any>(`/categories/${categoryId}/subcategories`, { method: 'POST', body: JSON.stringify(data) })
  },
  updateSubCategory(id: number, data: any) {
    return request<any>(`/subcategories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  deleteSubCategory(id: number) {
    return request<void>(`/subcategories/${id}`, { method: 'DELETE' })
  },

  // Members
  getMembers() {
    return request<any[]>('/members')
  },
  createMember(data: any) {
    return request<any>('/members', { method: 'POST', body: JSON.stringify(data) })
  },
  updateMember(id: number, data: any) {
    return request<any>(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },
  deleteMember(id: number) {
    return request<void>(`/members/${id}`, { method: 'DELETE' })
  },

  // Analytics
  getMonthlyAnalytics(month: string) {
    return request<any>(`/analytics/monthly?month=${month}`)
  },
  getYearlyAnalytics(year: string) {
    return request<any>(`/analytics/yearly?year=${year}`)
  },
  getBalance(month: string) {
    return request<any>(`/analytics/balance?month=${month}`)
  },
  getCumulativeBalance() {
    return request<any>(`/analytics/cumulative-balance`)
  },

  // Settlements
  getSettlements(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<any[]>(`/settlements${query}`)
  },
  createSettlement(data: any) {
    return request<any>('/settlements', { method: 'POST', body: JSON.stringify(data) })
  },
  deleteSettlement(id: number) {
    return request<void>(`/settlements/${id}`, { method: 'DELETE' })
  },

  // Settings
  getSettings() {
    return request<any>('/settings')
  },
  updateSettings(data: any) {
    return request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) })
  },

  // Budget Limits
  getBudgetLimits() {
    return request<any[]>('/budget-limits')
  },
  upsertBudgetLimit(data: any) {
    return request<any>('/budget-limits', { method: 'POST', body: JSON.stringify(data) })
  },
  deleteBudgetLimit(id: number) {
    return request<void>(`/budget-limits/${id}`, { method: 'DELETE' })
  },
}
