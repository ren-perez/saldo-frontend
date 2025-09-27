// app/transfers-inbox/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Search,
  Zap,
  AlertTriangle,
  Filter
} from "lucide-react";
import { PotentialTransfer, Transaction, Account } from "@/types/transfers";
import Link from "next/link";

function TransferInboxPage() {
  const { convexUser } = useConvexUser();
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
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
      console.error('Failed to pair transfers:', error);
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
      console.error('Failed to ignore transfer suggestion:', error);
    }
  };

  const handleManualMatch = () => {
    console.log('Opening manual match dialog');
    // TODO: Implement manual matching
  };

  const getMatchIcon = (matchType: string, confidence: string) => {
    if (matchType === 'exact' && confidence === 'high') {
      return <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />;
    }
    if (confidence === 'high' || confidence === 'medium') {
      return <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />;
    }
    return null;
  };

  const getMatchBadge = (matchType: string, confidence: string) => {
    if (matchType === 'exact') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">EXACT MATCH</Badge>;
    }
    if (matchType === 'close') {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">CLOSE MATCH</Badge>;
    }
    return <Badge variant="outline" className="text-xs">POSSIBLE MATCH</Badge>;
  };

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-lg text-foreground text-center">
            Please sign in to view transfers.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <InitUser />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                <span className="truncate">Transfers Inbox</span>
              </h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                Review and manage potential transfer pairs between your accounts
              </p>
            </div>
            
            {/* Mobile Action Buttons */}
            <div className="flex flex-col gap-2 sm:hidden">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Button variant="outline" size="sm" onClick={handleManualMatch} className="flex-1">
                  <Search className="h-4 w-4 mr-2" />
                  Manual Match
                </Button>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/transfers-manage" className="w-full">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Manage Transfers
                </Link>
              </Button>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/transfers-manage">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Manage Transfers
                </Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleManualMatch}>
                <Search className="h-4 w-4 mr-2" />
                Manual Match
              </Button>
            </div>
          </div>
        </div>

        {/* Summary */}
        {potentialTransfers && potentialTransfers.length > 0 && (
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {potentialTransfers?.length || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Potential Pairs</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {potentialTransfers?.filter(t => t.matchType === 'exact').length || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Exact Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {potentialTransfers?.filter(t => t.confidence === 'high').length || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">High Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Pairs */}
        {!potentialTransfers || potentialTransfers.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <ArrowRightLeft className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No Pending Transfers</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                All your transactions look good! We couldn&#39;t find any potential transfer pairs
                that need review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {potentialTransfers.map((transfer) => (
              <Card
                key={transfer.id}
                className={`border-2 transition-colors ${
                  selectedPair === transfer.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                }`}
              >
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      {getMatchIcon(transfer.matchType, transfer.confidence)}
                      <CardTitle className="text-base sm:text-lg">
                        Transfer Suggestion
                      </CardTitle>
                      {getMatchBadge(transfer.matchType, transfer.confidence)}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Score: {transfer.matchScore.toFixed(0)}%
                    </div>
                  </div>
                  <CardDescription className="text-xs sm:text-sm">
                    {transfer.daysDifference === 0 ? 'Same day' : `${Math.round(transfer.daysDifference)} day${Math.round(transfer.daysDifference) !== 1 ? 's' : ''} apart`}
                    {transfer.amountDifference > 0.01 &&
                      ` • $${transfer.amountDifference.toFixed(2)} difference`
                    }
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Outgoing Transaction */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                        <span className="truncate">OUTGOING (-${Math.abs(transfer.outgoingTransaction.amount).toFixed(2)})</span>
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800">
                        <div className="space-y-2">
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(transfer.outgoingTransaction.date).toLocaleDateString()}
                          </div>
                          <div className="font-medium text-foreground text-sm sm:text-base break-words">
                            {transfer.outgoingTransaction.description}
                          </div>
                          <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                            <span className="text-muted-foreground truncate flex-1 min-w-0">
                              {transfer.outgoingAccount.name}
                            </span>
                            <span className="font-semibold text-red-600 flex-shrink-0">
                              -${Math.abs(transfer.outgoingTransaction.amount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Incoming Transaction */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        <span className="truncate">INCOMING (+${transfer.incomingTransaction.amount.toFixed(2)})</span>
                      </div>

                      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800">
                        <div className="space-y-2">
                          <div className="text-xs sm:text-sm text-muted-foreground">
                            {new Date(transfer.incomingTransaction.date).toLocaleDateString()}
                          </div>
                          <div className="font-medium text-foreground text-sm sm:text-base break-words">
                            {transfer.incomingTransaction.description}
                          </div>
                          <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                            <span className="text-muted-foreground truncate flex-1 min-w-0">
                              {transfer.incomingAccount.name}
                            </span>
                            <span className="font-semibold text-green-600 flex-shrink-0">
                              +${transfer.incomingTransaction.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t border-border">
                    <Button
                      onClick={() => handlePairTransfers(transfer)}
                      className="flex-1 text-sm sm:text-base"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Pair Transfers
                    </Button>
                    <Button
                      onClick={() => handleIgnorePair(transfer)}
                      variant="outline"
                      className="flex-1 text-sm sm:text-base"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Ignore
                    </Button>
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