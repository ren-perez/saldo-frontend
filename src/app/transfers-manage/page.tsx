// app/transfers-manage/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "../../hooks/useConvexUser";
import { Id } from "../../../convex/_generated/dataModel"; // adjust path if needed
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import {
  Card, CardContent,
  // CardDescription, 
  // CardTitle,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRightLeft,
  Unlink,
  RotateCcw,
  // Trash2,
  CheckCircle,
  XCircle,
  Calendar
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
      await unpairTransfers({
        userId: convexUser._id,
        transferPairId,
      });
    } catch (error) {
      console.error('Failed to unpair transfers:', error);
    }
  };

  // const handleUnpairTransfers = async (transferPairId: Id<"transfer_pairs">) => {
  //   if (!convexUser) return;

  //   try {
  //     await unpairTransfers({
  //       userId: convexUser._id,
  //       transferPairId,
  //     });
  //   } catch (error) {
  //     console.error("Failed to unpair transfers:", error);
  //   }
  // };



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


  // const handleUnignoreTransfer = async (outgoingTxId: string, incomingTxId: string) => {
  //   if (!convexUser) return;

  //   try {
  //     await unignoreTransferSuggestion({
  //       userId: convexUser._id,
  //       outgoingTransactionId: outgoingTxId,
  //       incomingTransactionId: incomingTxId,
  //     });
  //   } catch (error) {
  //     console.error('Failed to restore transfer suggestion:', error);
  //   }
  // };

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 px-4">
          <div className="text-lg text-foreground text-center">
            Please sign in to manage transfers.
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
                <span className="truncate">Manage Transfers</span>
              </h1>
              <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
                View and manage your paired and ignored transfer suggestions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link href="/transfers-inbox">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review New
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="paired" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-center">
                <span className="block sm:inline">Paired Transfers</span>
                <span className="block sm:inline sm:ml-1">({pairedTransfers?.length || 0})</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="ignored" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-2 sm:p-3 text-xs sm:text-sm">
              <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-center">
                <span className="block sm:inline">Ignored Suggestions</span>
                <span className="block sm:inline sm:ml-1">({ignoredTransfers?.length || 0})</span>
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Paired Transfers Tab */}
          <TabsContent value="paired" className="space-y-4 sm:space-y-6">
            {!pairedTransfers || pairedTransfers.length === 0 ? (
              <Card>
                <CardContent className="p-6 sm:p-8 text-center">
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">No Paired Transfers</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4">
                    You haven&#39;t paired any transfers yet. Review pending suggestions to get started.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/transfers-inbox">
                      Review Pending Transfers
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pairedTransfers.map((pair) => (
                  <Card key={pair.transferPairId} className="border-2 border-green-200 dark:border-green-800">
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paired Transfer
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          {new Date(pair.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Outgoing Transaction */}
                        {pair.outgoingTransaction && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                              <span className="truncate">OUTGOING (-${Math.abs(pair.outgoingTransaction.amount).toFixed(2)})</span>
                            </div>

                            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800">
                              <div className="space-y-2">
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  {new Date(pair.outgoingTransaction.date).toLocaleDateString()}
                                </div>
                                <div className="font-medium text-foreground text-sm sm:text-base break-words">
                                  {pair.outgoingTransaction.description}
                                </div>
                                <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                                  <span className="text-muted-foreground truncate flex-1 min-w-0">
                                    Account (ID: {pair.outgoingTransaction.accountId})
                                  </span>
                                  <span className="font-semibold text-red-600 flex-shrink-0">
                                    -${Math.abs(pair.outgoingTransaction.amount).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Incoming Transaction */}
                        {pair.incomingTransaction && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                              <span className="truncate">INCOMING (+${pair.incomingTransaction.amount.toFixed(2)})</span>
                            </div>

                            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800">
                              <div className="space-y-2">
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  {new Date(pair.incomingTransaction.date).toLocaleDateString()}
                                </div>
                                <div className="font-medium text-foreground text-sm sm:text-base break-words">
                                  {pair.incomingTransaction.description}
                                </div>
                                <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                                  <span className="text-muted-foreground truncate flex-1 min-w-0">
                                    Account (ID: {pair.incomingTransaction.accountId})
                                  </span>
                                  <span className="font-semibold text-green-600 flex-shrink-0">
                                    +${pair.incomingTransaction.amount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 mt-4 sm:mt-6 pt-4 border-t border-border">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex-1 text-xs sm:text-sm">
                              <Unlink className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Unpair Transfer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4 max-w-md sm:max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base sm:text-lg">Unpair Transfer?</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm sm:text-base">
                                {"This will unlink these transactions and remove their \"transfer\" status."}
                                The transactions will remain in your account but will no longer be
                                treated as a transfer pair.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Ignored Transfers Tab */}
          <TabsContent value="ignored" className="space-y-4 sm:space-y-6">
            {!ignoredTransfers || ignoredTransfers.length === 0 ? (
              <Card>
                <CardContent className="p-6 sm:p-8 text-center">
                  <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">No Ignored Suggestions</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    You haven&#39;t ignored any transfer suggestions yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ignoredTransfers.map((ignored) => (
                  <Card key={ignored.id} className="border-2 border-orange-200 dark:border-orange-800">
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Ignored Suggestion
                          </Badge>
                        </div>
                        <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Ignored {new Date(ignored.ignoredAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Outgoing Transaction */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                            <span className="truncate">OUTGOING (-${Math.abs(ignored.outgoingTransaction.amount).toFixed(2)})</span>
                          </div>

                          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 sm:p-4 border border-red-200 dark:border-red-800 opacity-75">
                            <div className="space-y-2">
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                {new Date(ignored.outgoingTransaction.date).toLocaleDateString()}
                              </div>
                              <div className="font-medium text-foreground text-sm sm:text-base break-words">
                                {ignored.outgoingTransaction.description}
                              </div>
                              <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                                <span className="text-muted-foreground truncate flex-1 min-w-0">
                                  {ignored.outgoingAccount?.name || "Unknown Account"}
                                </span>
                                <span className="font-semibold text-red-600 flex-shrink-0">
                                  -${Math.abs(ignored.outgoingTransaction.amount).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Incoming Transaction */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            <span className="truncate">INCOMING (+${ignored.incomingTransaction.amount.toFixed(2)})</span>
                          </div>

                          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 sm:p-4 border border-green-200 dark:border-green-800 opacity-75">
                            <div className="space-y-2">
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                {new Date(ignored.incomingTransaction.date).toLocaleDateString()}
                              </div>
                              <div className="font-medium text-foreground text-sm sm:text-base break-words">
                                {ignored.incomingTransaction.description}
                              </div>
                              <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                                <span className="text-muted-foreground truncate flex-1 min-w-0">
                                  {ignored.incomingAccount?.name || "Unknown Account"}
                                </span>
                                <span className="font-semibold text-green-600 flex-shrink-0">
                                  +${ignored.incomingTransaction.amount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 mt-4 sm:mt-6 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs sm:text-sm"
                          onClick={() => handleUnignoreTransfer(
                            ignored.outgoingTransaction._id,
                            ignored.incomingTransaction._id
                          )}
                        >
                          <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          Restore Suggestion
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default TransfersManagePage;