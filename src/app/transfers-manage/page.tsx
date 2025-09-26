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
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-foreground">
            Please sign in to manage transfers.
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
                Manage Transfers
              </h1>
              <p className="text-muted-foreground mt-2">
                View and manage your paired and ignored transfer suggestions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/transfers-inbox">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Review New
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paired" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Paired Transfers ({pairedTransfers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="ignored" className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Ignored Suggestions ({ignoredTransfers?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Paired Transfers Tab */}
          <TabsContent value="paired" className="space-y-6">
            {!pairedTransfers || pairedTransfers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Paired Transfers</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven&#39;t paired any transfers yet. Review pending suggestions to get started.
                  </p>
                  <Button asChild>
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
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Paired Transfer
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(pair.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Outgoing Transaction */}
                        {pair.outgoingTransaction && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                              OUTGOING (-${Math.abs(pair.outgoingTransaction.amount).toFixed(2)})
                            </div>

                            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                  {new Date(pair.outgoingTransaction.date).toLocaleDateString()}
                                </div>
                                <div className="font-medium text-foreground">
                                  {pair.outgoingTransaction.description}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Account (ID: {pair.outgoingTransaction.accountId})
                                  </span>
                                  <span className="font-semibold text-red-600">
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
                            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              INCOMING (+${pair.incomingTransaction.amount.toFixed(2)})
                            </div>

                            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                  {new Date(pair.incomingTransaction.date).toLocaleDateString()}
                                </div>
                                <div className="font-medium text-foreground">
                                  {pair.incomingTransaction.description}
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Account (ID: {pair.incomingTransaction.accountId})
                                  </span>
                                  <span className="font-semibold text-green-600">
                                    +${pair.incomingTransaction.amount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="flex-1">
                              <Unlink className="h-4 w-4 mr-2" />
                              Unpair Transfer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unpair Transfer?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {"This will unlink these transactions and remove their \"transfer\" status."}
                                The transactions will remain in your account but will no longer be
                                treated as a transfer pair.
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Ignored Transfers Tab */}
          <TabsContent value="ignored" className="space-y-6">
            {!ignoredTransfers || ignoredTransfers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Ignored Suggestions</h3>
                  <p className="text-muted-foreground">
                    You haven&#39;t ignored any transfer suggestions yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ignoredTransfers.map((ignored) => (
                  <Card key={ignored.id} className="border-2 border-orange-200 dark:border-orange-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Ignored Suggestion
                          </Badge>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          Ignored {new Date(ignored.ignoredAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Outgoing Transaction */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            OUTGOING (-${Math.abs(ignored.outgoingTransaction.amount).toFixed(2)})
                          </div>

                          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800 opacity-75">
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">
                                {new Date(ignored.outgoingTransaction.date).toLocaleDateString()}
                              </div>
                              <div className="font-medium text-foreground">
                                {ignored.outgoingTransaction.description}
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">
                                  {ignored.outgoingAccount?.name || "Unknown Account"}
                                </span>
                                <span className="font-semibold text-red-600">
                                  -${Math.abs(ignored.outgoingTransaction.amount).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Incoming Transaction */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            INCOMING (+${ignored.incomingTransaction.amount.toFixed(2)})
                          </div>

                          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800 opacity-75">
                            <div className="space-y-2">
                              <div className="text-sm text-muted-foreground">
                                {new Date(ignored.incomingTransaction.date).toLocaleDateString()}
                              </div>
                              <div className="font-medium text-foreground">
                                {ignored.incomingTransaction.description}
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">
                                  {ignored.incomingAccount?.name || "Unknown Account"}
                                </span>
                                <span className="font-semibold text-green-600">
                                  +${ignored.incomingTransaction.amount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUnignoreTransfer(
                            ignored.outgoingTransaction._id,
                            ignored.incomingTransaction._id
                          )}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
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