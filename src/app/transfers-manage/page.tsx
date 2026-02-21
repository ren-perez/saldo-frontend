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
import {
  ArrowRightLeft,
  Unlink,
  RotateCcw,
  CheckCircle,
  XCircle,
  ArrowRight,
  BringToFront,
} from "lucide-react";
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
import Link from "next/link";

function TransfersManagePage() {
  const { convexUser } = useConvexUser();
  const [activeTab, setActiveTab] = useState("paired");

  const pairedTransfers = useQuery(
    api.transfers.listTransferPairs,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const ignoredTransfers = useQuery(
    api.transfers.listIgnoredTransferPairs,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const unpairTransfers = useMutation(api.transfers.unpairTransfers);
  const unignoreTransferSuggestion = useMutation(api.transfers.unignoreTransferSuggestion);

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
    <AppLayout>
      <InitUser />
      <div className="container mx-auto py-6 px-6">

        {/* ── Row 1: Title ── */}
        <div className="flex items-center gap-2 mb-4">
          <BringToFront className="h-7 w-7 text-primary flex-shrink-0" />
          <h1 className="text-2xl font-bold tracking-tight">Manage Transfers</h1>
        </div>

        {/* ── Row 2: CTAs ── */}
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" asChild className="ml-auto">
            <Link href="/transfers-inbox">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              Review Inbox
            </Link>
          </Button>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="paired" className="flex items-center gap-1.5 text-sm">
              <CheckCircle className="h-3.5 w-3.5" />
              Paired
              <span className="text-xs text-muted-foreground">({pairedTransfers?.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="ignored" className="flex items-center gap-1.5 text-sm">
              <XCircle className="h-3.5 w-3.5" />
              Ignored
              <span className="text-xs text-muted-foreground">({ignoredTransfers?.length || 0})</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Paired Transfers ── */}
          <TabsContent value="paired" className="space-y-4">
            {!pairedTransfers || pairedTransfers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-14 w-14 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-base font-medium mb-1">No Paired Transfers</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You haven&#39;t paired any transfers yet. Review pending suggestions to get started.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/transfers-inbox">Review Pending Transfers</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              pairedTransfers.map((pair) => (
                <Card key={pair.transferPairId} className="border transition-colors">
                  <CardContent className="px-4">
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paired
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(pair.createdAt).toLocaleDateString()}
                      </span>

                      {/* Unpair action inline */}
                      <div className="ml-auto">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" className="hover:border-destructive/20 hover:text-destructive hover:bg-destructive/10">
                              <Unlink className="h-4 w-4 mr-1" />
                              Unpair
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unpair Transfer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will unlink these transactions and remove their transfer status. The transactions will remain in your account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleUnpairTransfers(pair.transferPairId)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Unpair
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Transaction row */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                      {/* Outgoing */}
                      {pair.outgoingTransaction && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                            <span className="text-xs font-medium text-red-600/90 dark:text-red-400/90 uppercase tracking-wide">Out</span>
                            <span className="ml-auto font-semibold text-red-600/90 dark:text-red-400/90 text-sm">
                              −${Math.abs(pair.outgoingTransaction.amount).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground/90 leading-tight line-clamp-1">
                            {pair.outgoingTransaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Account {pair.outgoingTransaction.accountId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pair.outgoingTransaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                      {/* Incoming */}
                      {pair.incomingTransaction && (
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            <span className="text-xs font-medium text-green-600/90 dark:text-green-400/90 uppercase tracking-wide">In</span>
                            <span className="ml-auto font-semibold text-green-600/90 dark:text-green-400/90 text-sm">
                              +${pair.incomingTransaction.amount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground/90 leading-tight line-clamp-1">
                            {pair.incomingTransaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Account {pair.incomingTransaction.accountId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pair.incomingTransaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Ignored Transfers ── */}
          <TabsContent value="ignored" className="space-y-4">
            {!ignoredTransfers || ignoredTransfers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <XCircle className="h-14 w-14 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-base font-medium mb-1">No Ignored Suggestions</h3>
                  <p className="text-sm text-muted-foreground">
                    You haven&#39;t ignored any transfer suggestions yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              ignoredTransfers.map((ignored) => (
                <Card key={ignored.id} className="border hover:border-orange-400 dark:hover:border-orange-700 transition-colors">
                  <CardContent className="px-4">
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Ignored
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ignored.ignoredAt).toLocaleDateString()}
                      </span>

                      {/* Restore action inline */}
                      <Button
                        variant="outline"
                        className="ml-auto"
                        onClick={() => handleUnignoreTransfer(
                          ignored.outgoingTransaction._id,
                          ignored.incomingTransaction._id
                        )}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>

                    {/* Transaction row */}
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center opacity-75">
                      {/* Outgoing */}
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          <span className="text-xs font-medium text-red-600/90 dark:text-red-400/90 uppercase tracking-wide">Out</span>
                          <span className="ml-auto font-semibold text-red-600/90 dark:text-red-400/90 text-sm">
                            −${Math.abs(ignored.outgoingTransaction.amount).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground/90 leading-tight line-clamp-1">
                          {ignored.outgoingTransaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {ignored.outgoingAccount?.name || "Unknown Account"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ignored.outgoingTransaction.date).toLocaleDateString()}
                        </p>
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                      {/* Incoming */}
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/40 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          <span className="text-xs font-medium text-green-600/90 dark:text-green-400/90 uppercase tracking-wide">In</span>
                          <span className="ml-auto font-semibold text-green-600/90 dark:text-green-400/90 text-sm">
                            +${ignored.incomingTransaction.amount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground/90 leading-tight line-clamp-1">
                          {ignored.incomingTransaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {ignored.incomingAccount?.name || "Unknown Account"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ignored.incomingTransaction.date).toLocaleDateString()}
                        </p>
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
  );
}

export default TransfersManagePage;