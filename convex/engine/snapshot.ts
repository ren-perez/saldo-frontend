import { Doc } from "../_generated/dataModel";

export type FlowType = "fundamental" | "flexible" | "wealth";

export interface FlowGroupCategory {
  name: string;
  amount: number;
  color: string;
}

export interface FlowGroup {
  name: string;
  amount: number;
  color: string;
  categories: FlowGroupCategory[];
}

export interface FlowRow {
  id: string;
  cls: FlowType;
  label: string;
  amount: number;
  color: string;
  groups: FlowGroup[];
}

const FLOW_TYPES_CONFIG: Record<FlowType, { label: string; color: string; order: number }> = {
  fundamental: { label: "Fundamental", color: "#534ab7", order: 1 },
  flexible: { label: "Flexible", color: "#d85a30", order: 2 },
  wealth: { label: "Wealth Building", color: "#1d9e75", order: 3 },
};

function cleanId(s: string): string {
  return String(s).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

/**
 * Compute flow rows from expenses transactions grouped by flow → group → category.
 */
export function computeFlowRows(
  transactions: Doc<"transactions">[],
  categories: Doc<"categories">[],
  categoryGroups: Doc<"category_groups">[],
  totalGoals: number,
): FlowRow[] {
  const groupMap = new Map(categoryGroups.map((g) => [g._id.toString(), g.name]));

  // Build category → flow type lookup: explicit stsFlowType → "flexible" default
  const catFlowMap = new Map<string, FlowType>();
  // Build category → groupId lookup
  const catGroupMap = new Map<string, string | undefined>();
  // Build category → name lookup
  const catNameMap = new Map<string, string>();

  for (const cat of categories) {
    const id = cat._id.toString();
    catFlowMap.set(id, cat.stsFlowType ?? "flexible");
    catGroupMap.set(id, cat.groupId?.toString());
    catNameMap.set(id, cat.name);
  }

  // flowType → { groupKey → { groupName, amount, catMap } }
  type CatEntry = { name: string; amount: number };
  type GroupAgg = { name: string; color: string; catMap: Map<string, CatEntry> };
  const flowAgg: Record<string, { amount: number; groupsMap: Map<string, GroupAgg> }> = {};

  for (const cls of Object.keys(FLOW_TYPES_CONFIG) as FlowType[]) {
    flowAgg[cls] = { amount: 0, groupsMap: new Map() };
  }

  for (const tx of transactions) {
    if (tx.transactionType === "transfer") continue;
    if (tx.amount >= 0) continue; // skip income/reimbursements — only expenses

    const catId = tx.categoryId?.toString();
    if (!catId) continue;

    const ft = catFlowMap.get(catId) ?? "flexible";
    const agg = flowAgg[ft];
    if (!agg) continue;

    const absAmt = Math.abs(tx.amount);
    agg.amount += absAmt;

    const groupId = catGroupMap.get(catId);
    const groupKey = groupId ?? "ungrouped";
    const groupName = groupId ? (groupMap.get(groupId) ?? "Uncategorized") : "Uncategorized";

    if (!agg.groupsMap.has(groupKey)) {
      agg.groupsMap.set(groupKey, { name: groupName, color: FLOW_TYPES_CONFIG[ft].color, catMap: new Map() });
    }
    const grp = agg.groupsMap.get(groupKey)!;

    const catName = catNameMap.get(catId) ?? "Unknown";
    if (!grp.catMap.has(catId)) {
      grp.catMap.set(catId, { name: catName, amount: 0 });
    }
    grp.catMap.get(catId)!.amount += absAmt;
  }

  // Add wealth flow from goal contributions
  const wealthAgg = flowAgg["wealth"];
  if (totalGoals > 0) {
    wealthAgg.amount += totalGoals;
    const wealthGroupKey = "goals";
    if (!wealthAgg.groupsMap.has(wealthGroupKey)) {
      wealthAgg.groupsMap.set(wealthGroupKey, { name: "Goals", color: "#1d9e75", catMap: new Map() });
    }
    const grp = wealthAgg.groupsMap.get(wealthGroupKey)!;
    if (!grp.catMap.has("goals-total")) {
      grp.catMap.set("goals-total", { name: "Goal transfers", amount: 0 });
    }
    grp.catMap.get("goals-total")!.amount += totalGoals;
  }

  const rows: FlowRow[] = [];

  for (const cls of (Object.keys(FLOW_TYPES_CONFIG) as FlowType[]).sort((a, b) => FLOW_TYPES_CONFIG[a].order - FLOW_TYPES_CONFIG[b].order)) {
    const config = FLOW_TYPES_CONFIG[cls];
    const agg = flowAgg[cls];
    if (agg.amount <= 0) continue;

    const groups: FlowGroup[] = [];
    for (const [, grp] of agg.groupsMap) {
      const categories: FlowGroupCategory[] = [];
      for (const [, cat] of grp.catMap) {
        categories.push({ name: cat.name, amount: cat.amount, color: grp.color });
      }
      categories.sort((a, b) => b.amount - a.amount);
      groups.push({ name: grp.name, amount: grp.catMap.size === 1 ? categories[0].amount : Array.from(grp.catMap.values()).reduce((s, c) => s + c.amount, 0), color: grp.color, categories });
    }
    groups.sort((a, b) => b.amount - a.amount);

    rows.push({
      id: cleanId(cls),
      cls,
      label: config.label,
      amount: agg.amount,
      color: config.color,
      groups,
    });
  }

  return rows;
}
