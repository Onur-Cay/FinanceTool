import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTheme } from '@/hooks/use-theme'
import { format } from 'date-fns'
import { CalendarIcon, Loader2 } from 'lucide-react'
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
  const [customSplit, setCustomSplit] = useState(false)
  const [splitAmounts, setSplitAmounts] = useState<Record<number, string>>({})
  const [paymentMethod, setPaymentMethod] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)

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

        // Set payer from shares
        if (expense.shares && expense.shares.length > 0) {
          setPaidByMemberId(String(expense.shares[0].member_id))

          // Check if custom split
          if (expense.shares.length > 1) {
            setCustomSplit(true)
            const amounts: Record<number, string> = {}
            expense.shares.forEach((share) => {
              amounts[share.member_id] = String(share.amount)
            })
            setSplitAmounts(amounts)
          } else {
            setCustomSplit(false)
            setSplitAmounts({})
          }
        }
      } else {
        // Reset to defaults for new expense
        setDescription('')
        setAmount('')
        setSubCategoryId('')
        setDate(new Date())
        setCustomSplit(false)
        setSplitAmounts({})
        setPaymentMethod('')
      }
    }
  }, [open, expense, fetchData])

  // Initialize split amounts when toggling custom split on
  useEffect(() => {
    if (customSplit && members.length > 0 && Object.keys(splitAmounts).length === 0) {
      const numericAmount = evaluateAmountExpression(amount) || 0
      const perPerson = numericAmount / members.length
      const amounts: Record<number, string> = {}
      members.forEach((member) => {
        amounts[member.id] = perPerson > 0 ? perPerson.toFixed(2) : ''
      })
      setSplitAmounts(amounts)
    }
  }, [customSplit, members, amount, splitAmounts])

  const handleSave = async () => {
    const numericAmount = evaluateAmountExpression(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
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
    if (customSplit) {
      shares = Object.entries(splitAmounts)
        .filter(([, amt]) => parseFloat(amt) > 0)
        .map(([memberId, amt]) => ({
          member_id: Number(memberId),
          amount: parseFloat(amt),
        }))

      if (shares.length === 0) {
        toast({ title: 'Please enter split amounts', variant: 'destructive' })
        return
      }
    } else {
      shares = [
        {
          member_id: Number(paidByMemberId),
          amount: numericAmount,
        },
      ]
    }

    const payload = {
      amount: numericAmount,
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                  £
                </span>
                <Input
                  id="amount"
                  type="text"
                  inputMode="tel"
                  placeholder="0.00 or 10+5+3.50"
                  className="pl-8 text-lg font-semibold h-12"
                  value={amount}
                  onChange={(e) => {
                    // Allow digits, decimal points, and + for expressions
                    const filtered = e.target.value.replace(/[^0-9.+]/g, '')
                    setAmount(filtered)
                  }}
                />
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
              <Select value={paidByMemberId} onValueChange={setPaidByMemberId}>
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
                </SelectContent>
              </Select>
            </div>

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

            {/* Custom Split */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-split">Custom split</Label>
                <Switch
                  id="custom-split"
                  checked={customSplit}
                  onCheckedChange={setCustomSplit}
                />
              </div>
              {customSplit && (
                <div className="grid gap-2 pl-1">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: member.color }}
                        />
                        <span className="text-sm">{member.name}</span>
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          £
                        </span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
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
                    </div>
                  ))}
                </div>
              )}
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
