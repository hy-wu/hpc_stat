/**
 * Rule-based filtering engine.
 *
 * Unifies 4 different matchesRules implementations by making their
 * behavioral differences explicit via RuleEngineOptions.
 */
import type { FieldDef } from "../types/fields";
import type { FilterRule, RuleOp } from "../types/common";
import { getNestedValue } from "./format";

export interface RuleEngineOptions {
  /**
   * What to do when a numeric rule value or row value is not a valid number.
   * - "reject": the row does NOT match the rule (flat pages: GPU, models)
   * - "pass":   the rule is silently skipped (matrix pages: avoid emptying results)
   */
  invalidNumberBehavior: "reject" | "pass";

  /** Enable boolean field matching (agent-tools page). */
  booleanSupport?: boolean;

  /**
   * Semantics of the "!=" operator.
   * - "not-equal":    exact string inequality (flat pages)
   * - "not-contains": negated substring match (matrix pages)
   */
  notEqualsSemantics?: "not-equal" | "not-contains";

  /** Custom value extractor (defaults to getNestedValue). */
  getValue?: (row: unknown, key: string) => unknown;
}

/** Test whether a single row satisfies ALL active rules. */
export function matchesRules<T>(
  row: T,
  rules: FilterRule[],
  fields: FieldDef[],
  opts: RuleEngineOptions,
): boolean {
  const get = opts.getValue ?? getNestedValue;
  return rules.every((rule) => {
    const field = fields.find((f) => f.key === rule.field);
    const actual = get(row, rule.field);
    const expected = rule.value;
    if (!expected) return true;

    if (field?.type === "number") {
      const left = Number(actual);
      const right = Number(expected);
      if (!Number.isFinite(left) || !Number.isFinite(right)) {
        return opts.invalidNumberBehavior === "pass";
      }
      return evalNumericOp(rule.op, left, right);
    }

    if (opts.booleanSupport && field?.type === "boolean") {
      const left = Boolean(actual);
      const normalized = expected.trim().toLowerCase();
      const right = ["true", "1", "yes", "y", "是", "支持"].includes(normalized);
      if (rule.op === "=") return left === right;
      if (rule.op === "!=") return left !== right;
      return false;
    }

    const left = String(actual ?? "").toLowerCase();
    const right = expected.toLowerCase();
    if (rule.op === "=") return left === right;
    if (rule.op === "!=") {
      return opts.notEqualsSemantics === "not-contains"
        ? !left.includes(right)
        : left !== right;
    }
    return left.includes(right);
  });
}

function evalNumericOp(op: RuleOp, left: number, right: number): boolean {
  switch (op) {
    case ">=": return left >= right;
    case "<=": return left <= right;
    case ">":  return left > right;
    case "<":  return left < right;
    case "=":  return left === right;
    case "!=": return left !== right;
    default:   return false;
  }
}

/** Global search: does any field value contain the query string? */
export function matchesGlobalSearch<T>(
  row: T,
  search: string,
  fields: FieldDef[],
  getValue?: (row: unknown, key: string) => unknown,
): boolean {
  if (!search) return true;
  const get = getValue ?? getNestedValue;
  return fields.some((field) =>
    String(get(row, field.key) ?? "").toLowerCase().includes(search),
  );
}

/** Filter by array membership (used for tag-based columns). */
export function matchesArrayFilter(
  values: string[] | undefined,
  selected: string,
): boolean {
  if (selected === "all") return true;
  return Array.isArray(values) && values.includes(selected);
}
