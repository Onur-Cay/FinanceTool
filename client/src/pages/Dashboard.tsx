import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog'
import { ExpenseList } from '@/components/expenses/ExpenseList'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import type { Expense, MonthlyAnalytics, BalanceInfo } from '@/lib/types'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'

const COLORS = ['hsl(142, 71%, 45%)', 'hsl(221, 83%, 53%)', 'hsl(262, 83%, 58%)', 'hsl(25, 95%, 53%)', 'hsl(0, 72%, 51%)', 'hsl(47, 96%, 53%)', 'hsl(173, 58%, 39%)', 'hsl(346, 77%, 50%)']

export default function Dashboard() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [analytics, setAnalytics] = useState<MonthlyAnalytics | null>(null)
  const [balances, setBalances] = useState<BalanceInfo[]>([])
  const [currency, setCurrency] = useState('£')
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const currentMonth = new Date().toISOString().substring(0, 7)

  const fetchData = async () => {
    try {
      const [expData, analyticsData, balanceData, settingsData] = await Promise.all([
        api.getExpenses({ month: currentMonth }),
        api.getMonthlyAnalytics(currentMonth),
        api.getBalance(currentMonth),
        api.getSettings(),
      ])
      setExpenses(expData)
      setAnalytics(analyticsData)
      setBalances(balanceData.balances || [])
      setCurrency(settingsData.currency || '£')
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async (id: number) => {
    try {
      await api.deleteExpense(id)
      toast({ title: 'Expense deleted' })
      fetchData()
    } catch {
      toast({ title: 'Failed to delete expense', variant: 'destructive' })
    }
  }

  const recentExpenses = expenses.slice(0, 8)
  const pieData = analytics?.by_category?.map(c => ({ name: c.category_name, value: c.total })) || []

  // Calculate who owes whom
  const owesSummary = balances.length >= 2
    ? balances.filter(b => b.balance < 0).map(debtor => {
        const creditor = balances.find(b => b.balance > 0)
        if (!creditor) return null
        return {
          from: debtor.member_name,
          to: creditor.member_name,
          amount: Math.abs(debtor.balance),
        }
      }).filter(Boolean)
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => { setEditingExpense(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(analytics?.total || 0, currency)}
            </div>
          </CardContent>
        </Card>

        {balances.map(b => (
          <Card key={b.member_id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.member_color }} />
                {b.member_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(b.total_paid, currency)}
              </div>
              <div className={`text-sm flex items-center gap-1 mt-1 ${b.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {b.balance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {b.balance >= 0 ? 'Overpaid' : 'Underpaid'} by {formatCurrency(Math.abs(b.balance), currency)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Balance Summary */}
      {owesSummary.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            {owesSummary.map((s: any, i: number) => (
              <p key={i} className="text-sm">
                <span className="font-medium">{s.from}</span> owes <span className="font-medium">{s.to}</span>: <span className="font-bold text-primary">{formatCurrency(s.amount, currency)}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value, currency)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.value, currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/transactions">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          <ExpenseList
            expenses={recentExpenses}
            currency={currency}
            onEdit={(exp) => { setEditingExpense(exp); setDialogOpen(true) }}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <AddExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editingExpense}
        onSaved={fetchData}
      />
    </div>
  )
}
