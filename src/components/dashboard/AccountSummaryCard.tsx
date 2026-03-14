import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

type AccountSummaryCardProps = {
  account: {
    id: string
    name: string
    initialBalance: number
    externalIdentifier?: string | null
  }
  currentBalance?: number
}

export function AccountSummaryCard({
  account,
  currentBalance
}: AccountSummaryCardProps) {
  const displayBalance = currentBalance ?? account.initialBalance

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
        {account.externalIdentifier ? (
          <span className="max-w-25 truncate text-xs text-muted-foreground">
            {account.externalIdentifier}
          </span>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(displayBalance)}
        </div>
      </CardContent>
    </Card>
  )
}
