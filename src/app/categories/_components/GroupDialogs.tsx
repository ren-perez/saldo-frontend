import React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { CategoryGroup } from "../types";

type GroupForm = {
  name: string;
};

export function GroupDialogs({
  showGroupDialog,
  setShowGroupDialog,
  editingGroup,
  setEditingGroup,
  groupForm,
  setGroupForm,
  handleCreateGroup,
  handleUpdateGroup,
}: {
  showGroupDialog: boolean;
  setShowGroupDialog: (open: boolean) => void;
  editingGroup: CategoryGroup | null;
  setEditingGroup: React.Dispatch<React.SetStateAction<CategoryGroup | null>>;
  groupForm: GroupForm;
  setGroupForm: React.Dispatch<React.SetStateAction<GroupForm>>;
  handleCreateGroup: (e: React.FormEvent) => Promise<void>;
  handleUpdateGroup: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <>
      {/* ── Create Group Dialog ── */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              New Group
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a group to organise related categories together.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Bills, Food & Dining"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowGroupDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Group</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Group Dialog ── */}
      <Dialog
        open={!!editingGroup}
        onOpenChange={(open) => {
          if (!open) setEditingGroup(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Rename Group
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Update the name of this category group.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </DialogHeader>
          {editingGroup && (
            <form onSubmit={handleUpdateGroup} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  value={editingGroup.name}
                  onChange={(e) =>
                    setEditingGroup((p) =>
                      p ? { ...p, name: e.target.value } : null
                    )
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingGroup(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
