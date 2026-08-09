/**
 * Client-side matrix table controller.
 * Shared island for model-tools and model-hardware pages.
 */
import { getNestedValue, uniqueValues, average } from "../lib/format";
import { matchesRules, matchesGlobalSearch, matchesArrayFilter } from "../lib/filter";
import { renderRules } from "../lib/rules-ui";
import { renderColumnPicker as renderColumnPickerUI, syncColumnPickerState } from "../lib/column-picker";
import { buildMatrixRows, sortMatrixRows, type MatrixRow, type PivotOptions } from "../matrix/pivot";
import { scoreBars, getToneClass, sourceLinks } from "../matrix/cells";
import { buildCsv, downloadBlob } from "../lib/csv";
import { escapeHtml, escapeAttr } from "../lib/escape";
import { formatPerfBars, formatPerfText, computePerfMax, type PerfMax } from "../matrix/perf-bars";
import type { FilterRule, SortDirection } from "../types/common";
import type { ModelToolRecord, ModelHardwareRecord } from "../types/matrix";

// --- Page config injected via data attribute ---
interface MatrixPageConfig {
  pageId: "model-tools" | "model-hardware";
  dataUrl: string;
  colKeyField: string; // "toolName" | "gpuName"
  colLabel: string;     // "工具" | "硬件"
  sortOptions: { key: string; label: string }[];
  ruleFields: { key: string; label: string; type: string }[];
  aggregates: Record<string, (cells: Record<string, unknown>[]) => number | null>;
  formatCell: (record: Record<string, unknown> | undefined, pageId: string) => string;
  formatAvgCell: (row: MatrixRow<Record<string, unknown>>, pageId: string) => string;
  csvCellText: (record: Record<string, unknown> | undefined) => string;
  csvExtraHeaders: string[];
  csvExtraValues: (row: MatrixRow<Record<string, unknown>>) => unknown[];
  filters: { selectId: string; label: string; allLabel: string; key: string }[];
  summaryMetrics: { id: string; compute: (records: Record<string, unknown>[], rows: MatrixRow<Record<string, unknown>>[], cols: string[]) => string }[];
  autoHideEmptyColumns?: boolean;
}

const state = {
  records: [] as Record<string, unknown>[],
  colNames: [] as string[],
  visibleCols: new Set<string>(),
  sortField: "coverage",
  sortDirection: "desc" as SortDirection,
  globalSearch: "",
  rules: [] as FilterRule[],
  compact: false,
  config: null as MatrixPageConfig | null,
  perfMax: null as PerfMax | null,
  autoHiddenCount: 0,
};

function q<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

async function init() {
  const root = document.querySelector<HTMLElement>("[data-matrix-page]");
  if (!root) return;
  const pageId = root.dataset.matrixPage as MatrixPageConfig["pageId"];
  state.config = getPageConfig(pageId);
  if (!state.config) return;

  try {
    const res = await fetch(state.config.dataUrl);
    state.records = await res.json();
    state.colNames = uniqueValues(state.records, state.config.colKeyField, { flatArrays: false });
    state.visibleCols = new Set(state.colNames);

    if (state.config.pageId === "model-hardware") {
      state.perfMax = computePerfMax(state.records as unknown as { inputTps?: number | null; outputTps?: number | null; concurrency?: number | null }[]);
    }

    renderFilters();
    renderColumnPickerLocal();
    syncPickerState();
    renderRulesUI();
    bindEvents();
    render();
  } catch (err) {
    console.error(`Failed to load ${pageId}:`, err);
    const tbody = q("tableBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="99" class="muted" style="text-align:center;padding:24px">数据加载失败。</td></tr>`;
  }
}

// --- Page-specific configs ---
function getPageConfig(pageId: string): MatrixPageConfig {
  if (pageId === "model-tools") return modelToolsConfig();
  if (pageId === "model-hardware") return modelHardwareConfig();
  throw new Error(`Unknown matrix page: ${pageId}`);
}

function modelToolsConfig(): MatrixPageConfig {
  return {
    pageId: "model-tools",
    dataUrl: "data/model-tools.json",
    colKeyField: "toolName",
    colLabel: "工具",
    sortOptions: [
      { key: "coverage", label: "覆盖工具数" },
      { key: "avgAgentFit", label: "平均 Agent 适配" },
      { key: "avgCodingFit", label: "平均代码适配" },
      { key: "avgContextFit", label: "平均长上下文" },
      { key: "modelName", label: "模型名称" },
      { key: "modelVendor", label: "模型厂商" },
    ],
    ruleFields: [
      { key: "modelName", label: "模型", type: "text" },
      { key: "toolName", label: "工具", type: "text" },
      { key: "modelVendor", label: "模型厂商", type: "text" },
      { key: "supportStatus", label: "接入状态", type: "text" },
      { key: "routeTags", label: "接入方式", type: "text" },
      { key: "codingFit", label: "代码适配", type: "number" },
      { key: "agentFit", label: "Agent 适配", type: "number" },
      { key: "contextFit", label: "长上下文", type: "number" },
    ],
    aggregates: {
      avgCodingFit: (cells) => average(cells.map((c) => c.codingFit as number | null | undefined)),
      avgAgentFit: (cells) => average(cells.map((c) => c.agentFit as number | null | undefined)),
      avgContextFit: (cells) => average(cells.map((c) => c.contextFit as number | null | undefined)),
    },
    formatCell: formatModelToolCell,
    formatAvgCell: (row) => scoreBars(
      [row.aggregates.avgCodingFit, row.aggregates.avgAgentFit, row.aggregates.avgContextFit],
      ["C", "A", "X"],
      "score-bars-avg",
    ),
    csvCellText: (record) => {
      if (!record) return "";
      const r = record as unknown as ModelToolRecord;
      return [
        r.supportStatus,
        `C${r.codingFit}/A${r.agentFit}/X${r.contextFit}`,
        (r.routeTags || []).join(" / "),
        r.priceMeter,
        r.notes,
      ].filter(Boolean).join(" | ");
    },
    csvExtraHeaders: ["平均代码适配", "平均 Agent 适配", "平均长上下文"],
    csvExtraValues: (row) => [row.aggregates.avgCodingFit, row.aggregates.avgAgentFit, row.aggregates.avgContextFit],
    filters: [
      { selectId: "toolFilter", label: "全部工具", allLabel: "全部工具", key: "toolName" },
      { selectId: "modelVendorFilter", label: "全部厂商", allLabel: "全部厂商", key: "modelVendor" },
      { selectId: "statusFilter", label: "全部状态", allLabel: "全部状态", key: "supportStatus" },
      { selectId: "routeFilter", label: "全部方式", allLabel: "全部方式", key: "routeTags" },
    ],
    summaryMetrics: [
      { id: "visibleCount", compute: (records, rows, cols) => `${records.length} 组合 / ${rows.length} 模型 × ${cols.length} 工具` },
      { id: "nativeCount", compute: (records) => String(records.filter((r) => ["官方内置", "官方/开源默认"].includes(String(r.supportStatus ?? ""))).length) },
      { id: "byokCount", compute: (records) => String(records.filter((r) => ((r.routeTags as string[]) || []).some((t: string) => ["BYOK", "OpenAI-compatible", "本地模型"].includes(t))).length) },
      { id: "avgAgentFit", compute: (records) => { const avg = average(records.map((r) => r.agentFit as number | null | undefined)); return avg === null ? "-" : `${avg.toFixed(1)}/5`; } },
    ],
  };
}

function modelHardwareConfig(): MatrixPageConfig {
  return {
    pageId: "model-hardware",
    dataUrl: "data/model-hardware.json",
    colKeyField: "gpuName",
    colLabel: "硬件",
    sortOptions: [
      { key: "coverage", label: "覆盖硬件数" },
      { key: "avgFitScore", label: "平均硬件适配" },
      { key: "avgMemoryFit", label: "平均显存适配" },
      { key: "avgBandwidthFit", label: "平均带宽适配" },
      { key: "modelName", label: "模型名称" },
      { key: "modelVendor", label: "模型厂商" },
    ],
    ruleFields: [
      { key: "modelName", label: "模型", type: "text" },
      { key: "gpuName", label: "硬件", type: "text" },
      { key: "modelVendor", label: "模型厂商", type: "text" },
      { key: "gpuVendor", label: "硬件厂商", type: "text" },
      { key: "deployMode", label: "部署方式", type: "text" },
      { key: "precision", label: "量化精度", type: "text" },
      { key: "gpuCount", label: "卡数", type: "number" },
      { key: "minVramGB", label: "最低显存(GB)", type: "number" },
      { key: "fitScore", label: "硬件适配", type: "number" },
    ],
    aggregates: {
      avgFitScore: (cells) => average(cells.map((c) => c.fitScore as number | null | undefined)),
      avgMemoryFit: (cells) => average(cells.map((c) => c.memoryFit as number | null | undefined)),
      avgBandwidthFit: (cells) => average(cells.map((c) => c.bandwidthFit as number | null | undefined)),
      avgComputeFit: (cells) => average(cells.map((c) => c.computeFit as number | null | undefined)),
    },
    formatCell: formatModelHardwareCell,
    formatAvgCell: (row) => scoreBars(
      [row.aggregates.avgMemoryFit, row.aggregates.avgBandwidthFit, row.aggregates.avgComputeFit],
      ["M", "B", "C"],
      "score-bars-avg",
    ),
    csvCellText: (record) => {
      if (!record) return "";
      const r = record as unknown as ModelHardwareRecord;
      return [
        r.deployMode,
        r.precision,
        `×${r.gpuCount}`,
        r.minVramGB != null ? `需 ${r.minVramGB}GB` : "",
        r.inputTps != null || r.outputTps != null
          ? `↑${r.inputTps ?? "—"}/↓${r.outputTps ?? "—"} tok/s`
          : "",
        `适配 ${r.fitScore}/5`,
        r.notes,
      ].filter(Boolean).join(" | ");
    },
    csvExtraHeaders: ["平均硬件适配", "平均显存适配", "平均带宽适配"],
    csvExtraValues: (row) => [row.aggregates.avgFitScore, row.aggregates.avgMemoryFit, row.aggregates.avgBandwidthFit],
    filters: [
      { selectId: "gpuFilter", label: "全部硬件", allLabel: "全部硬件", key: "gpuName" },
      { selectId: "modelVendorFilter", label: "全部厂商", allLabel: "全部厂商", key: "modelVendor" },
      { selectId: "deployModeFilter", label: "全部方式", allLabel: "全部方式", key: "deployMode" },
      { selectId: "precisionFilter", label: "全部精度", allLabel: "全部精度", key: "precision" },
    ],
    summaryMetrics: [
      { id: "visibleCount", compute: (records, rows, cols) => `${records.length} 组合 / ${rows.length} 模型 × ${cols.length} 硬件` },
      { id: "singleCardCount", compute: (records) => String(records.filter((r) => ["单卡", "单设备"].includes(String(r.deployMode ?? ""))).length) },
      { id: "multiCardCount", compute: (records) => String(records.filter((r) => ["多卡", "集群"].includes(String(r.deployMode ?? ""))).length) },
      { id: "avgFitScore", compute: (records) => { const avg = average(records.map((r) => r.fitScore as number | null | undefined)); return avg === null ? "-" : `${avg.toFixed(1)}/5`; } },
    ],
    autoHideEmptyColumns: true,
  };
}

// --- Cell formatters ---
function formatModelToolCell(record: Record<string, unknown> | undefined): string {
  if (!record) return `<span class="matrix-empty" title="暂无该模型在此工具中的记录">—</span>`;
  const r = record as unknown as ModelToolRecord;
  const statusClass = getToneClass(r.supportStatus, "status");
  const routeTags = (r.routeTags || []).slice(0, 3);
  const title = [r.notes, r.priceMeter, r.planRequirement, r.latencyNote].filter(Boolean).join("\n");
  return `
    <div class="matrix-cell" title="${escapeAttr(title)}">
      <div class="matrix-cell-top">
        <span class="tag group-status ${statusClass} verified-cell">${escapeHtml(r.supportStatus)}</span>
      </div>
      ${scoreBars([r.codingFit, r.agentFit, r.contextFit], ["C", "A", "X"])}
      <div class="tag-list matrix-route-tags">
        ${routeTags.map((t) => `<span class="tag group-route ${getToneClass(t, "route")} verified-cell">${escapeHtml(t)}</span>`).join("")}
      </div>
      ${sourceLinks(r.sources)}
    </div>`;
}

function formatModelHardwareCell(record: Record<string, unknown> | undefined): string {
  if (!record) return `<span class="matrix-empty" title="暂无该模型在此硬件上的部署记录">—</span>`;
  const r = record as unknown as ModelHardwareRecord;
  const modeClass = getToneClass(r.deployMode, "status");
  const precisionClass = getToneClass(r.precision, "route");
  const vramText = r.minVramGB != null ? `${r.minVramGB}GB` : "—";
  const title = [
    r.throughputNote, r.costNote, r.notes,
  ].filter(Boolean).join("\n");
  const pm = state.perfMax ?? { inputTps: 1, outputTps: 1, concurrency: 1 };
  return `
    <div class="matrix-cell matrix-cell-hw" title="${escapeAttr(title)}">
      ${formatPerfBars(r, pm)}
      <div class="matrix-cell-top matrix-tags-row">
        <span class="tag group-status ${modeClass} verified-cell">${escapeHtml(r.deployMode)}</span>
        <span class="tag group-route ${precisionClass} verified-cell">${escapeHtml(r.precision)}</span>
        <span class="tag group-route ${getToneClass("gpuCount", "route")} verified-cell">×${r.gpuCount ?? "—"} · 需 ${vramText}</span>
      </div>
      ${scoreBars([r.memoryFit, r.bandwidthFit, r.computeFit], ["M", "B", "C"])}
      ${sourceLinks(r.sources)}
      ${formatPerfText(r)}
    </div>`;
}

// --- Filtering ---
function getFilteredRecords(): Record<string, unknown>[] {
  const cfg = state.config!;
  const fieldDefs = cfg.ruleFields.map((f) => ({ key: f.key, label: f.label, type: f.type as any, visible: true }));
  let rows = state.records
    .filter((r) => matchesGlobalSearch(r, state.globalSearch, fieldDefs, getNestedValue))
    .filter((r) => matchesRules(r, state.rules, fieldDefs, { invalidNumberBehavior: "pass", notEqualsSemantics: "not-contains" }));
  for (const filter of cfg.filters) {
    const value = q<HTMLSelectElement>(filter.selectId)?.value ?? "all";
    if (value === "all") continue;
    rows = rows.filter((r) => {
      const v = r[filter.key];
      return Array.isArray(v)
        ? matchesArrayFilter(v as string[], value)
        : String(v ?? "") === value;
    });
  }
  return rows;
}

function getVisibleCols(filteredRecords: Record<string, unknown>[]): string[] {
  const cfg = state.config!;
  const col = q<HTMLSelectElement>(cfg.filters[0].selectId)?.value ?? "all";
  if (col !== "all") return [col];
  if (cfg.autoHideEmptyColumns) {
    const hitCols = new Set(filteredRecords.map((r) => (r as any)[cfg.colKeyField]));
    return state.colNames.filter((n) => state.visibleCols.has(n) && hitCols.has(n));
  }
  return state.colNames.filter((n) => state.visibleCols.has(n));
}

// --- Rendering ---
function render() {
  const cfg = state.config!;
  const filtered = getFilteredRecords();
  const cols = getVisibleCols(filtered);
  const pivotOpts: PivotOptions<Record<string, unknown>> = {
    colKey: (r) => String(r[cfg.colKeyField] ?? ""),
    rowKey: (r) => String(r.modelId ?? r.modelName ?? ""),
    rowMeta: (r) => ({ modelId: r.modelId as string | undefined, modelName: String(r.modelName ?? ""), modelVendor: String(r.modelVendor ?? "") }),
    aggregates: cfg.aggregates,
  };
  const rows = buildMatrixRows(filtered, cols, pivotOpts);
  const sortedRows = sortMatrixRows(rows, state.sortField, state.sortDirection);

  renderSummary(filtered, sortedRows, cols);
  renderMatrixTable(sortedRows, cols, cfg);

  if (cfg.autoHideEmptyColumns) {
    const hiddenCount = state.colNames.filter((n) => state.visibleCols.has(n) && !cols.includes(n)).length;
    if (hiddenCount !== state.autoHiddenCount) {
      state.autoHiddenCount = hiddenCount;
      syncPickerState();
    }
  }
}

function renderSummary(records: Record<string, unknown>[], rows: MatrixRow<Record<string, unknown>>[], cols: string[]) {
  const cfg = state.config!;
  for (const metric of cfg.summaryMetrics) {
    const el = q(metric.id);
    if (el) el.textContent = metric.compute(records, rows, cols);
  }
}

function renderMatrixTable(rows: MatrixRow<Record<string, unknown>>[], cols: string[], cfg: MatrixPageConfig) {
  const thead = q("tableHead");
  const tbody = q("tableBody");
  if (!thead || !tbody) return;

  thead.innerHTML = `
    <tr>
      <th class="matrix-sticky-col"><button data-sort="modelName">模型${sortMark("modelName")}</button></th>
      <th><button data-sort="modelVendor">厂商${sortMark("modelVendor")}</button></th>
      <th><button data-sort="coverage">覆盖${sortMark("coverage")}</button></th>
      <th><button data-sort="${Object.keys(cfg.aggregates)[0] ?? ""}">均分${sortMark(Object.keys(cfg.aggregates)[0] ?? "")}</button></th>
      ${cols.map((n) => `<th class="matrix-tool-head">${escapeHtml(n)}</th>`).join("")}
    </tr>`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${cols.length + 4}" class="muted" style="text-align:center;padding:24px">没有匹配的组合。</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row) => `
    <tr>
      <td class="matrix-sticky-col"><strong>${escapeHtml(row.modelName)}</strong></td>
      <td>${escapeHtml(row.modelVendor)}</td>
      <td>${row.coverage}/${cols.length}</td>
      <td>${cfg.formatAvgCell(row, cfg.pageId)}</td>
      ${cols.map((n) => `<td class="matrix-tool-cell">${cfg.formatCell(row.cells.get(n), cfg.pageId)}</td>`).join("")}
    </tr>`).join("");

  thead.querySelectorAll<HTMLElement>("[data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.sort!;
      if (state.sortField === field) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = field;
        state.sortDirection = ["modelName", "modelVendor"].includes(field) ? "asc" : "desc";
      }
      const sortSelect = q<HTMLSelectElement>("sortField");
      if (sortSelect) sortSelect.value = state.sortField;
      const dirBtn = q("sortDirectionButton");
      if (dirBtn) dirBtn.textContent = state.sortDirection === "asc" ? "升序" : "降序";
      render();
    });
  });
}

function sortMark(key: string): string {
  if (state.sortField !== key) return "";
  return state.sortDirection === "asc" ? " ↑" : " ↓";
}

// --- Filter dropdowns ---
function renderFilters() {
  const cfg = state.config!;
  for (const filter of cfg.filters) {
    const select = q<HTMLSelectElement>(filter.selectId);
    if (!select) continue;
    const values = uniqueValues(state.records, filter.key, { flatArrays: true });
    select.innerHTML = `<option value="all">${filter.allLabel}</option>${values.map((v) => `<option value="${escapeAttr(v)}">${escapeHtml(v)}</option>`).join("")}`;
  }
  const sortSelect = q<HTMLSelectElement>("sortField");
  if (sortSelect) {
    sortSelect.innerHTML = cfg.sortOptions.map((o) => `<option value="${escapeAttr(o.key)}">${escapeHtml(o.label)}</option>`).join("");
    sortSelect.value = state.sortField;
  }
}

function renderColumnPickerLocal() {
  const container = q("columnPicker");
  if (!container) return;
  const items = state.colNames.map((n) => ({ key: n, label: n }));
  renderColumnPickerUI(container, items, state.visibleCols, {
    onSelectionChanged: (selected: Set<string>) => {
      if (selected.size === 0) {
        state.visibleCols = new Set(state.colNames);
      } else {
        state.visibleCols = selected;
      }
      renderColumnPickerLocal();
      syncPickerState();
      render();
    },
  });
}

function syncPickerState() {
  const btn = q("toggleColumnsButton");
  if (btn) {
    const cfg = state.config!;
    const autoHidden = state.autoHiddenCount > 0 ? ` · 自动隐 ${state.autoHiddenCount}` : "";
    syncColumnPickerState(btn, state.visibleCols.size, state.colNames.length, `${cfg.colLabel}列${autoHidden}`);
  }
}

function renderRulesUI() {
  const container = q("filterRules");
  if (!container) return;
  const cfg = state.config!;
  const fields = cfg.ruleFields.map((f) => ({ key: f.key, label: f.label, type: f.type as any, visible: true }));
  renderRules(container, state.rules, fields, {
    onRulesChanged: () => render(),
  });
}

// --- Events ---
function bindEvents() {
  const cfg = state.config!;
  q<HTMLInputElement>("globalSearch")?.addEventListener("input", (e) => {
    state.globalSearch = (e.target as HTMLInputElement).value.trim().toLowerCase();
    render();
  });

  for (const filter of cfg.filters) {
    q<HTMLSelectElement>(filter.selectId)?.addEventListener("change", () => render());
  }

  q<HTMLSelectElement>("sortField")?.addEventListener("change", (e) => {
    state.sortField = (e.target as HTMLSelectElement).value;
    render();
  });

  q("sortDirectionButton")?.addEventListener("click", () => {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    const btn = q("sortDirectionButton");
    if (btn) btn.textContent = state.sortDirection === "asc" ? "升序" : "降序";
    render();
  });

  q("resetFiltersButton")?.addEventListener("click", () => {
    state.globalSearch = "";
    state.rules = [];
    const search = q<HTMLInputElement>("globalSearch");
    if (search) search.value = "";
    for (const filter of cfg.filters) {
      const select = q<HTMLSelectElement>(filter.selectId);
      if (select) select.value = "all";
    }
    renderRulesUI();
    render();
  });

  q("addRuleButton")?.addEventListener("click", () => {
    const cfg2 = state.config!;
    const defaultField = cfg2.ruleFields.find((f) => f.type === "number")?.key ?? cfg2.ruleFields[0]?.key ?? "modelName";
    state.rules.push({ field: defaultField, op: ">=", value: "" });
    renderRulesUI();
    render();
  });

  q("compactToggleButton")?.addEventListener("click", () => {
    state.compact = !state.compact;
    const table = q("gpuTable");
    if (table) table.classList.toggle("compact", state.compact);
    const btn = q("compactToggleButton");
    if (btn) btn.textContent = state.compact ? "标准模式" : "紧凑模式";
  });

  q("toggleColumnsButton")?.addEventListener("click", () => {
    const picker = q("columnPicker");
    if (picker) picker.hidden = !picker.hidden;
  });

  q("exportCsvButton")?.addEventListener("click", () => exportCsv());
}

function exportCsv() {
  const cfg = state.config!;
  const filtered = getFilteredRecords();
  const cols = getVisibleCols(filtered);
  const pivotOpts: PivotOptions<Record<string, unknown>> = {
    colKey: (r) => String(r[cfg.colKeyField] ?? ""),
    rowKey: (r) => String(r.modelId ?? r.modelName ?? ""),
    rowMeta: (r) => ({ modelId: r.modelId as string | undefined, modelName: String(r.modelName ?? ""), modelVendor: String(r.modelVendor ?? "") }),
    aggregates: cfg.aggregates,
  };
  const rows = buildMatrixRows(filtered, cols, pivotOpts);
  const sortedRows = sortMatrixRows(rows, state.sortField, state.sortDirection);

  const header = ["模型", "厂商", `覆盖${cfg.colLabel}数`, ...cfg.csvExtraHeaders, ...cols];
  const body = sortedRows.map((row) => [
    row.modelName,
    row.modelVendor,
    `${row.coverage}/${cols.length}`,
    ...cfg.csvExtraValues(row),
    ...cols.map((n) => cfg.csvCellText(row.cells.get(n))),
  ]);
  const csv = buildCsv(header, body);
  downloadBlob(`${cfg.pageId}-matrix.csv`, csv);
}

// Boot
init();
