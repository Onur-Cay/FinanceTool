import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'

interface MemberBalanceProps {
  balances: {
    member_id: number
    member_name: string
    member_color: string
    total_paid: number
    fair_share: number
    balance: number
  }[]
  currency?: string
  onSettleUp: () => void
}

interface Settlement {
  from: string
  to: string
  amount: number
}

function calculateSettlements(
  balances: MemberBalanceProps['balances']
): Settlement[] {
  const settlements: Settlement[] = []

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ name: b.member_name, amount: Math.abs(b.balance) }))
    .sort((a, b) => b.amount - a.amount)

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ name: b.member_name, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount)

  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const payment = Math.min(debtors[i].amount, creditors[j].amount)

    if (payment > 0.01) {
      settlements.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: payment,
      })
    }

    debtors[i].amount -= payment
    creditors[j].amount -= payment

    if (debtors[i].amount < 0.01) i++
    if (creditors[j].amount < 0.01) j++
  }

  return settlements
}

export default function MemberBalance({
  balances,
  currency = '£',
  onSettleUp,
}: MemberBalanceProps) {
  const settlements = calculateSettlements(balances)

  if (balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No balance data available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Member Balances</CardTitle>
          <Button size="sm" onClick={onSettleUp}>
            Settle Up
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {balances.map((member) => (
            <div
              key={member.member_id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: member.member_color }}
                />
                <div>
                  <p className="text-sm font-medium">{member.member_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Paid {formatCurrency(member.total_paid, currency)} / Fair
                    share {formatCurrency(member.fair_share, currency)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    member.balance > 0.01 && 'text-emerald-600',
                    member.balance < -0.01 && 'text-red-600',
                    Math.abs(member.balance) <= 0.01 && 'text-muted-foreground'
                  )}
                >
                  {member.balance > 0.01
                    ? `+${formatCurrency(member.balance, currency)}`
                    : member.balance < -0.01
                      ? `-${formatCurrency(Math.abs(member.balance), currency)}`
                      : 'Settled'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.balance > 0.01
                    ? 'is owed'
                    : member.balance < -0.01
                      ? 'owes'
                      : ''}
                </p>
              </div>
            </div>
          ))}
        </div>

        {settlements.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">To settle up:</h4>
            <div className="space-y-2">
              {settlements.map((settlement, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{settlement.from}</span>
                    {' owes '}
                    <span className="font-medium">{settlement.to}</span>
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(settlement.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
