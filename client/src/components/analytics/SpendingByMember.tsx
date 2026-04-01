import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface SpendingByMemberProps {
  data: {
    member_id: number
    member_name: string
    member_color: string
    total: number
  }[]
  currency?: string
}

function CustomBarLabel({
  x,
  y,
  width,
  value,
  currency,
}: {
  x?: number
  y?: number
  width?: number
  value?: number
  currency: string
}) {
  if (x == null || y == null || width == null || value == null) return null

  return (
    <text
      x={x + width / 2}
      y={y - 8}
      fill="hsl(var(--foreground))"
      textAnchor="middle"
      fontSize={12}
      fontWeight={500}
    >
      {formatCurrency(value, currency)}
    </text>
  )
}

export default function SpendingByMember({
  data,
  currency = '£',
}: SpendingByMemberProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Member</CardTitle>
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
        <CardTitle>Spending by Member</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 24, right: 16, left: 16, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="member_name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  formatCurrency(value, currency)
                }
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value, currency),
                  'Total',
                ]}
              />
              <Bar
                dataKey="total"
                radius={[4, 4, 0, 0]}
                label={<CustomBarLabel currency={currency} />}
              >
                {data.map((entry) => (
                  <Cell key={entry.member_id} fill={entry.member_color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
