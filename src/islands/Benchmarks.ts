/**
 * Client-side island: benchmark metadata comparison table +
 * model × benchmark per-task cost/token heatmap + histograms.
 */

import { dataUrl } from "../lib/data-url";
import { escapeHtml, escapeAttr } from "../lib/escape";
import { sortCollator, formatNumber } from "../lib/format";
import { getHeatmapColor, getHeatmapPercent } from "../lib/heatmap";
import { renderColumnPicker, syncColumnPickerState } from "../lib/column-picker";

// ── Types ──

interface BenchAxisDef {
  metric: string;
  label: string;
  unit?: string;
  direction?: "higher-better" | "lower-better";
}

interface BenchRegistryEntry {
  name: string;
  url?: string;
  updated?: string;
  note?: string;
  axes?: BenchAxisDef[];
}

interface BenchRecord {
  bench: string;
  model: string;
  vendor: string;
  tool?: string;
  effort?: string;
  source?: string;
  metrics: Record<string, unknown>;
}

interface BenchmarksFile {
  updated: string;
  benchmarks: Record<string, BenchRegistryEntry>;
  tools: Record<string, { name?: string }>;
  records: BenchRecord[];
}

interface BenchLink {
  label: string;
  url: string;
}

type ModalityKey = "text" | "search" | "code" | "tools" | "image" | "pdf" | "video" | "audio";

interface BenchMeta {
  venue?: string;
  arxiv?: string;
  github?: string;
  huggingface?: string;
  issues?: string;
  links?: BenchLink[];
  released?: string;
  listUpdated?: string;
  openOnly?: boolean;
  domain?: string;
  itemSource?: string;
  numItems?: string;
  numItemsNum?: number;
  modalities?: Partial<Record<ModalityKey, number>>;
  capabilities?: string;
  evalMode?: string;
  runMode?: string;
  toolDeps?: string;
  envDeps?: string;
  agentScope?: string;
  sensitive?: string;
  refusal?: string;
  refusalNote?: string;
  selfRun?: "easy" | "medium" | "hard" | "no";
  selfRunNote?: string;
  aggregators?: string[];
  otherInfo?: string;
}

interface MetaFile {
  selfRunLevels: Record<string, string>;
  meta: Record<string, BenchMeta>;
}

// ── Per-task cost/token estimation ──
// Metrics come in two shapes: per-task (costPerTestUSD...) and whole-run
// (costUSD, costKUSD, tokensB...). Whole-run values are divided by the
// benchmark's curated item count and flagged as estimates ("≈").

const COST_PER_ITEM_KEYS = ["costPerTestUSD", "costPerTaskUSD"] as const;
const COST_WHOLE_RUN: ReadonlyArray<readonly [string, number]> = [
  ["costPerRunUSD", 1],
  ["costRunUSD", 1],
  ["costUSD", 1],
  ["costKUSD", 1000],
];
const TOK_PER_ITEM_TO_M: ReadonlyArray<readonly [string, number]> = [
  ["tokensPerTestM", 1],
  ["tokensPerTask", 1e-6],
  ["avgTokensM", 1],
];
const TOK_WHOLE_RUN_TO_M: ReadonlyArray<readonly [string, number]> = [
  ["tokensB", 1000],
  ["totalTokensK", 1e-3],
  ["outputTokensK", 1e-3],
];

interface Estimate {
  value: number;
  estimated: boolean;
  metric: string;
  record: BenchRecord;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function estimatePerTask(rec: BenchRecord, kind: "cost" | "tokens", items?: number): Estimate | null {
  const m = rec.metrics;
  if (kind === "cost") {
    for (const k of COST_PER_ITEM_KEYS) {
      const v = num(m[k]);
      if (v !== null) return { value: v, estimated: false, metric: k, record: rec };
    }
    if (items && items > 0) {
      for (const [k, mul] of COST_WHOLE_RUN) {
        const v = num(m[k]);
        if (v !== null) return { value: (v * mul) / items, estimated: true, metric: k, record: rec };
      }
    }
    return null;
  }
  for (const [k, mul] of TOK_PER_ITEM_TO_M) {
    const v = num(m[k]);
    if (v !== null) return { value: v * mul, estimated: false, metric: k, record: rec };
  }
  if (items && items > 0) {
    for (const [k, mul] of TOK_WHOLE_RUN_TO_M) {
      const v = num(m[k]);
      if (v !== null) return { value: (v * mul) / items, estimated: true, metric: k, record: rec };
    }
  }
  return null;
}

const SOURCE_LABELS: Record<string, string> = {
  official: "官方",
  vals: "Vals",
  epoch: "Epoch",
  "self-reported": "模型自报",
  benchleader: "BenchLeader",
  "temperature2/AA": "AA",
};

/** Aggregator-label → external site URL (only well-known aggregator roots). */
const AGG_LINKS: Record<string, string> = {
  Vals: "https://www.vals.ai/benchmarks",
  Epoch: "https://epoch.ai/benchmarks",
  AA: "https://artificialanalysis.ai/",
  BenchLeader: "https://www.benchleader.com/",
  "ARC Prize": "https://arcprize.org/",
  LMArena: "https://arena.ai/",
  temperature2: "https://temperature2.com/",
  "官方（tb4official 对应）": "https://www.tbench.ai/leaderboard/terminal-bench/4.0",
};

const SELF_RUN_LABELS: Record<string, string> = {
  easy: "易自测",
  medium: "需环境",
  hard: "重设施",
  no: "不可自测",
};

/** Modality glyphs: requirement tiers 1=必需 2=回退/降档 3=可选增益 */
const MODALITIES: ReadonlyArray<readonly [ModalityKey, string, string]> = [
  ["text", "文", "文本"],
  ["search", "搜", "联网搜索"],
  ["code", "码", "代码执行"],
  ["tools", "具", "其他工具"],
  ["image", "图", "图片"],
  ["pdf", "档", "PDF/文档"],
  ["video", "视", "视频"],
  ["audio", "音", "音频"],
];
const MOD_TIER = ["", "¹", "²", "³"] as const;

// ── Derived per-bench stats ──

interface BenchStats {
  id: string;
  reg: BenchRegistryEntry;
  meta: BenchMeta;
  records: BenchRecord[];
  models: Set<string>;
  tools: Set<string>;
  sources: string[];
  costStats: { min: number; med: number; max: number; n: number; anyEst: boolean } | null;
  tokStats: { min: number; med: number; max: number; n: number; anyEst: boolean } | null;
  sota: { model: string; value: number; unit: string; source: string } | null;
}

function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** log that tolerates 0/negative values (floors them so scales stay finite) */
const safeLog = (v: number) => Math.log(Math.max(v, 1e-9));

function statOf(est: (Estimate | null)[]) {
  const ok = est.filter((e): e is Estimate => e !== null);
  if (!ok.length) return null;
  const vals = ok.map((e) => e.value);
  return {
    min: Math.min(...vals),
    med: median(vals),
    max: Math.max(...vals),
    n: vals.length,
    anyEst: ok.some((e) => e.estimated),
  };
}

/** Pick the primary score axis and find its best record. */
function sotaOf(b: { axes?: BenchAxisDef[] }, records: BenchRecord[]): BenchStats["sota"] {
  const axis =
    b.axes?.find((a) => a.direction === "higher-better") ??
    b.axes?.find((a) => a.direction !== "lower-better") ??
    b.axes?.[0];
  if (!axis) return null;
  const invert = axis.direction === "lower-better";
  let best: { model: string; value: number; source: string } | null = null;
  for (const r of records) {
    const v = num(r.metrics[axis.metric]);
    if (v === null) continue;
    if (!best || (invert ? v < best.value : v > best.value)) {
      best = { model: r.model, value: v, source: r.source ?? "" };
    }
  }
  return best ? { ...best, unit: axis.unit ?? "" } : null;
}

function fmtUSD(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 100) return `$${Math.round(v)}`;
  if (v >= 1) return `$${v.toFixed(1)}`;
  return `$${v.toFixed(2)}`;
}

function fmtM(v: number): string {
  if (v >= 1000) return `${formatNumber(Math.round(v / 1000))}B`;
  if (v >= 1) return `${v.toFixed(v >= 10 ? 0 : 1)}M`;
  return `${Math.round(v * 1000)}K`;
}

// ── State ──

interface Column {
  key: string;
  label: string;
  title?: string;
  /** inline style applied to the th (e.g. width control) */
  thStyle?: string;
  val: (b: BenchStats) => string | number | null;
  html?: (b: BenchStats) => string;
  cls?: string;
  locked?: boolean;
}

interface State {
  benches: BenchStats[];
  metaFile: MetaFile | null;
  statRanges: { rec: { min: number; max: number }; mod: { min: number; max: number }; tool: { min: number; max: number } };
  hiddenCols: Set<string>;
  search: string;
  domain: string;
  runMode: string;
  selfRun: string;
  agg: string;
  sortKey: string;
  sortDir: 1 | -1;
  heatMetric: "cost" | "tokens";
  histMetric: "cost" | "tokens";
  heatSearch: string;
}

const LS_COLS = "bench-hidden-cols";

const state: State = {
  benches: [],
  metaFile: null,
  statRanges: { rec: { min: 0, max: 0 }, mod: { min: 0, max: 0 }, tool: { min: 0, max: 0 } },
  hiddenCols: new Set(),
  search: "",
  domain: "",
  runMode: "",
  selfRun: "",
  agg: "",
  sortKey: "records",
  sortDir: -1,
  heatMetric: "cost",
  histMetric: "cost",
  heatSearch: "",
};

const q = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const dash = (v: string | undefined | null) =>
  v && v !== "—"
    ? `<span class="clamp2" title="${escapeAttr(v)}">${escapeHtml(v)}</span>`
    : '<span class="muted">—</span>';

function linkChip(url: string, label: string, cls = ""): string {
  return `<a class="bench-chip ${cls}" href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}

// ── compact icon chips (keep paper/oss columns narrow) ──

const ARXIV_ICON = `${String(import.meta.env.BASE_URL ?? "").replace(/\/+$/, "")}/icons/arxiv.png`;
const ICON_GH = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>`;
const ICON_ISSUE = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7.6"/><path d="M8 4.4v4.2" stroke="var(--input-bg)" stroke-width="1.9" stroke-linecap="round"/><circle cx="8" cy="11.4" r="1" fill="var(--input-bg)"/></svg>`;

function iconChip(url: string, svg: string, title: string): string {
  return `<a class="bench-chip icon-chip" href="${escapeAttr(url)}" target="_blank" rel="noopener" title="${escapeAttr(title)}">${svg}</a>`;
}

function arxivChip(id: string): string {
  return `<a class="bench-chip arxiv-chip" href="https://arxiv.org/abs/${escapeAttr(id)}" target="_blank" rel="noopener" title="arXiv:${escapeAttr(id)}"><img src="${ARXIV_ICON}" alt="arXiv" loading="lazy" />${escapeHtml(id)}</a>`;
}

/** resolve an aggregator/source label to a clickable URL, if known. */
function aggUrl(label: string, home?: string): string | null {
  if (AGG_LINKS[label]) return AGG_LINKS[label];
  const base = label.replace(/（.*）/, "");
  if (AGG_LINKS[base]) return AGG_LINKS[base];
  if (base === "官方" && home) return home;
  return null;
}

function heatCell(v: number, stat: { min: number; max: number }): string {
  return v <= 0 ? "" : ` style="background:${getHeatmapColor(getHeatmapPercent(v, stat))}"`;
}

function modalityHtml(meta: BenchMeta): string {
  const mods = meta.modalities;
  if (!mods) return '<span class="muted">—</span>';
  const cells = MODALITIES.filter(([k]) => (mods[k] ?? 0) > 0).map(([k, glyph, name]) => {
    const tier = mods[k] ?? 0;
    return `<span class="mod mod-${k}" title="${name}·${["不涉及", "必需", "回退/降档", "可选增益"][tier]}">${glyph}<sup>${MOD_TIER[tier]}</sup></span>`;
  });
  return cells.join("") || '<span class="muted">—</span>';
}

// ── Columns ──

const columns: Column[] = [
  {
    key: "name", label: "榜单", cls: "bench-name-cell", locked: true,
    val: (b) => b.reg.name,
    html: (b) => {
      const home = b.reg.url ? ` <a href="${escapeAttr(b.reg.url)}" target="_blank" rel="noopener">↗</a>` : "";
      return `<strong>${escapeHtml(b.reg.name)}</strong>${home}`;
    },
  },
  {
    key: "paper", label: "论文/发表", thStyle: "width:110px", cls: "wrap-cell",
    val: (b) => `${b.meta.arxiv ?? ""} ${b.meta.venue ?? ""}`,
    html: (b) => {
      const parts: string[] = [];
      if (b.meta.arxiv) parts.push(arxivChip(b.meta.arxiv));
      if (b.meta.venue) parts.push(`<span class="muted small">${escapeHtml(b.meta.venue)}</span>`);
      return parts.join(" ") || '<span class="muted">—</span>';
    },
  },
  {
    key: "oss", label: "开源/链接", thStyle: "width:110px", cls: "wrap-cell",
    val: (b) => `${b.meta.github ?? ""} ${b.meta.huggingface ?? ""} ${(b.meta.links ?? []).map((l) => l.label).join(" ")}`,
    html: (b) => {
      const parts: string[] = [];
      if (b.meta.github) parts.push(iconChip(`https://github.com/${b.meta.github}`, ICON_GH, `GitHub: ${b.meta.github}`));
      if (b.meta.huggingface) parts.push(`<a class="bench-chip icon-chip emoji-chip" href="${escapeAttr(`https://huggingface.co/datasets/${b.meta.huggingface}`)}" target="_blank" rel="noopener" title="${escapeAttr(`HF: ${b.meta.huggingface}`)}">🤗</a>`);
      if (b.meta.issues) parts.push(iconChip(`https://github.com/${b.meta.issues}`, ICON_ISSUE, `Issues: ${b.meta.issues}`));
      for (const l of b.meta.links ?? []) parts.push(linkChip(l.url, l.label));
      return parts.join(" ") || '<span class="muted">—</span>';
    },
  },
  {
    key: "records", label: "记录", title: "站内收录的评测记录数", thStyle: "width:44px;white-space:nowrap",
    val: (b) => b.records.length,
    html: (b) => String(b.records.length),
  },
  {
    key: "models", label: "模型", title: "被评测的模型数", thStyle: "width:44px;white-space:nowrap",
    val: (b) => b.models.size,
    html: (b) => String(b.models.size),
  },
  {
    key: "tools", label: "工具", title: "涉及的 agent/工具数（0=纯模型）", thStyle: "width:44px;white-space:nowrap",
    val: (b) => b.tools.size,
    html: (b) => String(b.tools.size),
  },
  { key: "domain", label: "任务主题", thStyle: "width:78px;white-space:nowrap", val: (b) => b.meta.domain ?? "", html: (b) => dash(b.meta.domain) },
  { key: "itemSource", label: "题目来源", cls: "wrap-cell", val: (b) => b.meta.itemSource ?? "", html: (b) => dash(b.meta.itemSource) },
  {
    key: "numItems", label: "题目数量",
    val: (b) => b.meta.numItemsNum ?? -1,
    html: (b) => dash(b.meta.numItems),
  },
  {
    key: "released", label: "发布时间",
    val: (b) => b.meta.released ?? "zz",
    html: (b) => dash(b.meta.released),
  },
  {
    key: "benchUpdated", label: "榜单更新", title: "榜单自身的更新时间/节奏", thStyle: "width:78px;white-space:nowrap",
    val: (b) => b.meta.listUpdated ?? "zz",
    html: (b) => dash(b.meta.listUpdated),
  },
  {
    key: "pulled", label: "本站拉取", title: "本站最近一次拉取该榜单数据的时间",
    val: (b) => b.reg.updated ?? "zz",
    html: (b) => (b.reg.updated ? `<span class="num-cell" title="本站数据拉取时间">${escapeHtml(b.reg.updated)}</span>` : '<span class="muted">—</span>'),
  },
  {
    key: "sota", label: "当前 SOTA", title: "首个高优指标的最高记录 · 拉取时间见更新列",
    val: (b) => b.sota?.value ?? -1,
    html: (b) => {
      if (!b.sota) return '<span class="muted">—</span>';
      const s = b.sota;
      const src = SOURCE_LABELS[s.source] ?? s.source;
      const pull = b.reg.updated ? ` · 拉取 ${b.reg.updated}` : "";
      return `<span title="${escapeAttr(`${s.model} · ${s.value}${s.unit} · ${src}${pull}`)}">${escapeHtml(s.model)} <strong class="num-cell">${formatNumber(s.value)}${s.unit ? escapeHtml(s.unit) : ""}</strong></span>`;
    },
  },
  {
    key: "openOnly", label: "仅开源", title: "榜单是否仅收录开源权重模型", thStyle: "width:54px;white-space:nowrap",
    val: (b) => (b.meta.openOnly === undefined ? "zz" : b.meta.openOnly ? "是" : "否"),
    html: (b) => {
      if (b.meta.openOnly === undefined) return '<span class="muted">—</span>';
      return b.meta.openOnly ? '<span class="src-chip">仅开源</span>' : '<span class="muted">否</span>';
    },
  },
  { key: "capabilities", label: "能力维度", cls: "wrap-cell", val: (b) => b.meta.capabilities ?? "", html: (b) => dash(b.meta.capabilities) },
  {
    key: "mods", label: "输入/工具需求", title: "角标：¹必需 ²不支持则回退/转换 ³可选增益",
    val: (b) => MODALITIES.map(([k]) => b.meta.modalities?.[k] ?? 0).join(""),
    html: (b) => modalityHtml(b.meta),
  },
  { key: "evalMode", label: "评价模式", cls: "wrap-cell", val: (b) => b.meta.evalMode ?? "", html: (b) => dash(b.meta.evalMode) },
  { key: "runMode", label: "运行方式", cls: "wrap-cell", val: (b) => b.meta.runMode ?? "", html: (b) => dash(b.meta.runMode) },
  { key: "agentScope", label: "评测对象", cls: "wrap-cell", val: (b) => b.meta.agentScope ?? "", html: (b) => dash(b.meta.agentScope) },
  {
    key: "refusal", label: "拒答处理", title: "对模型 reject/fallback 的计分口径",
    val: (b) => `${b.meta.sensitive ?? ""} ${b.meta.refusal ?? ""}`,
    html: (b) => {
      const warn = b.meta.sensitive ? `<span class="sens-chip" title="含${escapeAttr(b.meta.sensitive)}敏感内容">⚠${escapeHtml(b.meta.sensitive)}</span> ` : "";
      if (!b.meta.refusal || b.meta.refusal === "—") return warn + '<span class="muted">—</span>';
      const note = b.meta.refusalNote ?? "";
      return warn + `<span class="ref-chip"${note ? ` title="${escapeAttr(note)}"` : ""}>${escapeHtml(b.meta.refusal)}</span>`;
    },
  },
  { key: "toolDeps", label: "工具依赖", cls: "wrap-cell", val: (b) => b.meta.toolDeps ?? "", html: (b) => dash(b.meta.toolDeps) },
  { key: "envDeps", label: "环境依赖", cls: "wrap-cell", val: (b) => b.meta.envDeps ?? "", html: (b) => dash(b.meta.envDeps) },
  {
    key: "agg", label: "收录/复现", cls: "wrap-cell",
    val: (b) => [...b.sources, ...(b.meta.aggregators ?? [])].join(" "),
    html: (b) => {
      const labels = new Set<string>();
      for (const s of b.sources) labels.add(SOURCE_LABELS[s] ?? s);
      for (const a of b.meta.aggregators ?? []) labels.add(a);
      if (!labels.size) return '<span class="muted">—</span>';
      return [...labels]
        .map((l) => {
          const url = aggUrl(l, b.reg.url);
          return url
            ? `<a class="src-chip src-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(l)}↗</a>`
            : `<span class="src-chip">${escapeHtml(l)}</span>`;
        })
        .join(" ");
    },
  },
  {
    key: "cost", label: "单题成本（min–med–max）",
    val: (b) => b.costStats?.med ?? -1,
    html: (b) => {
      if (!b.costStats) return '<span class="muted">—</span>';
      const s = b.costStats;
      const est = s.anyEst ? "≈" : "";
      const lo = safeLog(s.min), hi = safeLog(s.max);
      const pct = (v: number) => (hi === lo ? 50 : ((safeLog(v) - lo) / (hi - lo)) * 100);
      return `<span class="cost-cell" title="${est}${fmtUSD(s.min)} – ${est}${fmtUSD(s.med)} – ${est}${fmtUSD(s.max)} · n=${s.n}">
        ${est}${fmtUSD(s.min)} <span class="cost-range"><span class="cost-mid" style="left:${pct(s.med)}%"></span></span> ${est}${fmtUSD(s.max)}
      </span>`;
    },
  },
  {
    key: "selfRun", label: "自测",
    val: (b) => b.meta.selfRun ?? "zz",
    html: (b) => {
      const lv = b.meta.selfRun;
      if (!lv) return '<span class="muted">—</span>';
      const note = b.meta.selfRunNote ?? state.metaFile?.selfRunLevels?.[lv] ?? "";
      return `<span class="selfrun-chip selfrun-${lv}" title="${escapeAttr(note)}">${SELF_RUN_LABELS[lv] ?? escapeHtml(lv)}</span>`;
    },
  },
  {
    key: "note", label: "备注", cls: "note-cell",
    val: (b) => `${b.reg.note ?? ""} ${b.meta.otherInfo ?? ""}`,
    html: (b) => {
      const parts = [b.reg.note, b.meta.otherInfo, b.meta.selfRunNote].filter(Boolean);
      if (!parts.length) return '<span class="muted">—</span>';
      return `<span class="note-text" title="${escapeAttr(parts.join(" · "))}">${escapeHtml(parts.join(" · "))}</span>`;
    },
  },
];

const visibleCols = () => columns.filter((c) => !state.hiddenCols.has(c.key));

// ── Filtering / sorting ──

function haystack(b: BenchStats): string {
  return [
    b.reg.name, b.reg.note, b.meta.domain, b.meta.capabilities, b.meta.itemSource,
    b.meta.evalMode, b.meta.runMode, b.meta.agentScope, b.meta.refusal, b.meta.sensitive,
    b.meta.otherInfo,
    ...(b.meta.aggregators ?? []),
    ...b.sources.map((s) => SOURCE_LABELS[s] ?? s),
  ].filter(Boolean).join(" ").toLowerCase();
}

function filteredBenches(): BenchStats[] {
  const term = state.search.trim().toLowerCase();
  return state.benches.filter((b) => {
    if (term && !haystack(b).includes(term)) return false;
    if (state.domain && b.meta.domain !== state.domain) return false;
    if (state.runMode && b.meta.runMode !== state.runMode) return false;
    if (state.selfRun && b.meta.selfRun !== state.selfRun) return false;
    if (state.agg) {
      const labels = new Set([...b.sources.map((s) => SOURCE_LABELS[s] ?? s), ...(b.meta.aggregators ?? [])]);
      if (!labels.has(state.agg)) return false;
    }
    return true;
  });
}

function sorted(list: BenchStats[]): BenchStats[] {
  const col = columns.find((c) => c.key === state.sortKey) ?? columns[0];
  return [...list].sort((a, b) => {
    const va = col.val(a), vb = col.val(b);
    let cmp: number;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = sortCollator.compare(String(va ?? ""), String(vb ?? ""));
    return cmp * state.sortDir;
  });
}

// ── Table render ──

function countCell(key: "records" | "models" | "tools", b: BenchStats): string {
  const stat = key === "records" ? state.statRanges.rec : key === "models" ? state.statRanges.mod : state.statRanges.tool;
  const v = key === "records" ? b.records.length : key === "models" ? b.models.size : b.tools.size;
  return `<td${heatCell(v, stat)} class="num-cell">${v}</td>`;
}

function renderTable(): void {
  const head = q("benchTableHead");
  const body = q("benchTableBody");
  if (!head || !body) return;
  const cols = visibleCols();
  const rows = sorted(filteredBenches());

  head.innerHTML = `<tr>${cols
    .map((c) => {
      const arrow = c.key === state.sortKey ? (state.sortDir === 1 ? " ▲" : " ▼") : "";
      const title = c.title ? ` title="${escapeAttr(c.title)}"` : "";
      const st = c.thStyle ? ` style="${c.thStyle}"` : "";
      return `<th data-sort-key="${c.key}"${title}${st}><button type="button">${escapeHtml(c.label)}<span class="header-unit">${arrow}</span></button></th>`;
    })
    .join("")}</tr>`;

  body.innerHTML = rows
    .map(
      (b) =>
        `<tr>${cols
          .map((c) => {
            if (c.key === "records" || c.key === "models" || c.key === "tools") return countCell(c.key, b);
            return `<td class="${c.cls ?? ""}">${c.html ? c.html(b) : escapeHtml(String(c.val(b) ?? ""))}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  head.querySelectorAll("th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = (th as HTMLElement).dataset.sortKey ?? "name";
      if (state.sortKey === key) state.sortDir = (state.sortDir * -1) as 1 | -1;
      else {
        state.sortKey = key;
        state.sortDir = ["records", "models", "tools", "cost"].includes(key) ? -1 : 1;
      }
      renderTable();
    });
  });
}

// ── Column picker ──

function renderColPicker(): void {
  const container = q("columnPicker");
  const btn = q("toggleColumnsButton");
  if (!container) return;
  const items = columns.filter((c) => !c.locked).map((c) => ({ key: c.key, label: c.label }));
  const selected = new Set(items.map((i) => i.key).filter((k) => !state.hiddenCols.has(k)));
  renderColumnPicker(container, items, selected, {
    onSelectionChanged: (next) => {
      // empty selection = "恢复默认" → show everything
      state.hiddenCols = next.size === 0
        ? new Set()
        : new Set(items.map((i) => i.key).filter((k) => !next.has(k)));
      localStorage.setItem(LS_COLS, [...state.hiddenCols].join(","));
      renderColPicker();
      renderTable();
    },
  });
  if (btn) syncColumnPickerState(btn, selected.size, items.length);
}

// ── Heatmap: model × benchmark per-task estimates ──

interface HeatCellData {
  med: number;
  anyEst: boolean;
  n: number;
  sources: Set<string>;
}

function buildHeat(kind: "cost" | "tokens") {
  const cols = new Map<string, { name: string; cells: Map<string, Estimate[]> }>();
  for (const b of state.benches) {
    const cells = new Map<string, Estimate[]>();
    for (const r of b.records) {
      const est = estimatePerTask(r, kind, b.meta.numItemsNum);
      if (!est) continue;
      const arr = cells.get(r.model) ?? [];
      arr.push(est);
      cells.set(r.model, arr);
    }
    if (cells.size) cols.set(b.id, { name: b.reg.name, cells });
  }
  const models = new Map<string, Map<string, HeatCellData>>();
  for (const [bid, col] of cols) {
    for (const [model, ests] of col.cells) {
      const vals = ests.map((e) => e.value);
      const cell: HeatCellData = {
        med: median(vals),
        anyEst: ests.some((e) => e.estimated),
        n: ests.length,
        sources: new Set(ests.map((e) => e.record.source ?? "")),
      };
      const row = models.get(model) ?? new Map<string, HeatCellData>();
      row.set(bid, cell);
      models.set(model, row);
    }
  }
  return { cols, models };
}

function renderHeatmap(): void {
  const wrap = q("heatTable");
  const summary = q("heatSummary");
  if (!wrap) return;
  const kind = state.heatMetric;
  const { cols, models } = buildHeat(kind);
  const fmt = kind === "cost" ? fmtUSD : fmtM;
  const unit = kind === "cost" ? "USD/题" : "M tokens/题";

  const colIds = [...cols.keys()].sort((a, b) => {
    const med = (id: string) => median([...cols.get(id)!.cells.values()].flat().map((e) => e.value));
    return med(a) - med(b);
  });
  const term = state.heatSearch.trim().toLowerCase();
  const rows = [...models.entries()]
    .filter(([m]) => !term || m.toLowerCase().includes(term))
    .sort((a, b) => {
      const cov = b[1].size - a[1].size;
      if (cov) return cov;
      const medA = median([...a[1].values()].map((c) => c.med));
      const medB = median([...b[1].values()].map((c) => c.med));
      return medA - medB;
    });

  const all = [...models.values()].flatMap((m) => [...m.values()].map((c) => c.med));
  if (summary) {
    summary.textContent = all.length
      ? `${rows.length} 模型 × ${colIds.length} 榜单 · ${all.length} 个记录点 · ${unit}（≈ 为整轮成本/题量估算，悬停查看明细；0 值按最低档着色）`
      : "该指标无可用记录";
  }
  if (!all.length) {
    wrap.innerHTML = "";
    return;
  }

  // log scale over positive values only; v<=0 → cheapest (green)
  const positives = all.filter((v) => v > 0);
  const lo = safeLog(positives.length ? Math.min(...positives) : 1e-9);
  const hi = safeLog(positives.length ? Math.max(...positives) : 1e-9);
  const color = (v: number) => {
    if (v <= 0) return getHeatmapColor(100);
    const pct = hi === lo ? 0 : ((safeLog(v) - lo) / (hi - lo)) * 100;
    return getHeatmapColor(100 - pct); // cheap→green, expensive→red
  };

  const headHtml = `<thead><tr><th class="heat-model-col">模型 \\ 榜单</th>${colIds
    .map((id) => `<th class="heat-bench-col"><span>${escapeHtml(cols.get(id)!.name)}</span></th>`)
    .join("")}</tr></thead>`;

  const bodyHtml = rows
    .map(([model, cells]) => {
      const tds = colIds
        .map((id) => {
          const c = cells.get(id);
          if (!c) return `<td class="heat-cell"></td>`;
          const srcs = [...c.sources].map((s) => SOURCE_LABELS[s] ?? s).filter(Boolean).join("/");
          const title = `${cols.get(id)!.name} · ${model}: ${c.anyEst ? "≈" : ""}${fmt(c.med)}/题 · n=${c.n}${srcs ? ` · ${srcs}` : ""}`;
          return `<td class="heat-cell" title="${escapeAttr(title)}" style="background:${color(c.med)}">${c.anyEst ? "≈" : ""}${fmt(c.med)}</td>`;
        })
        .join("");
      return `<tr><td class="heat-model-col" title="${escapeAttr(model)}">${escapeHtml(model)}</td>${tds}</tr>`;
    })
    .join("");

  wrap.innerHTML = `${headHtml}<tbody>${bodyHtml}</tbody>`;
}

// ── Histograms ──

function renderHistograms(): void {
  const host = q("benchHistograms");
  const summary = q("histSummary");
  if (!host) return;
  const kind = state.histMetric;
  const fmt = kind === "cost" ? fmtUSD : fmtM;

  const cards: string[] = [];
  let benchCount = 0;
  for (const b of state.benches) {
    const ests = b.records
      .map((r) => estimatePerTask(r, kind, b.meta.numItemsNum))
      .filter((e): e is Estimate => e !== null);
    if (ests.length < 2) continue;
    benchCount++;
    const vals = ests.map((e) => e.value);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const logLo = safeLog(lo), logHi = safeLog(hi);
    const BINS = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(vals.length))));
    const bins = new Array(BINS).fill(0) as number[];
    for (const v of vals) {
      const t = logHi === logLo ? 0 : (safeLog(v) - logLo) / (logHi - logLo);
      bins[Math.min(BINS - 1, Math.floor(t * BINS))]++;
    }
    const maxBin = Math.max(...bins);
    const W = 240, H = 64, bw = W / BINS;
    const bars = bins
      .map((c, i) => {
        const h = maxBin ? (c / maxBin) * (H - 14) : 0;
        return `<rect x="${(i * bw + 1).toFixed(1)}" y="${(H - 12 - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="1"><title>${c} 条记录</title></rect>`;
      })
      .join("");
    cards.push(`<div class="hist-card">
      <div class="hist-title" title="${escapeAttr(b.reg.name)}">${escapeHtml(b.reg.name)}</div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeAttr(b.reg.name)} 分布">${bars}
        <text x="1" y="${H - 2}" class="hist-ax">${escapeHtml(fmt(lo))}</text>
        <text x="${W - 1}" y="${H - 2}" text-anchor="end" class="hist-ax">${escapeHtml(fmt(hi))}</text>
      </svg>
      <div class="hist-sub">n=${ests.length} · med ${fmt(median(vals))}${ests.some((e) => e.estimated) ? " · 含≈估算" : ""}</div>
    </div>`);
  }
  host.innerHTML = cards.join("");
  if (summary) summary.textContent = `${benchCount} 个榜单有可统计的${kind === "cost" ? "成本" : "token"}记录（log 分箱）`;
}

// ── Filters & init ──

function fillSelect(id: string, values: string[], allLabel: string): void {
  const sel = q<HTMLSelectElement>(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${allLabel}</option>` +
    values.map((v) => `<option value="${escapeAttr(v)}">${escapeHtml(v)}</option>`).join("");
}

function initFilters(): void {
  const domains = [...new Set(state.benches.map((b) => b.meta.domain).filter((v): v is string => Boolean(v) && v !== "—"))].sort(sortCollator.compare);
  const runModes = [...new Set(state.benches.map((b) => b.meta.runMode).filter((v): v is string => Boolean(v) && v !== "—"))].sort(sortCollator.compare);
  const aggs = [...new Set(state.benches.flatMap((b) => [...b.sources.map((s) => SOURCE_LABELS[s] ?? s), ...(b.meta.aggregators ?? [])]))].sort(sortCollator.compare);
  fillSelect("domainFilter", domains, "全部主题");
  fillSelect("runModeFilter", runModes, "全部方式");
  fillSelect("selfRunFilter", ["easy", "medium", "hard", "no"], "全部难度");
  fillSelect("aggFilter", aggs, "全部来源");
  const sr = q<HTMLSelectElement>("selfRunFilter");
  if (sr) for (const o of [...sr.options]) if (o.value) o.textContent = SELF_RUN_LABELS[o.value] ?? o.value;
}

function setStat(id: string, v: string | number): void {
  const el = q(id);
  if (el) el.textContent = String(v);
}

function renderStats(): void {
  const visible = filteredBenches();
  const models = new Set(state.benches.flatMap((b) => [...b.models]));
  const records = state.benches.reduce((n, b) => n + b.records.length, 0);
  const selfRun = state.benches.filter((b) => b.meta.selfRun === "easy" || b.meta.selfRun === "medium").length;
  setStat("statBenchCount", `${visible.length}/${state.benches.length}`);
  setStat("statRecordCount", records);
  setStat("statModelCount", models.size);
  setStat("statSelfRun", selfRun);
}

function bindEvents(): void {
  q("toggleColumnsButton")?.addEventListener("click", () => {
    const picker = q("columnPicker");
    if (picker) picker.hidden = !picker.hidden;
  });
  q<HTMLInputElement>("benchSearch")?.addEventListener("input", (e) => {
    state.search = (e.target as HTMLInputElement).value;
    renderTable(); renderStats();
  });
  const bind = (id: string, key: "domain" | "runMode" | "selfRun" | "agg") =>
    q<HTMLSelectElement>(id)?.addEventListener("change", (e) => {
      state[key] = (e.target as HTMLSelectElement).value;
      renderTable(); renderStats();
    });
  bind("domainFilter", "domain");
  bind("runModeFilter", "runMode");
  bind("selfRunFilter", "selfRun");
  bind("aggFilter", "agg");
  q("benchResetButton")?.addEventListener("click", () => {
    state.search = state.domain = state.runMode = state.selfRun = state.agg = "";
    state.sortKey = "records"; state.sortDir = -1;
    for (const id of ["benchSearch"]) {
      const el = q<HTMLInputElement>(id);
      if (el) el.value = "";
    }
    for (const id of ["domainFilter", "runModeFilter", "selfRunFilter", "aggFilter"]) {
      const el = q<HTMLSelectElement>(id);
      if (el) el.value = "";
    }
    renderTable(); renderStats();
  });
  q<HTMLSelectElement>("heatMetricSelect")?.addEventListener("change", (e) => {
    state.heatMetric = (e.target as HTMLSelectElement).value as "cost" | "tokens";
    renderHeatmap();
  });
  q<HTMLInputElement>("heatModelSearch")?.addEventListener("input", (e) => {
    state.heatSearch = (e.target as HTMLInputElement).value;
    renderHeatmap();
  });
  q<HTMLSelectElement>("histMetricSelect")?.addEventListener("change", (e) => {
    state.histMetric = (e.target as HTMLSelectElement).value as "cost" | "tokens";
    renderHistograms();
  });
}

let booted = false;

async function init(): Promise<void> {
  if (booted) return;
  booted = true;
  const marker = document.querySelector("[data-benchmarks-page]");
  if (!marker) return;
  try {
    try {
      const saved = localStorage.getItem(LS_COLS);
      if (saved) state.hiddenCols = new Set(saved.split(",").filter(Boolean));
    } catch { /* ignore */ }
    const [benchFile, metaFile] = await Promise.all([
      fetch(dataUrl("benchmarks.json")).then((r) => {
        if (!r.ok) throw new Error(`benchmarks.json ${r.status}`);
        return r.json() as Promise<BenchmarksFile>;
      }),
      fetch(dataUrl("benchmark-meta.json")).then((r) =>
        r.ok ? (r.json() as Promise<MetaFile>) : null,
      ),
    ]);
    state.metaFile = metaFile;
    const byBench = new Map<string, BenchRecord[]>();
    for (const r of benchFile.records) {
      const arr = byBench.get(r.bench) ?? [];
      arr.push(r);
      byBench.set(r.bench, arr);
    }
    state.benches = Object.entries(benchFile.benchmarks).map(([id, reg]) => {
      const meta = metaFile?.meta?.[id] ?? {};
      const records = byBench.get(id) ?? [];
      return {
        id,
        reg,
        meta,
        records,
        models: new Set(records.map((r) => r.model)),
        tools: new Set(records.map((r) => r.tool).filter((t): t is string => Boolean(t))),
        sources: [...new Set(records.map((r) => r.source ?? ""))].filter(Boolean),
        costStats: statOf(records.map((r) => estimatePerTask(r, "cost", meta.numItemsNum))),
        tokStats: statOf(records.map((r) => estimatePerTask(r, "tokens", meta.numItemsNum))),
        sota: sotaOf(reg, records),
      };
    });
    const recs = state.benches.map((b) => b.records.length);
    const mods = state.benches.map((b) => b.models.size);
    const tls = state.benches.map((b) => b.tools.size);
    state.statRanges = {
      rec: { min: Math.min(...recs), max: Math.max(...recs) },
      mod: { min: Math.min(...mods), max: Math.max(...mods) },
      tool: { min: Math.min(...tls), max: Math.max(...tls) },
    };
    initFilters();
    bindEvents();
    renderColPicker();
    renderStats();
    renderTable();
    renderHeatmap();
    renderHistograms();
  } catch (err) {
    console.error("benchmarks page failed:", err);
    const body = q("benchTableBody");
    if (body) body.innerHTML = `<tr><td>数据加载失败：${escapeHtml(err instanceof Error ? err.message : String(err))}</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
}
