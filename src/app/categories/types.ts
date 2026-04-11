import { Id } from "../../../convex/_generated/dataModel";

export type Category = {
  _id: Id<"categories">;
  name: string;
  groupId?: Id<"category_groups">;
  transactionType?: string;
};

export type CategoryGroup = {
  _id: Id<"category_groups">;
  name: string;
};

export type CategoryRule = {
  _id: Id<"category_rules">;
  pattern: string;
  categoryId: Id<"categories">;
  priority: number;
  isActive: boolean;
};
