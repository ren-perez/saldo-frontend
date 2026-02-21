"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Search,
  Zap,
  AlertTriangle,
  Filter,
  Info,
  ArrowRight,
  BringToFront,
} from "lucide-react";
import { PotentialTransfer } from "@/types/transfers";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function TransferInboxPage() {
  const { convexUser } = useConvexUser();
  const [showFilters, setShowFilters] = useState(false);

  const potentialTransfers = useQuery(
    api.transfers.getPotentialTransfers,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const pairTransfers = useMutation(api.transfers.pairTransfers);
  const ignoreTransferSuggestion = useMutation(api.transfers.ignoreTransferSuggestion);

  const handlePairTransfers = async (transfer: PotentialTransfer) => {
    if (!convexUser) return;
    try {
      await pairTransfers({
        userId: convexUser._id,
        outgoingTransactionId: transfer.outgoingTransaction._id,
        incomingTransactionId: transfer.incomingTransaction._id,
      });
    } catch (error) {
      console.error("Failed to pair transfers:", error);
    }
  };

  const handleIgnorePair = async (transfer: PotentialTransfer) => {
    if (!convexUser) return;
    try {
      await ignoreTransferSuggestion({
        userId: convexUser._id,
        outgoingTransactionId: transfer.outgoingTransaction._id,
        incomingTransactionId: transfer.incomingTransaction._id,
      });
    } catch (error) {
      console.error("Failed to ignore transfer suggestion:", error);
    }
  };

  const getMatchIcon = (matchType: string, confidence: string) => {
    if (matchType === "exact" && confidence === "high")
      return <Zap className="h-3.5 w-3.5 text-green-500" />;
    if (confidence === "high" || confidence === "medium")
      return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
    return null;
  };

  const getMatchBadge = (matchType: string) => {
    if (matchType === "exact")
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Exact</Badge>;
    if (matchType === "close")
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">Close</Badge>;
    return <Badge variant="outline" className="text-xs">Possible</Badge>;
  };

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-lg text-foreground text-center">Please sign in to view transfers.</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <InitUser />
      <div className="container mx-auto py-6 px-6">

        {/* ── Row 1: Title ── */}
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="h-7 w-7 text-primary flex-shrink-0" />
          <h1 className="text-2xl font-bold tracking-tight">Transfers Inbox</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help ml-0.5" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Review and manage potential transfer pairs between your accounts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* ── Row 2: CTAs ── */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-1.5" />
            Filters
          </Button>
          <Button variant="outline" onClick={() => console.log("Opening manual match dialog")}>
            <Search className="h-4 w-4 mr-1.5" />
            Manual Match
          </Button>
          <Button variant="outline" asChild className="ml-auto">
            <Link href="/transfers-manage">
              <BringToFront className="h-4 w-4 mr-1.5" />
              Manage Transfers
            </Link>
          </Button>
        </div>

        {/* ── Summary bar ── */}
        {potentialTransfers && potentialTransfers.length > 0 && (
          <div className="flex items-center gap-6 mb-5 px-4 py-3 rounded-lg bg-muted/50 border border-border text-sm">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{potentialTransfers.length}</span> potential pairs
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-green-600">
                {potentialTransfers.filter((t) => t.matchType === "exact").length}
              </span>{" "}
              exact matches
            </span>
            <span className="text-muted-foreground">
              <span className="font-semibold text-orange-600">
                {potentialTransfers.filter((t) => t.confidence === "high").length}
              </span>{" "}
              high confidence
            </span>
          </div>
        )}

        {/* ── Transfer Pairs ── */}
        {!potentialTransfers || potentialTransfers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ArrowRightLeft className="h-14 w-14 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-base font-medium mb-1">No Pending Transfers</h3>
              <p className="text-sm text-muted-foreground">
                All your transactions look good! We couldn&#39;t find any potential transfer pairs that need review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {potentialTransfers.map((transfer) => (
              <Card key={transfer.id} className="border hover:border-muted-foreground/40 transition-colors">
                <CardContent className="px-4">
                  {/* Top row: badge + meta + score + actions */}
                  <div className="flex items-center gap-2 mb-3">
                    {getMatchIcon(transfer.matchType, transfer.confidence)}
                    {getMatchBadge(transfer.matchType)}
                    <span className="text-xs text-muted-foreground">
                      {transfer.daysDifference === 0
                        ? "Same day"
                        : `${Math.round(transfer.daysDifference)}d apart`}
                      {transfer.amountDifference > 0.01 &&
                        ` • $${transfer.amountDifference.toFixed(2)} diff`}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto mr-3">
                      {transfer.matchScore.toFixed(0)}% match
                    </span>
                    {/* Inline actions */}
                    <Button className="" onClick={() => handlePairTransfers(transfer)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Pair
                    </Button>
                    <Button
                      variant="outline"
                      className="hover:border-destructive/20 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleIgnorePair(transfer)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Ignore
                    </Button>
                  </div>

                  {/* Transaction row: outgoing → incoming */}
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    {/* Outgoing */}
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        <span className="text-xs font-medium text-red-600/90 dark:text-red-400/90 uppercase tracking-wide">Out</span>
                        <span className="ml-auto font-semibold text-red-600/90 dark:text-red-400/90 text-sm">
                          −${Math.abs(transfer.outgoingTransaction.amount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground/90 leading-tight line-clamp-1">
                        {transfer.outgoingTransaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{transfer.outgoingAccount.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transfer.outgoingTransaction.date).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                    {/* Incoming */}
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-xs font-medium text-green-600/90 dark:text-green-400/90 uppercase tracking-wide">In</span>
                        <span className="ml-auto font-semibold text-green-600/90 dark:text-green-400/90 text-sm">
                          +${transfer.incomingTransaction.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground/90 leading-tight line-clamp-1">
                        {transfer.incomingTransaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{transfer.incomingAccount.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transfer.incomingTransaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default TransferInboxPage;