import * as LucideIcons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn, formatCurrency } from '@/lib/utils'

function CategoryIcon({ name }: { name: string }) {
  const pascalCase = name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  const Icon = (LucideIcons as Record<string, any>)[pascalCase]
  if (!Icon) return null
  return <Icon className="h-3.5 w-3.5 shrink-0" />
}

interface BudgetProgressProps {
  limits: {
    id: number
    category_id: number
    category_name: string
    category_icon: string
    monthly_limit: number
    spent: number
  }[]
  currency?: string
}

export default function BudgetProgress({
  limits,
  currency = '£',
}: BudgetProgressProps) {
  if (limits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No budget limits set.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {limits.map((limit) => {
            const percentage =
              limit.monthly_limit > 0
                ? (limit.spent / limit.monthly_limit) * 100
                : 0
            const isOverBudget = percentage > 100
            const displayPercentage = Math.min(percentage, 100)

            return (
              <div key={limit.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon name={limit.category_icon} />
                    <span className="text-sm font-medium">
                      {limit.category_name}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      isOverBudget
                        ? 'font-semibold text-red-600'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatCurrency(limit.spent, currency)} /{' '}
                    {formatCurrency(limit.monthly_limit, currency)}
                  </span>
                </div>

                <div className="relative">
                  <Progress
                    value={displayPercentage}
                    className={cn('h-2.5', isOverBudget && '[&>div]:bg-red-600')}
                  />
                </div>

                <div className="flex justify-end">
                  <span
                    className={cn(
                      'text-xs',
                      isOverBudget
                        ? 'font-medium text-red-600'
                        : 'text-muted-foreground'
                    )}
                  >
                    {percentage.toFixed(0)}%
                    {isOverBudget && ' — Over budget!'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
