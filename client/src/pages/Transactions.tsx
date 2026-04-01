import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog'
import { ExpenseList } from '@/components/expenses/ExpenseList'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import type { Expense, Category, Member } from '@/lib/types'

export default function Transactions() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [currency, setCurrency] = useState('£')
  const [loading, setLoading] = useState(true)

  // Filters
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const [filterMember, setFilterMember] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const fetchData = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = { month: currentMonth }
      if (filterMember !== 'all') params.member_id = filterMember
      if (filterCategory !== 'all') params.category_id = filterCategory

      const [expData, catData, memData, settingsData] = await Promise.all([
        api.getExpenses(params),
        api.getCategories(),
        api.getMembers(),
        api.getSettings(),
      ])
      setExpenses(expData)
      setCategories(catData)
      setMembers(memData)
      setCurrency(settingsData.currency || '£')
    } catch (err) {
      console.error('Failed to fetch transactions', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [currentMonth, filterMember, filterCategory])

  const handleDelete = async (id: number) => {
    try {
      await api.deleteExpense(id)
      toast({ title: 'Expense deleted' })
      fetchData()
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' })
    }
  }

  const navigateMonth = (dir: number) => {
    const d = new Date(currentMonth + '-01')
    d.setMonth(d.getMonth() + dir)
    setCurrentMonth(d.toISOString().substring(0, 7))
  }

  const monthLabel = useMemo(() => {
    const d = new Date(currentMonth + '-01')
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }, [currentMonth])

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Button onClick={() => { setEditingExpense(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[160px] text-center">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-lg font-bold">
          {formatCurrency(total, currency)}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterMember} onValueChange={setFilterMember}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Members" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {members.map(m => (
              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No transactions for this period.
        </div>
      ) : (
        <ExpenseList
          expenses={expenses}
          currency={currency}
          onEdit={(exp) => { setEditingExpense(exp); setDialogOpen(true) }}
          onDelete={handleDelete}
        />
      )}

      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
        onSaved={fetchData}
      />
    </div>
  )
}
