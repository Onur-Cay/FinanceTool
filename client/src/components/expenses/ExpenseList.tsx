import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Heart,
  GraduationCap,
  Plane,
  Gift,
  Music,
  Smartphone,
  Shirt,
  Dumbbell,
  Baby,
  PawPrint,
  Fuel,
  Bus,
  Wifi,
  Tv,
  Coffee,
  Briefcase,
  Wrench,
  Pill,
  Landmark,
  Receipt,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Expense } from '@/lib/types'
import { cn, formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const iconMap: Record<string, LucideIcon> = {
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  home: Home,
  zap: Zap,
  heart: Heart,
  'graduation-cap': GraduationCap,
  plane: Plane,
  gift: Gift,
  music: Music,
  smartphone: Smartphone,
  shirt: Shirt,
  dumbbell: Dumbbell,
  baby: Baby,
  'paw-print': PawPrint,
  fuel: Fuel,
  bus: Bus,
  wifi: Wifi,
  tv: Tv,
  coffee: Coffee,
  briefcase: Briefcase,
  wrench: Wrench,
  pill: Pill,
  landmark: Landmark,
  receipt: Receipt,
}

function getCategoryIcon(iconName?: string): LucideIcon {
  if (!iconName) return Receipt
  return iconMap[iconName] || Receipt
}

interface ExpenseListProps {
  expenses: Expense[]
  currency?: string
  onEdit: (expense: Expense) => void
  onDelete: (id: number) => void
}

interface GroupedExpenses {
  date: string
  label: string
  expenses: Expense[]
}

export function ExpenseList({ expenses, currency = '£', onEdit, onDelete }: ExpenseListProps) {
  const grouped = useMemo<GroupedExpenses[]>(() => {
    const groups: Record<string, Expense[]> = {}

    for (const expense of expenses) {
      const dateKey = expense.date
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(expense)
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        label: format(parseISO(date), 'EEEE, d MMMM yyyy'),
        expenses: items,
      }))
  }, [expenses])

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No expenses yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2 px-1">
            {group.label}
          </h3>
          <Card>
            <div className="divide-y">
              {group.expenses.map((expense) => {
                const Icon = getCategoryIcon(expense.category_icon)
                const primaryShare = expense.shares?.[0]

                return (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onEdit(expense)}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {expense.sub_category_name || 'Uncategorized'}
                        </p>
                      </div>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {expense.description}
                        </p>
                      )}
                      {primaryShare && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="inline-block h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: primaryShare.member_color || '#888' }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {primaryShare.member_name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">
                        {formatCurrency(expense.amount, currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(expense.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}
