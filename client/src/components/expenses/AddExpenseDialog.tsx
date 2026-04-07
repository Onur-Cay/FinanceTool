import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { format } from 'date-fns'
import { CalendarIcon, Loader2, Percent } from 'lucide-react'
import { Expense, Category, Member, ExpenseShare } from '@/lib/types'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CategoryPicker } from '@/components/expenses/CategoryPicker'

function evaluateAmountExpression(expr: string): number {
  const parts = expr.split('+').map(p => parseFloat(p.trim()))
  if (parts.some(p => isNaN(p) || p < 0)) return NaN
  return parts.reduce((sum, p) => sum + p, 0)
}

const SPLIT_VALUE = 'split'

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense | null
  onSaved: () => void
}

export function AddExpenseDialog({ open, onOpenChange, expense, onSaved }: AddExpenseDialogProps) {
  const isEditing = !!expense
  const { defaultMemberId } = useTheme()

  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [subCategoryId, setSubCategoryId] = useState('')
  const [paidByMemberId, setPaidByMemberId] = useState('')
  const [date, setDate] = useState<Date>(new Date())
  const [splitAmounts, setSplitAmounts] = useState<Record<number, string>>({})
  const [usePercentage, setUsePercentage] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

  const isSplit = paidByMemberId === SPLIT_VALUE

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, mems] = await Promise.all([api.getCategories(), api.getMembers()])
      setCategories(cats)
      setMembers(mems)

      // Set default payer to the locally stored default member
      if (!expense) {
        const defaultMember = (defaultMemberId && mems.find((m: Member) => String(m.id) === defaultMemberId)) || mems[0]
        if (defaultMember) {
          setPaidByMemberId(String(defaultMember.id))
        }
      }
    } catch {
      toast({ title: 'Failed to load data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [expense, defaultMemberId])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      fetchData()

      if (expense) {
        setDescription(expense.description || '')
        setAmount(String(expense.amount))
        setSubCategoryId(String(expense.sub_category_id))
        setDate(new Date(expense.date))
        setPaymentMethod(expense.payment_method || '')

        // Check if this is a split transaction (multiple shares)
        if (expense.shares && expense.shares.length > 1) {
          setPaidByMemberId(SPLIT_VALUE)
          const amounts: Record<number, string> = {}
          expense.shares.forEach((share) => {
            amounts[share.member_id] = String(share.amount)
          })
          setSplitAmounts(amounts)
          setUsePercentage(false)
        } else if (expense.shares && expense.shares.length > 0) {
          setPaidByMemberId(String(expense.shares[0].member_id))
          setSplitAmounts({})
          setUsePercentage(false)
        }
      } else {
        // Reset to defaults for new expense
        setDescription('')
        setAmount('')
        setSubCategoryId('')
        setDate(new Date())
        setSplitAmounts({})
        setUsePercentage(false)
        setPaymentMethod('')
      }
    }
  }, [open, expense, fetchData])

  // Initialize split amounts when selecting "Split"
  useEffect(() => {
    if (isSplit && members.length > 0 && Object.keys(splitAmounts).length === 0) {
      const numericAmount = evaluateAmountExpression(amount) || 0
      if (usePercentage) {
        const perPerson = members.length > 0 ? (100 / members.length) : 0
        const amounts: Record<number, string> = {}
        members.forEach((member) => {
          amounts[member.id] = perPerson > 0 ? perPerson.toFixed(1) : ''
        })
        setSplitAmounts(amounts)
      } else {
        const perPerson = numericAmount / members.length
        const amounts: Record<number, string> = {}
        members.forEach((member) => {
          amounts[member.id] = perPerson > 0 ? perPerson.toFixed(2) : ''
        })
        setSplitAmounts(amounts)
      }
    }
  }, [isSplit, members, amount, splitAmounts, usePercentage])

  // When toggling percentage mode, convert values
  const handlePercentageToggle = (checked: boolean) => {
    const numericAmount = evaluateAmountExpression(amount) || 0
    setUsePercentage(checked)

    if (numericAmount > 0 && Object.keys(splitAmounts).length > 0) {
      const newAmounts: Record<number, string> = {}
      if (checked) {
        // Convert amounts to percentages
        members.forEach((member) => {
          const val = parseFloat(splitAmounts[member.id] || '0')
          const pct = (val / numericAmount) * 100
          newAmounts[member.id] = pct > 0 ? pct.toFixed(1) : ''
        })
      } else {
        // Convert percentages to amounts
        members.forEach((member) => {
          const pct = parseFloat(splitAmounts[member.id] || '0')
          const val = (pct / 100) * numericAmount
          newAmounts[member.id] = val > 0 ? val.toFixed(2) : ''
        })
      }
      setSplitAmounts(newAmounts)
    }
  }

  // Calculate resolved split amounts (always in currency)
  const resolvedSplitAmounts = useMemo(() => {
    const numericAmount = evaluateAmountExpression(amount) || 0
    const resolved: Record<number, number> = {}
    members.forEach((member) => {
      const val = parseFloat(splitAmounts[member.id] || '0')
      if (usePercentage) {
        resolved[member.id] = (val / 100) * numericAmount
      } else {
        resolved[member.id] = val
      }
    })
    return resolved
  }, [splitAmounts, amount, members, usePercentage])

  const splitTotal = useMemo(() => {
    return Object.values(resolvedSplitAmounts).reduce((sum, v) => sum + v, 0)
  }, [resolvedSplitAmounts])

  const numericAmount = useMemo(() => evaluateAmountExpression(amount) || 0, [amount])

  const splitMatchesTotal = Math.abs(splitTotal - numericAmount) < 0.02

  const handleWhoPaidChange = (value: string) => {
    setPaidByMemberId(value)
    if (value === SPLIT_VALUE) {
      // Initialize split amounts
      setSplitAmounts({})
      setUsePercentage(false)
    } else {
      setSplitAmounts({})
      setUsePercentage(false)
    }
  }

  const handleSave = async () => {
    const evalAmount = evaluateAmountExpression(amount)
    if (isNaN(evalAmount) || evalAmount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' })
      return
    }
    if (!subCategoryId) {
      toast({ title: 'Please select a category', variant: 'destructive' })
      return
    }
    if (!paidByMemberId) {
      toast({ title: 'Please select who paid', variant: 'destructive' })
      return
    }

    // Build shares
    let shares: Omit<ExpenseShare, 'id' | 'expense_id'>[]
    if (isSplit) {
      shares = Object.entries(resolvedSplitAmounts)
        .filter(([, amt]) => amt > 0)
        .map(([memberId, amt]) => ({
          member_id: Number(memberId),
          amount: Math.round(amt * 100) / 100,
        }))

      if (shares.length === 0) {
        toast({ title: 'Please enter split amounts', variant: 'destructive' })
        return
      }

      if (!splitMatchesTotal) {
        toast({ title: `Split amounts must add up to £${evalAmount.toFixed(2)}`, variant: 'destructive' })
        return
      }
    } else {
      shares = [
        {
          member_id: Number(paidByMemberId),
          amount: evalAmount,
        },
      ]
    }

    const payload = {
      amount: evalAmount,
      description: description.trim() || null,
      sub_category_id: Number(subCategoryId),
      date: format(date, 'yyyy-MM-dd'),
      payment_method: paymentMethod || null,
      shares,
    }

    setSaving(true)
    try {
      if (isEditing && expense) {
        await api.updateExpense(expense.id, payload)
        toast({ title: 'Expense updated' })
      } else {
        await api.createExpense(payload)
        toast({ title: 'Expense added' })
      }
      onSaved()
      onOpenChange(false)
    } catch {
      toast({
        title: isEditing ? 'Failed to update expense' : 'Failed to add expense',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const expressionTotal = useMemo(() => {
    if (!amount.includes('+')) return null
    const result = evaluateAmountExpression(amount)
    return isNaN(result) ? null : result
  }, [amount])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the expense details below.' : 'Enter the expense details below.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What was this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative flex items-center gap-1">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                    £
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00 or 10+5+3.50"
                    className="pl-8 text-lg font-semibold h-12"
                    value={amount}
                    onChange={(e) => {
                      const filtered = e.target.value.replace(/[^0-9.+]/g, '')
                      setAmount(filtered)
                    }}
                  />
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  className="h-12 w-12 shrink-0 rounded-md border border-input bg-background text-xl font-bold hover:bg-accent active:bg-accent"
                  onPointerDown={(e) => {
                    e.preventDefault()
                    setAmount((prev) => prev + '+')
                  }}
                >
                  +
                </button>
              </div>
              {expressionTotal !== null && (
                <p className="text-xs text-muted-foreground">
                  Total: <span className="text-foreground font-medium">£{expressionTotal.toFixed(2)}</span>
                </p>
              )}
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label>Category</Label>
              <CategoryPicker
                categories={categories}
                value={subCategoryId}
                onValueChange={setSubCategoryId}
              />
            </div>

            {/* Who Paid */}
            <div className="grid gap-2">
              <Label>Who paid</Label>
              <Select value={paidByMemberId} onValueChange={handleWhoPaidChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={String(member.id)}>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: member.color }}
                        />
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value={SPLIT_VALUE}>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0 bg-gradient-to-r from-blue-500 to-purple-500" />
                      Split
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Split Amounts (shown when "Split" is selected) */}
            {isSplit && (
              <div className="grid gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Split breakdown</Label>
                  <button
                    type="button"
                    onClick={() => handlePercentageToggle(!usePercentage)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      usePercentage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Percent className="h-3 w-3" />
                    {usePercentage ? 'Percentage' : 'Values'}
                  </button>
                </div>
                <div className="grid gap-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: member.color }}
                        />
                        <span className="text-sm">{member.name}</span>
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {usePercentage ? '%' : '£'}
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step={usePercentage ? '0.1' : '0.01'}
                          min="0"
                          max={usePercentage ? '100' : undefined}
                          placeholder="0.00"
                          className="pl-6 h-9 text-sm"
                          value={splitAmounts[member.id] || ''}
                          onChange={(e) =>
                            setSplitAmounts((prev) => ({
                              ...prev,
                              [member.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                      {usePercentage && resolvedSplitAmounts[member.id] > 0 && (
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          £{resolvedSplitAmounts[member.id].toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {/* Split total validation */}
                {numericAmount > 0 && (
                  <div className={cn(
                    'flex items-center justify-between text-xs px-1 pt-1 border-t',
                    splitMatchesTotal ? 'text-emerald-600' : 'text-red-500'
                  )}>
                    <span>
                      Split total: £{splitTotal.toFixed(2)}
                    </span>
                    <span>
                      {splitMatchesTotal
                        ? 'Matches total'
                        : `${splitTotal > numericAmount ? 'Over' : 'Under'} by £${Math.abs(splitTotal - numericAmount).toFixed(2)}`
                      }
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Date */}
            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(day) => {
                      if (day) {
                        setDate(day)
                        setCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Method */}
            <div className="grid gap-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
