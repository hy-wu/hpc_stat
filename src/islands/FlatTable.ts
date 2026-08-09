/**
 * Client-side flat table controller.
 * Shared island for GPU, models, and agent-tools pages.
 * Page-specific behavior injected via FlatPageConfig.
 */
import {
  sortCollator, getNestedValue, getValueAsText, uniqueValues,
  formatNumber, isUsableNumber, sanitizeUrl,
} from "../lib/format";
import { matchesRules, matchesGlobalSearch, matchesArrayFilter, type RuleEngineOptions } from "../lib/filter";
import { renderRules } from "../lib/rules-ui";
import { renderColumnPicker, syncColumnPickerState, type ColumnPickerItem } from "../lib/column-picker";
import { getHeatmapColor, computeColumnStats, type HeatStat } from "../lib/heatmap";
import { buildCsv, downloadBlob } from "../lib/csv";
import { escapeHtml, escapeAttr } from "../lib/escape";
import { getToneClass } from "../matrix/cells";
import type { FieldDef } from "../types/fields";
import type { FilterRule, SortDirection } from "../types/common";

// ---- Page config types ----
interface FilterDef {
  selectId: string;
  key: string;
  allLabel: string;
  /** For array-valued columns (e.g. tag-lists), flatten before listing options. */
  flatArrays?: boolean;
  /** Custom option label generator. */
  labelFn?: (value: string) => string;
}

interface SummaryMetric {
  id: string;
  compute: (rows: Record<string, unknown>[], allRows: Record<string, unknown>[]) => string;
}

interface FlatPageConfig {
  pageId: string;
  dataUrl: string;
  fieldsUrl: string;
  ruleEngineOptions: RuleEngineOptions;
  defaultSortField: string;
  defaultSortDirection: SortDirection;
  filters: FilterDef[];
  summaryMetrics: SummaryMetric[];
  /** Transform raw data rows after loading. */
  enrichRows?: (rows: Record<string, unknown>[]) => Record<string, unknown>[];
  /** Compute data coverage for column picker bars (models page). */
  computeFieldCoverage?: (field: FieldDef, rows: Record<string, unknown>[]) => { percent: number; count: number } | null;
  /** Page-specific cell rendering hooks (called before generic rendering). */
  formatCellOverride?: (
    row: Record<string, unknown>,
    field: FieldDef,
    stat: HeatStat | null,
    ctx: CellContext,
  ) => string | null;
  /** Extra search fields beyond fieldDefs. */
  extraSearchKeys?: string[];
  /** Post-init hook for page-specific event bindings (GPU localStorage, etc). */
  postInit?: (ctx: PostInitContext) => void;
}

interface PostInitContext {
  getAllRows: () => Record<string, unknown>[];
  setAllRows: (rows: Record<string, unknown>[]) => void;
  render: () => void;
  renderFilterDropdowns: () => void;
}

interface CellContext {
  isVerified: (row: Record<string, unknown>, key: string) => boolean;
  getSourceTitle: (row: Record<string, unknown>) => string;
  vendorLinks: Record<string, string>;
}

// ---- Module state ----
const state = {
  rows: [] as Record<string, unknown>[],
  allRows: [] as Record<string, unknown>[],
  fieldDefs: [] as FieldDef[],
  defaultVisible: new Set<string>(),
  visibleColumns: new Set<string>(),
  sortField: "",
  sortDirection: "desc" as SortDirection,
  globalSearch: "",
  rules: [] as FilterRule[],
  compact: false,
  config: null as FlatPageConfig | null,
  vendorLinks: {} as Record<string, string>,
};

function q<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

// ---- Init ----
async function init() {
  const root = document.querySelector<HTMLElement>("[data-flat-page]");
  if (!root) return;
  const pageId = root.dataset.flatPage!;
  state.config = getPageConfig(pageId);
  if (!state.config) return;

  state.sortField = state.config.defaultSortField;
  state.sortDirection = state.config.defaultSortDirection;

  try {
    const [dataRes, fieldsRes] = await Promise.all([
      fetch(state.config.dataUrl),
      fetch(state.config.fieldsUrl),
    ]);
    const rawData = await dataRes.json();
    const fieldConfig = await fieldsRes.json();

    state.fieldDefs = fieldConfig.fieldDefs ?? fieldConfig.fields ?? [];
    state.vendorLinks = fieldConfig.vendorLinks ?? {};
    state.defaultVisible = new Set(
      state.fieldDefs.filter((f: FieldDef) => f.visible).map((f: FieldDef) => f.key),
    );
    state.visibleColumns = new Set(state.defaultVisible);

    let rows = rawData as Record<string, unknown>[];
    if (state.config.enrichRows) {
      rows = state.config.enrichRows(rows);
    }
    state.allRows = rows;
    state.rows = rows;

    renderFilterDropdowns();
    renderColumnPickerUI();
    renderRulesUI();
    bindEvents();

    // GPU: merge localStorage overrides into seed data
    if (state.config.pageId === "gpu") {
      mergeLocalStorage();
    }

    render();

    // Post-init hook
    if (state.config.postInit) {
      state.config.postInit({
        getAllRows: () => state.allRows,
        setAllRows: (rows) => { state.allRows = rows; state.rows = rows; },
        render: () => render(),
        renderFilterDropdowns: () => renderFilterDropdowns(),
      });
    }
  } catch (err) {
    console.error(`Failed to load ${pageId}:`, err);
    const tbody = q("tableBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="99" class="muted" style="text-align:center;padding:24px">数据加载失败。</td></tr>`;
  }
}

// ---- Page configs ----
function getPageConfig(pageId: string): FlatPageConfig {
  switch (pageId) {
    case "gpu": return gpuConfig();
    case "models": return modelsConfig();
    case "agent-tools": return agentToolsConfig();
    default: throw new Error(`Unknown flat page: ${pageId}`);
  }
}

// ---- GPU localStorage merging ----
const GPU_SEED_VERSION = 3;
const GPU_STORAGE_KEY = "unified-gpu-table-data";
const GPU_STORAGE_VERSION_KEY = "unified-gpu-table-seed-version";

function mergeLocalStorage() {
  try {
    const storedVersion = localStorage.getItem(GPU_STORAGE_VERSION_KEY);
    if (storedVersion !== String(GPU_SEED_VERSION)) {
      localStorage.removeItem(GPU_STORAGE_KEY);
      localStorage.setItem(GPU_STORAGE_VERSION_KEY, String(GPU_SEED_VERSION));
      return;
    }
    const stored = localStorage.getItem(GPU_STORAGE_KEY);
    if (!stored) return;
    const overrides = JSON.parse(stored) as Record<string, unknown>[];
    if (!Array.isArray(overrides)) return;

    for (const override of overrides) {
      const idx = state.allRows.findIndex(
        (r) => r.id === override.id || r.model === override.model,
      );
      if (idx >= 0) {
        state.allRows[idx] = { ...state.allRows[idx], ...override };
      }
    }
    // Re-run enrichment after merge
    if (state.config!.enrichRows) {
      state.allRows = state.config!.enrichRows(state.allRows);
    }
  } catch {
    // localStorage unavailable or corrupt — skip silently
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(GPU_STORAGE_KEY, JSON.stringify(state.allRows));
    localStorage.setItem(GPU_STORAGE_VERSION_KEY, String(GPU_SEED_VERSION));
  } catch {
    // localStorage full or unavailable
  }
}

function gpuPostInit(ctx: PostInitContext) {
  // Listen for custom events from gpu-extra island
  document.addEventListener("gpu-price-update", ((e: CustomEvent) => {
    const { updates, today } = e.detail;
    let matched = 0;
    const missing: string[] = [];
    for (const update of updates) {
      const gpu = state.allRows.find(
        (r) => (update.id && r.id === update.id) || (update.model && r.model === update.model),
      );
      if (!gpu) {
        missing.push(update.id || update.model || "(unknown)");
        continue;
      }
      matched++;
      if (update.priceUSD != null) gpu.priceUSD = Number(update.priceUSD);
      gpu.priceUpdated = update.priceUpdated || today;
      if (update.merchant != null) gpu.merchant = update.merchant;
      if (update.source != null) gpu.priceSource = update.source;
      if (update.url != null) gpu.source = update.url;
      if (update.available != null) gpu.available = update.available;
    }
    if (state.config!.enrichRows) {
      ctx.setAllRows(state.config!.enrichRows(state.allRows));
    }
    ctx.render();
    saveToLocalStorage();
    document.dispatchEvent(new CustomEvent("gpu-price-update-result", { detail: { matched, missing } }));
  }) as EventListener);

  document.addEventListener("gpu-data-import", ((e: CustomEvent) => {
    const incoming = e.detail.data as Record<string, unknown>[];
    let count = 0;
    for (const gpu of incoming) {
      const idx = state.allRows.findIndex((r) => r.id === gpu.id);
      if (idx >= 0) {
        state.allRows[idx] = { ...state.allRows[idx], ...gpu };
      } else {
        state.allRows.push(gpu);
      }
      count++;
    }
    if (state.config!.enrichRows) {
      ctx.setAllRows(state.config!.enrichRows(state.allRows));
    }
    ctx.renderFilterDropdowns();
    ctx.render();
    saveToLocalStorage();
    document.dispatchEvent(new CustomEvent("gpu-data-import-result", { detail: { count } }));
  }) as EventListener);

  document.addEventListener("gpu-data-export", () => {
    downloadBlob("gpu-data-export.json", JSON.stringify(state.allRows, null, 2), "application/json");
  });
}

// ---- GPU config ----
function gpuConfig(): FlatPageConfig {
  return {
    pageId: "gpu",
    dataUrl: "data/gpus.json",
    fieldsUrl: "data/gpu-fields.json",
    ruleEngineOptions: { invalidNumberBehavior: "reject" },
    defaultSortField: "vramGB",
    defaultSortDirection: "desc",
    filters: [
      { selectId: "typeFilter", key: "acceleratorType", allLabel: "全部类型" },
      { selectId: "segmentFilter", key: "segment", allLabel: "全部场景" },
      { selectId: "vendorFilter", key: "vendor", allLabel: "全部厂商" },
    ],
    summaryMetrics: [
      { id: "visibleCount", compute: (rows) => rows.length.toLocaleString("zh-CN") },
      {
        id: "maxMemory",
        compute: (rows) => {
          const vals = rows.map((r) => Number(r.vramGB)).filter((v) => Number.isFinite(v));
          return vals.length ? `${formatNumber(Math.max(...vals))} GB` : "-";
        },
      },
      {
        id: "bestPricePerGb",
        compute: (rows) => {
          const vals = rows.map((r) => Number(r.pricePerGb)).filter((v) => Number.isFinite(v) && v > 0);
          return vals.length ? `$${formatNumber(Math.min(...vals))}` : "-";
        },
      },
      {
        id: "latestPriceDate",
        compute: (rows) => {
          const dates = rows.map((r) => r.priceUpdated).filter(Boolean) as string[];
          return dates.sort().at(-1) ?? "-";
        },
      },
    ],
    enrichRows: (rows) =>
      rows.map((gpu) => {
        const g = { ...gpu };
        if (g.priceUSD && g.vramGB) g.pricePerGb = Number((Number(g.priceUSD) / Number(g.vramGB)).toFixed(2));
        if (g.xianyu_cny && g.vramGB) g.cnyPerGb = Number((Number(g.xianyu_cny) / Number(g.vramGB)).toFixed(1));
        if (g.fp16TFLOPS && g.powerW) g.tflopsPerWatt = Number((Number(g.fp16TFLOPS) / Number(g.powerW)).toFixed(4));
        return g;
      }),
    postInit: gpuPostInit,
  };
}

function modelsConfig(): FlatPageConfig {
  return {
    pageId: "models",
    dataUrl: "data/models.json",
    fieldsUrl: "data/model-fields.json",
    ruleEngineOptions: { invalidNumberBehavior: "reject" },
    defaultSortField: "name",
    defaultSortDirection: "asc",
    filters: [
      { selectId: "modalityFilter", key: "multimodal", allLabel: "全部模态" },
      {
        selectId: "statusFilter", key: "verification.status", allLabel: "全部状态",
        labelFn: verificationStatusLabel,
      },
      { selectId: "vendorFilter", key: "vendor", allLabel: "全部厂商" },
    ],
    summaryMetrics: [
      { id: "visibleCount", compute: (rows) => String(rows.length) },
      {
        id: "bestElo",
        compute: (rows) => {
          const verified = rows.filter((r) => (r.verification as Record<string, unknown>)?.status === "verified").length;
          return `${verified}/${rows.length}`;
        },
      },
      {
        id: "bestHumanEval",
        compute: (rows) => {
          const count = rows.filter((r) => {
            const pricing = r.pricing as Record<string, unknown> | undefined;
            const official = pricing?.official as Record<string, unknown> | undefined;
            return official?.in && official?.out;
          }).length;
          return `${count}/${rows.length}`;
        },
      },
    ],
    enrichRows: (rows) =>
      rows.map((m) => {
        const model = { ...m } as Record<string, unknown>;
        const pricing = model.pricing as Record<string, unknown> | undefined;
        if (pricing?.deepseek_official && !pricing.official) {
          pricing.official = pricing.deepseek_official;
        }
        if (!model.pricing) model.pricing = {};
        return model;
      }),
    computeFieldCoverage: (field, rows) => {
      let count = 0;
      for (const row of rows) {
        const val = getNestedValue(row, field.key);
        if (val !== null && val !== undefined) count++;
      }
      return { percent: rows.length ? (count / rows.length) * 100 : 0, count };
    },
    extraSearchKeys: ["id", "verification.status"],
    formatCellOverride: (row, field, stat, ctx) => {
      const val = getNestedValue(row, field.key);
      const verified = ctx.isVerified(row, field.key);
      const cls = verified ? "verified-cell" : "unverified-cell";
      const sourceTitle = ctx.getSourceTitle(row);

      if (field.key === "multimodal" && val != null && val !== "") {
        return `<span class="tag multimodal ${cls}" title="${escapeAttr(sourceTitle)}">${escapeHtml(String(val))}</span>`;
      }
      if (field.key === "copilotMultiplier" && val != null && val !== "") {
        return `<span class="${cls}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">${escapeHtml(String(val))}x</span>`;
      }
      if (field.key === "arenaElo" && field.heatmap && stat && typeof val === "number") {
        const lengthPercent = ((val - stat.min) / (stat.max - stat.min || 1)) * 100;
        const src = row.arenaEloSource as string | undefined;
        const note = row.arenaEloNote as string | undefined;
        const checkedAt = row.arenaEloCheckedAt as string | undefined;
        let tooltipText = src || (verified ? sourceTitle : "未核验");
        if (note) tooltipText += `\n⚠ ${note}`;
        if (checkedAt) tooltipText += `\n📅 ${checkedAt}`;
        const staleIndicator = note ? " stale" : "";
        const color = getHeatmapColor(lengthPercent);
        return `<div class="heatmap-container mini ${cls}${staleIndicator}" title="${escapeAttr(tooltipText)}"><div class="heatmap-bar" style="width: ${lengthPercent}%; background: ${color}"></div><span class="heatmap-value">${escapeHtml(String(val))}</span></div>`;
      }
      return null;
    },
  };
}

function agentToolsConfig(): FlatPageConfig {
  const accessFilters = [
    { value: "all", label: "全部接入" },
    { value: "byok", label: "BYOK" },
    { value: "openai-compatible", label: "OpenAI-compatible" },
    { value: "local-model", label: "本地模型" },
    { value: "mcp", label: "MCP" },
    { value: "background-agent", label: "后台 Agent" },
  ];
  return {
    pageId: "agent-tools",
    dataUrl: "data/agent-tools.json",
    fieldsUrl: "data/agent-tool-fields.json",
    ruleEngineOptions: { invalidNumberBehavior: "reject", booleanSupport: true },
    defaultSortField: "name",
    defaultSortDirection: "asc",
    filters: [
      { selectId: "typeFilter", key: "categoryTags", allLabel: "全部类型", flatArrays: true },
      { selectId: "deploymentFilter", key: "deploymentTags", allLabel: "全部形态", flatArrays: true },
      {
        selectId: "accessFilter", key: "_access", allLabel: "全部接入",
        labelFn: (v) => accessFilters.find((a) => a.value === v)?.label ?? v,
      },
      { selectId: "vendorFilter", key: "vendor", allLabel: "全部厂商" },
      {
        selectId: "statusFilter", key: "verification.status", allLabel: "全部状态",
        labelFn: verificationStatusLabel,
      },
    ],
    summaryMetrics: [
      { id: "visibleCount", compute: (rows) => String(rows.length) },
      {
        id: "sourcedCount",
        compute: (rows) => String(rows.filter((r) => {
          const v = r.verification as Record<string, unknown> | undefined;
          return Array.isArray(v?.sources) && (v!.sources as unknown[]).length > 0;
        }).length),
      },
      {
        id: "freeCount",
        compute: (rows) => String(rows.filter((r) => {
          const p = r.pricing as Record<string, unknown> | undefined;
          return p?.freeTier === true;
        }).length),
      },
      {
        id: "openSourceCount",
        compute: (rows) => String(rows.filter((r) => {
          const p = r.pricing as Record<string, unknown> | undefined;
          return p?.openSource === true;
        }).length),
      },
    ],
    formatCellOverride: (row, field, _stat, ctx) => {
      if (field.key !== "name") return null;
      const val = getNestedValue(row, field.key);
      if (val == null || val === "") return null;
      const verified = ctx.isVerified(row, field.key);
      const cls = verified ? "verified-cell" : "unverified-cell";
      const sourceTitle = ctx.getSourceTitle(row);
      const logoUrl = getNestedValue(row, "logoUrl") as string | undefined;
      const officialUrl = getNestedValue(row, "officialUrl") as string | undefined;
      const imgSrc = logoUrl || (officialUrl ? getFaviconUrl(officialUrl) : "");
      const logoHtml = imgSrc
        ? `<img class="tool-logo" src="${escapeAttr(imgSrc)}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : "";
      return `<span class="tool-name-cell ${cls}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">${logoHtml}${escapeHtml(getValueAsText(val))}</span>`;
    },
  };
}

// ---- Favicon helper (agent-tools logos) ----
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  } catch {
    return "";
  }
}

// ---- Verification label helper ----
function verificationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    verified: "已核验", partial: "部分核验", generated: "生成/待核验",
    unverified: "未核验", unknown: "未知",
  };
  return labels[status] ?? status;
}

// ---- Cell context ----
function getCellContext(): CellContext {
  return {
    isVerified: (row, key) => {
      const v = row.verification as Record<string, unknown> | undefined;
      return Array.isArray(v?.verifiedFields) && (v!.verifiedFields as string[]).includes(key);
    },
    getSourceTitle: (row) => {
      const v = row.verification as Record<string, unknown> | undefined;
      const sources = v?.sources as Array<{ label?: string; url?: string }> | undefined;
      if (!Array.isArray(sources) || !sources.length) return "";
      return sources.map((s) => s.label ?? "").join(" / ");
    },
    vendorLinks: state.vendorLinks,
  };
}

// ---- Filtering ----
function getFilteredRows(): Record<string, unknown>[] {
  const cfg = state.config!;
  const fields = state.fieldDefs;
  const searchFields: FieldDef[] = [
    ...fields,
    ...(cfg.extraSearchKeys ?? []).map((k) => ({ key: k, label: k, type: "text" as const, visible: false })),
  ];

  let rows = state.allRows.filter((r) => matchesGlobalSearch(r, state.globalSearch, searchFields, getNestedValue));
  rows = rows.filter((r) => matchesRules(r, state.rules, fields, cfg.ruleEngineOptions));

  // Apply dropdown filters
  for (const filter of cfg.filters) {
    const select = q<HTMLSelectElement>(filter.selectId);
    if (!select) continue;
    const value = select.value;
    if (value === "all") continue;

    if (filter.key === "_access") {
      rows = rows.filter((r) => matchAccessFilter(r, value));
    } else if (filter.flatArrays) {
      rows = rows.filter((r) => matchesArrayFilter(
        getNestedValue(r, filter.key) as string[] | undefined, value,
      ));
    } else {
      rows = rows.filter((r) => String(getNestedValue(r, filter.key) ?? "").toLowerCase() === value.toLowerCase());
    }
  }

  return rows;
}

function matchAccessFilter(row: Record<string, unknown>, value: string): boolean {
  const access = row.access as Record<string, unknown> | undefined;
  const integrations = row.integrations as Record<string, unknown> | undefined;
  const capabilities = row.capabilities as Record<string, unknown> | undefined;
  switch (value) {
    case "byok": return access?.byok === true;
    case "openai-compatible": return access?.openAICompatible === true;
    case "local-model": return access?.localModel === true;
    case "mcp": return integrations?.mcp === true;
    case "background-agent": return capabilities?.backgroundAgent === true;
    default: return true;
  }
}

// ---- Sorting ----
function sortRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const field = state.fieldDefs.find((f) => f.key === state.sortField);
  return [...rows].sort((a, b) => {
    const va = getNestedValue(a, state.sortField);
    const vb = getNestedValue(b, state.sortField);
    const result = compareValues(va, vb, field);
    return state.sortDirection === "asc" ? result : -result;
  });
}

function compareValues(a: unknown, b: unknown, field?: FieldDef): number {
  const aMissing = a === null || a === undefined || a === "";
  const bMissing = b === null || b === undefined || b === "";
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (field?.type === "number") {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  }
  if (field?.type === "date") {
    const ta = new Date(String(a)).getTime();
    const tb = new Date(String(b)).getTime();
    if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
  }
  // contextWindow special case: parse K/M/B suffixes
  if (field?.key === "contextWindow") {
    const pa = parseTokenCount(String(a));
    const pb = parseTokenCount(String(b));
    if (pa !== null && pb !== null) return pa - pb;
  }
  return sortCollator.compare(String(a), String(b));
}

function parseTokenCount(s: string): number | null {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
  if (!m) return null;
  const mult: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
  return Number(m[1]) * (mult[m[2]?.toUpperCase()] ?? 1);
}

// ---- Rendering ----
function render() {
  const filtered = getFilteredRows();
  const sorted = sortRows(filtered);
  const activeFields = state.fieldDefs.filter((f) => state.visibleColumns.has(f.key));

  renderSummary(filtered);
  renderTable(sorted, activeFields);
}

function renderSummary(rows: Record<string, unknown>[]) {
  const cfg = state.config!;
  for (const metric of cfg.summaryMetrics) {
    const el = q(metric.id);
    if (el) el.textContent = metric.compute(rows, state.allRows);
  }
}

function renderTable(rows: Record<string, unknown>[], activeFields: FieldDef[]) {
  const thead = q("tableHead");
  const tbody = q("tableBody");
  if (!thead || !tbody) return;

  const stats = computeColumnStats(rows, activeFields);
  const ctx = getCellContext();

  // Header
  thead.innerHTML = `<tr>${activeFields
    .map((field) => {
      const mark = state.sortField === field.key
        ? (state.sortDirection === "asc" ? " ↑" : " ↓") : "";
      const source = field.source
        ? ` <a href="${escapeAttr(field.source)}" target="_blank" class="source-icon" title="查看字段来源">🔗</a>` : "";
      return `<th><button type="button" data-sort="${escapeAttr(field.key)}" title="${escapeAttr(field.description ?? field.label)}">${escapeHtml(field.label)}${mark}</button>${source}</th>`;
    })
    .join("")}</tr>`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="${activeFields.length || 1}" class="muted" style="text-align:center;padding:24px">没有匹配的记录。</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => `<tr>${activeFields
      .map((field) => `<td>${formatCell(row, field, stats[field.key] ?? null, ctx)}</td>`)
      .join("")}</tr>`)
    .join("");

  // Bind sort buttons
  thead.querySelectorAll<HTMLElement>("[data-sort]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.sort!;
      if (state.sortField === field) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = field;
        state.sortDirection = "desc";
      }
      const sortSelect = q<HTMLSelectElement>("sortField");
      if (sortSelect) sortSelect.value = state.sortField;
      const dirBtn = q("sortDirectionButton");
      if (dirBtn) dirBtn.textContent = state.sortDirection === "asc" ? "升序" : "降序";
      render();
    });
  });
}

// ---- Cell formatting ----
function formatCell(
  row: Record<string, unknown>,
  field: FieldDef,
  stat: HeatStat | null,
  ctx: CellContext,
): string {
  const val = getNestedValue(row, field.key);
  const verified = ctx.isVerified(row, field.key);
  const sourceTitle = ctx.getSourceTitle(row);
  const cls = verified ? "verified-cell" : "unverified-cell";

  // Page-specific override first
  if (state.config!.formatCellOverride) {
    const result = state.config!.formatCellOverride(row, field, stat, ctx);
    if (result !== null) return result;
  }

  if (val === null || val === undefined || val === "") {
    return `<span class="unverified-cell" title="未核验或暂无数据">-</span>`;
  }

  // Vendor with link
  if (field.key === "vendor") {
    const link = ctx.vendorLinks[String(val)];
    return link
      ? `<a href="${escapeAttr(link)}" target="_blank" class="vendor-link ${cls}" title="${escapeAttr(sourceTitle || "前往官网")}">${escapeHtml(String(val))}</a>`
      : `<span class="${cls}" title="${escapeAttr(sourceTitle)}">${escapeHtml(String(val))}</span>`;
  }

  // URL type
  if (field.type === "url") {
    const safeUrl = sanitizeUrl(val);
    if (!safeUrl) return `<span class="unverified-cell">-</span>`;
    return `<a href="${escapeAttr(safeUrl)}" target="_blank" class="source-link ${cls}" title="${escapeAttr(sourceTitle)}">打开</a>`;
  }

  // Boolean type
  if (field.type === "boolean") {
    const boolClass = Boolean(val) ? "bool-yes" : "bool-no";
    const text = Boolean(val) ? "是" : "否";
    return `<span class="tag group-boolean ${boolClass} ${cls}" title="${escapeAttr(sourceTitle)}">${text}</span>`;
  }

  // Tag list type
  if (field.type === "tag-list") {
    const arr = Array.isArray(val) ? val.filter(Boolean) : [val];
    if (!arr.length) return `<span class="unverified-cell">-</span>`;
    const group = field.tagGroup ?? "generic";
    return `<div class="tag-list">${arr.map((v) =>
      `<span class="tag group-${group} ${getToneClass(String(v), group)} ${cls}" title="${escapeAttr(sourceTitle)}">${escapeHtml(String(v))}</span>`,
    ).join("")}</div>`;
  }

  // Pricing plans type
  if (field.type === "pricing-plans") {
    const plans = Array.isArray(val) ? val : [];
    if (!plans.length) return `<span class="unverified-cell">-</span>`;
    return `<div class="plan-stack ${cls}" title="${escapeAttr(sourceTitle)}">${plans.map((plan: Record<string, unknown>) => {
      const name = escapeHtml(String(plan.name ?? "Plan"));
      const price = formatPlanPrice(plan);
      const note = plan.note ? `<span class="plan-note">${escapeHtml(String(plan.note))}</span>` : "";
      return `<div class="plan-row"><span class="plan-name">${name}</span><span class="plan-price">${price}</span></div>${note}`;
    }).join("")}</div>`;
  }

  // Heatmap (number or date)
  if (field.heatmap && stat) {
    let heatmapNum: number | null = null;
    if (field.type === "date" && val && !isNaN(new Date(String(val)).getTime())) {
      heatmapNum = new Date(String(val)).getTime();
    } else if (isUsableNumber(val)) {
      heatmapNum = Number(val);
    }
    if (heatmapNum !== null) {
      const range = stat.max - stat.min || 1;
      const lengthPercent = ((heatmapNum - stat.min) / range) * 100;
      const colorPercent = field.inverseHeatmap ? 100 - lengthPercent : lengthPercent;
      const color = getHeatmapColor(colorPercent);
      let displayStr: string;
      if (field.type === "date") displayStr = String(val);
      else if (field.key.includes("USD") || field.key === "msrpUSD") displayStr = `$${formatNumber(heatmapNum)}`;
      else if (field.key === "xianyu_cny") displayStr = `¥${formatNumber(heatmapNum)}`;
      else if (field.key === "pricePerGb") displayStr = `$${heatmapNum.toFixed(2)}`;
      else if (field.key === "cnyPerGb") displayStr = `¥${heatmapNum.toFixed(1)}`;
      else if (field.derived) displayStr = heatmapNum < 1 ? heatmapNum.toFixed(4) : heatmapNum.toFixed(3);
      else if (field.displayPrefix) displayStr = `${field.displayPrefix}${formatNumber(heatmapNum)}`;
      else displayStr = formatNumber(heatmapNum);
      return `<div class="heatmap-container mini ${cls}" title="${escapeAttr(displayStr)}"><div class="heatmap-bar" style="width:${Math.max(0, Math.min(100, lengthPercent)).toFixed(1)}%;background:${color}"></div><span class="heatmap-value">${escapeHtml(displayStr)}</span></div>`;
    }
  }

  // Number type
  if (field.type === "number") {
    if (typeof val === "number") return `<span class="${cls}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">${formatNumber(val)}</span>`;
    return `<span class="${cls}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">${escapeHtml(String(val))}</span>`;
  }

  // Default: text
  return `<span class="${cls}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">${escapeHtml(getValueAsText(val))}</span>`;
}

function formatPlanPrice(plan: Record<string, unknown>): string {
  if (plan.pricingUrl) {
    return `<a href="${escapeAttr(String(plan.pricingUrl))}" target="_blank" class="source-link">价格页 ↗</a>`;
  }
  if (plan.priceLabel) return escapeHtml(String(plan.priceLabel));
  if (typeof plan.priceUSD === "number") {
    const period = plan.period ? ` / ${escapeHtml(String(plan.period))}` : "";
    return `$${formatNumber(plan.priceUSD)}${period}`;
  }
  return "Custom";
}

// ---- Filter dropdowns ----
function renderFilterDropdowns() {
  const cfg = state.config!;
  for (const filter of cfg.filters) {
    const select = q<HTMLSelectElement>(filter.selectId);
    if (!select) continue;

    let values: string[];
    if (filter.key === "_access") {
      values = ["byok", "openai-compatible", "local-model", "mcp", "background-agent"];
    } else {
      values = uniqueValues(state.allRows, filter.key, { flatArrays: filter.flatArrays ?? false });
    }

    const labelFn = filter.labelFn ?? ((v: string) => v);
    select.innerHTML = `<option value="all">${filter.allLabel}</option>${
      values.map((v) => `<option value="${escapeAttr(v)}">${escapeHtml(labelFn(v))}</option>`).join("")
    }`;
  }

  // Sort field dropdown
  const sortSelect = q<HTMLSelectElement>("sortField");
  if (sortSelect) {
    sortSelect.innerHTML = state.fieldDefs
      .map((f) => `<option value="${escapeAttr(f.key)}">${escapeHtml(f.label)}</option>`)
      .join("");
    sortSelect.value = state.sortField;
  }

  // Direction button
  const dirBtn = q("sortDirectionButton");
  if (dirBtn) dirBtn.textContent = state.sortDirection === "asc" ? "升序" : "降序";
}

// ---- Column picker ----
function renderColumnPickerUI() {
  const container = q("columnPicker");
  if (!container) return;

  const cfg = state.config!;
  const items: ColumnPickerItem[] = state.fieldDefs.map((field) => {
    const item: ColumnPickerItem = { key: field.key, label: field.label };
    if (cfg.computeFieldCoverage) {
      const cov = cfg.computeFieldCoverage(field, state.allRows);
      if (cov) {
        item.coveragePercent = cov.percent;
        item.countLabel = `${cov.count}`;
        const hue = cov.percent > 66 ? 142 : cov.percent > 33 ? 45 : 0;
        item.coverageColor = `hsl(${hue}, 60%, 55%)`;
      }
    }
    return item;
  });

  renderColumnPicker(container, items, state.visibleColumns, {
    onSelectionChanged: (selected) => {
      state.visibleColumns = selected.size === 0 ? new Set(state.defaultVisible) : selected;
      renderColumnPickerUI();
      render();
    },
  });
  syncPickerState();
}

function syncPickerState() {
  const btn = q("toggleColumnsButton");
  if (btn) {
    syncColumnPickerState(btn, state.visibleColumns.size, state.fieldDefs.length);
  }
}

// ---- Rules UI ----
function renderRulesUI() {
  const container = q("filterRules");
  if (!container) return;
  renderRules(container, state.rules, state.fieldDefs, {
    onRulesChanged: () => render(),
  });
}

// ---- Events ----
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
    const defaultField = state.fieldDefs.find((f) => f.type === "number")?.key
      ?? state.fieldDefs[0]?.key ?? "name";
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

// ---- CSV export ----
function exportCsv() {
  const activeFields = state.fieldDefs.filter((f) => state.visibleColumns.has(f.key));
  const rows = sortRows(getFilteredRows());
  const header = activeFields.map((f) => f.label);
  const body = rows.map((row) =>
    activeFields.map((f) => {
      const val = getNestedValue(row, f.key);
      return getValueAsText(val);
    }),
  );
  const csv = buildCsv(header, body);
  downloadBlob(`${state.config!.pageId}-table.csv`, csv);
}

// Boot
init();
