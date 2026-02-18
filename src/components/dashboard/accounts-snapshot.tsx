"use client"

import { Landmark } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { currencyExact } from "@/lib/format"

type Account = {
  _id: string
  name: string
  type: string
  bank: string
  balance?: number
}

interface AccountsSnapshotProps {
  accounts: Account[]
}

export function AccountsSnapshot({ accounts }: AccountsSnapshotProps) {
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Accounts</CardTitle>
          <p className="text-2xl font-semibold text-foreground mt-1">
            {currencyExact(totalBalance)}
          </p>
        </div>
        <Landmark className="size-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <div
              key={account._id}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{account.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{account.bank}</span>
                  <span className="text-sm text-muted-foreground capitalize">{account.type}</span>
                </div>
              </div>
              <span className={`text-sm font-semibold tabular-nums ${(account.balance ?? 0) < 0 ? "text-destructive" : "text-foreground"}`}>
                {currencyExact(account.balance ?? 0)}
              </span>
            </div>
          ))}
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No accounts yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
