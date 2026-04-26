"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import { Id } from "../../../convex/_generated/dataModel";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualMatchDialog } from "@/components/ManualMatchDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  AlertTriangle,
  Zap,
  Unlink,
  RotateCcw,
} from "lucide-react";
import { PotentialTransfer } from "@/types/transfers";

export default function TransfersPage() {
  const { convexUser } = useConvexUser();
  const [activeTab, setActiveTab] = useState("pending");
  const [showFilters, setShowFilters] = useState(false);
  const [showManualMatch, setShowManualMatch] = useState(false);

  // Queries
  const potentialTransfers = useQuery(
    api.transfers.getPotentialTransfers,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const pairedTransfers = useQuery(
    api.transfers.listTransferPairs,
    convexUser ? { userId: convexUser._id } : "skip"
  );
  const ignoredTransfers = useQuery(
    api.transfers.listIgnoredTransferPairs,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Mutations
  const pairTransfers = useMutation(api.transfers.pairTransfers);
  const ignoreTransferSuggestion = useMutation(api.transfers.ignoreTransferSuggestion);
  const unpairTransfers = useMutation(api.transfers.unpairTransfers);
  const unignoreTransferSuggestion = useMutation(api.transfers.unignoreTransferSuggestion);

  // Handlers
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

  const handleUnpairTransfers = async (transferPairId: string) => {
    if (!convexUser) return;
    try {
      await unpairTransfers({ userId: convexUser._id, transferPairId });
    } catch (error) {
      console.error("Failed to unpair transfers:", error);
    }
  };

  const handleUnignoreTransfer = async (
    outgoingTxId: Id<"transactions">,
    incomingTxId: Id<"transactions">
  ) => {
    if (!convexUser) return;
    try {
      await unignoreTransferSuggestion({
        userId: convexUser._id,
        outgoingTransactionId: outgoingTxId,
        incomingTransactionId: incomingTxId,
      });
    } catch (error) {
      console.error("Failed to restore transfer suggestion:", error);
    }
  };

  // Helpers
  const getMatchIcon = (matchType: string, confidence: string) => {
    if (matchType === "exact" && confidence === "high")
      return <Zap className="h-3.5 w-3.5 text-muted-foreground" />;
    if (confidence === "high" || confidence === "medium")
      return <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />;
    return null;
  };

  const getMatchBadge = (matchType: string) => {
    if (matchType === "exact") return <Badge variant="secondary" className="text-xs font-medium">Exact</Badge>;
    if (matchType === "close") return <Badge variant="secondary" className="text-xs font-medium">Close</Badge>;
    return <Badge variant="outline" className="text-xs font-medium">Possible</Badge>;
  };

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-lg text-foreground text-center">Please sign in to manage transfers.</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <AppLayout>
        <InitUser />
        <div className="container mx-auto py-8 px-6 max-w-5xl">
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* ── Header & Navigation ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto bg-muted/40 border border-border">
                <TabsTrigger value="pending" className="flex items-center gap-2 text-sm font-medium">
                  Pending review
                  <span className="text-xs text-muted-foreground">({potentialTransfers?.length || 0})</span>
                </TabsTrigger>
                <TabsTrigger value="paired" className="flex items-center gap-2 text-sm font-medium">
                  Paired
                  <span className="text-xs text-muted-foreground">({pairedTransfers?.length || 0})</span>
                </TabsTrigger>
                <TabsTrigger value="ignored" className="flex items-center gap-2 text-sm font-medium">
                  Ignored
                  <span className="text-xs text-muted-foreground">({ignoredTransfers?.length || 0})</span>
                </TabsTrigger>
              </TabsList>

              {activeTab === "pending" && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto">
                    <Filter className="h-4 w-4 mr-1.5" />
                    Filters
                  </Button>
                  <Button variant="outline" onClick={() => setShowManualMatch(true)} className="w-full sm:w-auto">
                    <Search className="h-4 w-4 mr-1.5" />
                    Manual match
                  </Button>
                </div>
              )}
            </div>

            {/* ── Pending Transfers Tab ── */}
            <TabsContent value="pending" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
              {potentialTransfers && potentialTransfers.length > 0 && (
                <div className="flex items-center gap-6 px-4 py-3 rounded-lg bg-muted/30 border border-border text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{potentialTransfers.length}</span> potential pairs
                  </span>
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {potentialTransfers.filter((t) => t.matchType === "exact").length}
                    </span>{" "}
                    exact matches
                  </span>
                </div>
              )}

              {!potentialTransfers || potentialTransfers.length === 0 ? (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-10 text-center">
                    <ArrowRightLeft className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4 stroke-[1.5]" />
                    <h3 className="text-lg font-semibold mb-1">No pending transfers</h3>
                    <p className="text-sm text-muted-foreground">
                      Your transactions are fully categorized. There are no pairs requiring review.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {potentialTransfers.map((transfer) => (
                    <Card key={transfer.id} className="border-border shadow-sm hover:border-muted-foreground/30 transition-colors duration-150">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          {getMatchIcon(transfer.matchType, transfer.confidence)}
                          {getMatchBadge(transfer.matchType)}
                          <span className="text-xs text-muted-foreground">
                            {transfer.daysDifference === 0
                              ? "Same day"
                              : `${Math.round(transfer.daysDifference)}d apart`}
                            {transfer.amountDifference > 0.01 &&
                              ` • $${transfer.amountDifference.toFixed(2)} diff`}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground ml-auto mr-4">
                            {transfer.matchScore.toFixed(0)}% match
                          </span>
                          <Button onClick={() => handlePairTransfers(transfer)} size="sm">
                            Pair transfer
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleIgnorePair(transfer)}
                          >
                            Ignore
                          </Button>
                        </div>

                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                          <div className="bg-muted/30 border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Out</span>
                              <span className="font-medium text-foreground text-sm">
                                ${Math.abs(transfer.outgoingTransaction.amount).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {transfer.outgoingTransaction.description}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{transfer.outgoingAccount.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transfer.outgoingTransaction.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                          <div className="bg-muted/30 border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In</span>
                              <span className="font-medium text-foreground text-sm">
                                ${transfer.incomingTransaction.amount.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {transfer.incomingTransaction.description}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{transfer.incomingAccount.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transfer.incomingTransaction.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── Paired Transfers Tab ── */}
            <TabsContent value="paired" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
              {!pairedTransfers || pairedTransfers.length === 0 ? (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-10 text-center">
                    <CheckCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4 stroke-[1.5]" />
                    <h3 className="text-lg font-semibold mb-1">No paired transfers</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      You haven&apos;t allocated any transfer movements yet.
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab("pending")}>
                      Review pending transfers
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                pairedTransfers.map((pair) => (
                  <Card key={pair.transferPairId} className="border-border shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant="secondary" className="text-xs font-medium">
                          <CheckCircle className="h-3 w-3 mr-1.5" />
                          Paired
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(pair.createdAt).toLocaleDateString()}
                        </span>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground hover:text-foreground">
                              <Unlink className="h-4 w-4 mr-1.5" />
                              Unpair
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-md rounded-xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unpair this transfer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will separate the transactions. They will remain in your account and return to the pending review queue if they match again.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUnpairTransfers(pair.transferPairId)}
                                className="rounded-lg"
                              >
                                Unpair transfer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                        {pair.outgoingTransaction && (
                          <div className="bg-muted/30 border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Out</span>
                              <span className="font-medium text-foreground text-sm">
                                ${Math.abs(pair.outgoingTransaction.amount).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {pair.outgoingTransaction.description}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">Account {pair.outgoingTransaction.accountId}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(pair.outgoingTransaction.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}

                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                        {pair.incomingTransaction && (
                          <div className="bg-muted/30 border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In</span>
                              <span className="font-medium text-foreground text-sm">
                                ${pair.incomingTransaction.amount.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {pair.incomingTransaction.description}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">Account {pair.incomingTransaction.accountId}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(pair.incomingTransaction.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* ── Ignored Transfers Tab ── */}
            <TabsContent value="ignored" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
              {!ignoredTransfers || ignoredTransfers.length === 0 ? (
                <Card className="border-border shadow-sm">
                  <CardContent className="p-10 text-center">
                    <XCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4 stroke-[1.5]" />
                    <h3 className="text-lg font-semibold mb-1">No ignored suggestions</h3>
                    <p className="text-sm text-muted-foreground">
                      Transfers you choose to bypass will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                ignoredTransfers.map((ignored) => (
                  <Card key={ignored.id} className="border-border shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant="outline" className="text-xs font-medium">
                          Ignored
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ignored.ignoredAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-muted-foreground hover:text-foreground"
                          onClick={() => handleUnignoreTransfer(
                            ignored.outgoingTransaction._id,
                            ignored.incomingTransaction._id
                          )}
                        >
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                          Restore suggestion
                        </Button>
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                        <div className="bg-muted/20 border border-border rounded-lg p-4 grayscale-[0.5]">
                           <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Out</span>
                              <span className="font-medium text-foreground text-sm">
                                ${Math.abs(ignored.outgoingTransaction.amount).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {ignored.outgoingTransaction.description}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{ignored.outgoingAccount?.name || "Unknown Account"}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(ignored.outgoingTransaction.date).toLocaleDateString()}
                              </p>
                            </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                        <div className="bg-muted/20 border border-border rounded-lg p-4 grayscale-[0.5]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In</span>
                              <span className="font-medium text-foreground text-sm">
                                ${ignored.incomingTransaction.amount.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-foreground leading-tight truncate">
                              {ignored.incomingTransaction.description}
                            </p>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{ignored.incomingAccount?.name || "Unknown Account"}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(ignored.incomingTransaction.date).toLocaleDateString()}
                              </p>
                            </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </AppLayout>

      <ManualMatchDialog open={showManualMatch} onOpenChange={setShowManualMatch} />
    </>
  );
}