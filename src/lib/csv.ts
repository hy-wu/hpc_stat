/**
 * CSV export helpers shared across all pages.
 */

function escapeCsvField(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/** Build a CSV string with BOM from header + body rows. */
export function buildCsv(
  headerLabels: string[],
  bodyRows: unknown[][],
): string {
  const header = headerLabels.map(escapeCsvField).join(",");
  const body = bodyRows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
  return "\uFEFF" + header + "\n" + body;
}

/** Trigger a browser download of a text blob. */
export function downloadBlob(
  filename: string,
  content: string,
  mime: string = "text/csv;charset=utf-8;",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
