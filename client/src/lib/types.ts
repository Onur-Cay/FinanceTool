export interface Member {
  id: number
  name: string
  color: string
  is_default: number
  created_at: string
}

export interface Category {
  id: number
  name: string
  icon: string
  sort_order: number
  created_at: string
  sub_categories: SubCategory[]
}

export interface SubCategory {
  id: number
  category_id: number
  name: string
  icon: string | null
  sort_order: number
  created_at: string
}

export interface ExpenseShare {
  id?: number
  expense_id?: number
  member_id: number
  amount: number
  member_name?: string
  member_color?: string
}

export interface Expense {
  id: number
  amount: number
  description: string | null
  sub_category_id: number
  date: string
  payment_method: string | null
  created_at: string
  updated_at: string
  shares: ExpenseShare[]
  sub_category_name?: string
  category_name?: string
  category_icon?: string
}

export interface Settlement {
  id: number
  from_member_id: number
  to_member_id: number
  amount: number
  date: string
  note: string | null
  created_at: string
  from_member_name?: string
  to_member_name?: string
}

export interface BudgetLimit {
  id: number
  category_id: number
  monthly_limit: number
  created_at: string
  category_name?: string
  spent?: number
}

export interface Settings {
  [key: string]: string
}

export interface MonthlyAnalytics {
  total: number
  by_category: {
    category_id: number
    category_name: string
    category_icon: string
    total: number
    sub_categories: {
      sub_category_id: number
      sub_category_name: string
      total: number
    }[]
  }[]
  by_member: {
    member_id: number
    member_name: string
    member_color: string
    total: number
  }[]
}

export interface YearlyAnalytics {
  total: number
  monthly_totals: {
    month: string
    total: number
  }[]
}

export interface BalanceInfo {
  member_id: number
  member_name: string
  member_color: string
  total_paid: number
  fair_share: number
  balance: number
}
