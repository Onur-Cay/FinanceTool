import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SpendingByCategory from '@/components/analytics/SpendingByCategory'
import SpendingByMember from '@/components/analytics/SpendingByMember'
import MonthlyTrends from '@/components/analytics/MonthlyTrends'
import MemberBalance from '@/components/analytics/MemberBalance'
import BudgetProgress from '@/components/analytics/BudgetProgress'
import { api } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { MonthlyAnalytics, YearlyAnalytics, Member } from '@/lib/types'

export default function Analytics() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const currentYear = currentMonth.substring(0, 4)

  const [monthly, setMonthly] = useState<MonthlyAnalytics | null>(null)
  const [yearly, setYearly] = useState<YearlyAnalytics | null>(null)
  const [balanceData, setBalanceData] = useState<any>(null)
  const [budgetLimits, setBudgetLimits] = useState<any[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [currency, setCurrency] = useState('£')

  // Settle up dialog
  const [settleOpen, setSettleOpen] = useState(false)
  const [settleFrom, setSettleFrom] = useState('')
  const [settleTo, setSettleTo] = useState('')
  const [settleAmount, setSettleAmount] = useState('')

  const fetchData = async () => {
    try {
      const [monthlyData, yearlyData, balData, budgetData, memData, settingsData] = await Promise.all([
        api.getMonthlyAnalytics(currentMonth),
        api.getYearlyAnalytics(currentYear),
        api.getCumulativeBalance(),
        api.getBudgetLimits(),
        api.getMembers(),
        api.getSettings(),
      ])
      setMonthly(monthlyData)
      setYearly(yearlyData)
      setBalanceData(balData)
      setBudgetLimits(budgetData)
      setMembers(memData)
      setCurrency(settingsData.currency || '£')
    } catch (err) {
      console.error('Failed to fetch analytics', err)
    }
  }

  useEffect(() => { fetchData() }, [currentMonth])

  const navigateMonth = (dir: number) => {
    const d = new Date(currentMonth + '-01')
    d.setMonth(d.getMonth() + dir)
    setCurrentMonth(d.toISOString().substring(0, 7))
  }

  const monthLabel = useMemo(() => {
    const d = new Date(currentMonth + '-01')
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  }, [currentMonth])

  const handleSettleUp = async () => {
    if (!settleFrom || !settleTo || !settleAmount) return
    try {
      await api.createSettlement({
        from_member_id: parseInt(settleFrom),
        to_member_id: parseInt(settleTo),
        amount: parseFloat(settleAmount),
        date: new Date().toISOString().split('T')[0],
      })
      toast({ title: 'Settlement recorded' })
      setSettleOpen(false)
      setSettleFrom('')
      setSettleTo('')
      setSettleAmount('')
      fetchData()
    } catch {
      toast({ title: 'Failed to record settlement', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      {/* Month Selector */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold min-w-[160px] text-center">{monthLabel}</span>
        <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {monthly && monthly.by_category.length > 0 && (
              <SpendingByCategory data={monthly.by_category} currency={currency} />
            )}
            {monthly && monthly.by_member.length > 0 && (
              <SpendingByMember data={monthly.by_member} currency={currency} />
            )}
          </div>

          {balanceData && balanceData.balances.length > 0 && (
            <MemberBalance
              balances={balanceData.balances}
              currency={currency}
              onSettleUp={() => setSettleOpen(true)}
            />
          )}

          {budgetLimits.length > 0 && (
            <BudgetProgress limits={budgetLimits} currency={currency} />
          )}
        </TabsContent>

        <TabsContent value="yearly" className="space-y-6">
          {yearly && yearly.monthly_totals.length > 0 && (
            <MonthlyTrends data={yearly.monthly_totals} currency={currency} />
          )}
        </TabsContent>
      </Tabs>

      {/* Settle Up Dialog */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>From</Label>
              <Select value={settleFrom} onValueChange={setSettleFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Who is paying" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={settleTo} onValueChange={setSettleTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Who receives" />
                </SelectTrigger>
                <SelectContent>
                  {members.filter(m => String(m.id) !== settleFrom).map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)}>Cancel</Button>
            <Button onClick={handleSettleUp}>Record Settlement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
