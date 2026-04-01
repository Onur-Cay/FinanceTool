import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import * as LucideIcons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

function CategoryIcon({ name }: { name: string }) {
  const pascalCase = name
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
  const Icon = (LucideIcons as Record<string, any>)[pascalCase]
  if (!Icon) return null
  return <Icon className="h-3.5 w-3.5 shrink-0" />
}

const COLORS = [
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#ef4444', // red
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#d946ef', // fuchsia
]

interface SpendingByCategoryProps {
  data: {
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
  currency?: string
}

export default function SpendingByCategory({
  data,
  currency = '£',
}: SpendingByCategoryProps) {
  const grandTotal = data.reduce((sum, item) => sum + item.total, 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No spending data available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="total"
                nameKey="category_name"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value, currency)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-3">
          {data.map((item, index) => {
            const percentage =
              grandTotal > 0
                ? ((item.total / grandTotal) * 100).toFixed(1)
                : '0.0'

            return (
              <div key={item.category_id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="text-sm flex items-center gap-1.5">
                      <CategoryIcon name={item.category_icon} />
                      {item.category_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatCurrency(item.total, currency)}
                    </span>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {item.sub_categories.length > 0 && (
                  <div className="ml-7 mt-1 space-y-1">
                    {item.sub_categories.map((sub) => (
                      <div
                        key={sub.sub_category_id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span>{sub.sub_category_name}</span>
                        <span>{formatCurrency(sub.total, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
