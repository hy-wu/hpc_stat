/**
 * Common types shared across lib/ modules and page controllers.
 */

export type RuleOp = "contains" | "=" | "!=" | ">=" | "<=" | ">" | "<";

export interface FilterRule {
  field: string;
  op: RuleOp;
  value: string;
}

export type SortDirection = "asc" | "desc";

/** Operator options for rule UI dropdowns. */
export function opsForType(fieldType: string): RuleOp[] {
  return fieldType === "number"
    ? [">=", "<=", ">", "<", "=", "!="]
    : ["contains", "=", "!="];
}

const OP_LABELS: Record<RuleOp, string> = {
  contains: "包含",
  "=": "等于",
  "!=": "不等于",
  ">=": "大于等于",
  "<=": "小于等于",
  ">": "大于",
  "<": "小于",
};

export function operatorOptions(selected: RuleOp, fieldType: string): string {
  const ops = opsForType(fieldType);
  return ops
    .map(
      (op) =>
        `<option value="${op}" ${op === selected ? "selected" : ""}>${OP_LABELS[op]}</option>`,
    )
    .join("");
}
