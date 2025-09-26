// components/TransfersDashboardCard.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";

interface TransfersDashboardCardProps {
  pendingTransferCount: number;
  className?: string;
}

export default function TransfersDashboardCard({
  pendingTransferCount,
  className = ""
}: TransfersDashboardCardProps) {
  if (pendingTransferCount === 0) {
    return null;
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Pending Transfers</CardTitle>
          </div>
          <Badge
            variant="secondary"
            className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
          >
            {pendingTransferCount}
          </Badge>
        </div>
        <CardDescription>
          Potential transfer pairs found that need your review
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {pendingTransferCount} pair{pendingTransferCount !== 1 ? 's' : ''} waiting
          </span>
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(pendingTransferCount, 10) }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary opacity-80"
              />
            ))}
            {pendingTransferCount > 10 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{pendingTransferCount - 10}
              </span>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button asChild className="w-full" variant="default">
            <Link href="/transfers-inbox">
              Review Transfers
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}