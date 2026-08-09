/**
 * Matrix pivot logic: convert flat records into model × column sparse matrix.
 * Shared by model-tools and model-hardware pages (~90% identical).
 */

export interface MatrixRow<C> {
  modelId?: string;
  modelName: string;
  modelVendor: string;
  cells: Map<string, C>;
  coverage: number;
  aggregates: Record<string, number | null>;
}

export interface PivotOptions<C> {
  colKey: (record: C) => string;
  rowKey: (record: C) => string;
  rowMeta: (record: C) => {
    modelId?: string;
    modelName: string;
    modelVendor: string;
  };
  /** Named aggregate functions computed from each row's cells. */
  aggregates: Record<string, (cells: C[]) => number | null>;
}

export function buildMatrixRows<C>(
  records: C[],
  visibleCols: string[],
  opts: PivotOptions<C>,
): MatrixRow<C>[] {
  const visibleSet = new Set(visibleCols);
  const rowMap = new Map<string, MatrixRow<C>>();

  records
    .filter((r) => visibleSet.has(opts.colKey(r)))
    .forEach((record) => {
      const key = opts.rowKey(record);
      if (!rowMap.has(key)) {
        const meta = opts.rowMeta(record);
        rowMap.set(key, {
          ...meta,
          cells: new Map(),
          coverage: 0,
          aggregates: {},
        });
      }
      rowMap.get(key)!.cells.set(opts.colKey(record), record);
    });

  return [...rowMap.values()]
    .map((row) => {
      const cells = [...row.cells.values()];
      const aggregates: Record<string, number | null> = {};
      for (const [name, fn] of Object.entries(opts.aggregates)) {
        aggregates[name] = fn(cells);
      }
      return { ...row, coverage: cells.length, aggregates };
    })
    .sort((a, b) => compareMatrixRows(a, b));
}

import { sortCollator } from "../lib/format";

function compareMatrixRows(a: MatrixRow<unknown>, b: MatrixRow<unknown>): number {
  // Default sort: coverage desc, then modelName asc
  const covDiff = b.coverage - a.coverage;
  if (covDiff !== 0) return covDiff;
  return sortCollator.compare(a.modelName, b.modelName);
}

/** Sort matrix rows by a given field (aggregate or modelName/modelVendor). */
export function sortMatrixRows<C>(
  rows: MatrixRow<C>[],
  field: string,
  direction: "asc" | "desc",
): MatrixRow<C>[] {
  return [...rows].sort((a, b) => {
    let result: number;
    if (field === "modelName") {
      result = sortCollator.compare(a.modelName, b.modelName);
    } else if (field === "modelVendor") {
      result = sortCollator.compare(a.modelVendor, b.modelVendor);
    } else {
      const va = a.aggregates[field] ?? a.coverage ?? 0;
      const vb = b.aggregates[field] ?? b.coverage ?? 0;
      result = (va as number) - (vb as number);
    }
    if (result !== 0) return direction === "asc" ? result : -result;
    return sortCollator.compare(a.modelName, b.modelName);
  });
}
