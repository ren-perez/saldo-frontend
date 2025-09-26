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
      return <Zap className="h-4 w-4 text-green-500" />;
    }
    if (confidence === 'high' || confidence === 'medium') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    return null;
  };

  const getMatchBadge = (matchType: string, confidence: string) => {
    if (matchType === 'exact') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">EXACT MATCH</Badge>;
    }
    if (matchType === 'close') {
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">CLOSE MATCH</Badge>;
    }
    return <Badge variant="outline">POSSIBLE MATCH</Badge>;
  };

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-foreground">
            Please sign in to view transfers.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <InitUser />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <ArrowRightLeft className="h-8 w-8 text-primary" />
                Transfers Inbox
              </h1>
              <p className="text-muted-foreground mt-2">
                Review and manage potential transfer pairs between your accounts
              </p>
            </div>
            <div className="flex gap-2">
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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {potentialTransfers?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Potential Pairs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {potentialTransfers?.filter(t => t.matchType === 'exact').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Exact Matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {potentialTransfers?.filter(t => t.confidence === 'high').length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">High Confidence</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Pairs */}
        {!potentialTransfers || potentialTransfers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ArrowRightLeft className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Pending Transfers</h3>
              <p className="text-muted-foreground">
                All your transactions look good! We couldn't find any potential transfer pairs
                that need review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {potentialTransfers.map((transfer) => (
              <Card
                key={transfer.id}
                className={`border-2 transition-colors ${
                  selectedPair === transfer.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-muted-foreground/30'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getMatchIcon(transfer.matchType, transfer.confidence)}
                      <CardTitle className="text-lg">
                        Transfer Suggestion
                      </CardTitle>
                      {getMatchBadge(transfer.matchType, transfer.confidence)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Score: {transfer.matchScore.toFixed(0)}%
                    </div>
                  </div>
                  <CardDescription>
                    {transfer.daysDifference === 0 ? 'Same day' : `${Math.round(transfer.daysDifference)} day${Math.round(transfer.daysDifference) !== 1 ? 's' : ''} apart`}
                    {transfer.amountDifference > 0.01 &&
                      ` • $${transfer.amountDifference.toFixed(2)} difference`
                    }
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Outgoing Transaction */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        OUTGOING (-${Math.abs(transfer.outgoingTransaction.amount).toFixed(2)})
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            {new Date(transfer.outgoingTransaction.date).toLocaleDateString()}
                          </div>
                          <div className="font-medium text-foreground">
                            {transfer.outgoingTransaction.description}
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              {transfer.outgoingAccount.name}
                            </span>
                            <span className="font-semibold text-red-600">
                              -${Math.abs(transfer.outgoingTransaction.amount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Incoming Transaction */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        INCOMING (+${transfer.incomingTransaction.amount.toFixed(2)})
                      </div>

                      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            {new Date(transfer.incomingTransaction.date).toLocaleDateString()}
                          </div>
                          <div className="font-medium text-foreground">
                            {transfer.incomingTransaction.description}
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              {transfer.incomingAccount.name}
                            </span>
                            <span className="font-semibold text-green-600">
                              +${transfer.incomingTransaction.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                    <Button
                      onClick={() => handlePairTransfers(transfer)}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Pair Transfers
                    </Button>
                    <Button
                      onClick={() => handleIgnorePair(transfer)}
                      variant="outline"
                      className="flex-1"
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