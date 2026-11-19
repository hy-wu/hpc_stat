/**
 * Client-side island: dense cost/performance scatter plots with Pareto frontiers.
 */

import { Chart, registerables } from "chart.js";
import { getNestedValue } from "../lib/format";
import {
  loadModelToolChartData,
  loadModelHardwareChartData,
  type AxisField,
  type ChartPreset,
  type MergedModelToolPoint,
  type MergedModelHardwarePoint,
} from "../lib/chart-data";

type ChartPoint = MergedModelToolPoint | MergedModelHardwarePoint;

interface ReferenceLayer {
  visible: boolean;
  xCut: number | null;
  yCut: number | null;
  paretoCount: number;
}

interface ChartState {
  dataType: "model-tools" | "model-hardware";
  points: ChartPoint[];
  axisFields: AxisField[];
  presets: ChartPreset[];
  activePresets: number[];
  xField: string;
  yField: string;
  colorField: string;
  borderField: string;
  chart: Chart | null;
  searchTerm: string;
  colorFilter: string;
  labelMode: "auto" | "all" | "off";
  renderedLabels: string[][];
  reference: ReferenceLayer;
  effortLinks: Array<{ x1: number; y1: number; x2: number; y2: number }>;
}

interface PlotDatum {
  point: ChartPoint;
  id: string;
  x: number;
  y: number;
}

interface TooltipMeta {
  label: string;
  xVal: string;
  yVal: string;
  extras: string[];
}

const PARETO_LABEL = "Pareto line";

const state: ChartState = {
  dataType: "model-tools",
  points: [],
  axisFields: [],
  presets: [],
  activePresets: [],
  xField: "costPerTaskUSD",
  yField: "codingAgentScore",
  colorField: "modelVendor",
  borderField: "",
  chart: null,
  searchTerm: "",
  colorFilter: "",
  labelMode: "auto",
  renderedLabels: [],
  reference: { visible: false, xCut: null, yCut: null, paretoCount: 0 },
  effortLinks: [],
};

const EFFORT_RANK: Record<string, number> = { "": 0, minimal: 1, low: 2, medium: 3, high: 4, xhigh: 5, max: 6, ultra: 7 };

const COLORS = [
  "#111827", "#d46a3d", "#7463d1", "#1677f2", "#1592e6", "#34a853",
  "#2f55d4", "#6b7280", "#b56320", "#007b8a", "#a13e6b", "#4b7b39",
];

/** Brand colors keyed by normalized vendor id. */
const BRAND: Record<string, string> = {
  anthropic: "#c15f3c", openai: "#10a37f", google: "#1a73e8", googledeepmind: "#1a73e8",
  deepseek: "#2743ce", deepseekai: "#2743ce", zai: "#3b5bdb", zhipuai: "#3b5bdb", zhipu: "#3b5bdb",
  meta: "#0081fb", metaai: "#0081fb", xai: "#374151", spacexai: "#374151",
  moonshotai: "#1f2937", moonshot: "#1f2937", alibaba: "#ff6a00", mistral: "#e8590c", mistralai: "#e8590c",
  bytedance: "#3370ff", nvidia: "#5e9400", amazon: "#c77700", microsoft: "#0067b8",
  tencent: "#0052d9", baidu: "#2932e1", cohere: "#39594d", ai21: "#c0569a",
  perplexity: "#1f9db3", cursor: "#374151", anysphere: "#374151",
  sweagent: "#6b7280", harbor: "#0e7490", apodex: "#7c3aed", thinkingmachines: "#0d9488",
  cognition: "#334155", factoryai: "#b91c1c", antdigital: "#1677ff", antgroup: "#1677ff",
  stepfun: "#d97706", groq: "#f55036", minimax: "#6d28d9", eleutherai: "#8b5cf6",
  epochai: "#0f766e", arcprize: "#dc2626", arcprizefoundation: "#dc2626", mercor: "#059669",
  surgeai: "#d97706", datacurve: "#6366f1", proximal: "#0284c7", harvey: "#7c3aed",
  qijizhifeng: "#dc2626", upstage: "#10b981", ibm: "#6929c4", laude: "#b45309",
  aionlabs: "#db2777", liquidai: "#7c3aed", essentialai: "#0ea5e9", primeintellect: "#ea580c",
  arcee: "#f43f5e", ai2: "#2563eb", allenai: "#2563eb", ai21labs: "#c0569a",
  yandex: "#fc3f1d", kakao: "#391b1b", naver: "#03c75a", lighton: "#f59e0b",
};

/** toolId / toolName → vendor key into BRAND. */
const TOOL_VENDOR: Record<string, string> = {
  claudecode: "anthropic", openaicodex: "openai", codex: "openai", zcode: "zai",
  kimicode: "moonshotai", qwencode: "alibaba", grokbuild: "xai", antigravity: "google",
  googlegeminidevtools: "google", geminicli: "google", deepseekharness: "deepseek",
  musecode: "meta", stepcode: "stepfun", aiworkcode: "antdigital", frontieragent: "apodex",
  amplio: "google", piagent: "thinkingmachines", factory: "factoryai", droid: "factoryai",
  devincli: "cognition", cursoragent: "cursor", cursor: "cursor", minisweagent: "sweagent",
  terminus2: "harbor", harboragent: "harbor", trae: "bytedance", autoclaw: "zai",
  epochharness: "epochai", vllmharness: "epochai", sglangharness: "epochai",
  lmevalharness: "eleutherai", proximusharness: "proximal", snorkel: "surgeai",
};

const NAME_HINTS: Array<[RegExp, string]> = [
  [/claude|anthropic/i, "anthropic"], [/codex|openai|gpt/i, "openai"],
  [/gemini|antigravity|google|bard/i, "google"], [/deepseek/i, "deepseek"],
  [/glm|zhipu|z\.?\s?ai|zcode/i, "zai"], [/kimi|moonshot/i, "moonshotai"],
  [/qwen|tongyi|alibaba/i, "alibaba"], [/grok|xai/i, "xai"], [/muse|llama|meta/i, "meta"],
  [/mistral|magistral|codestral|devstral|mixtral/i, "mistral"], [/nvidia|nemotron/i, "nvidia"],
  [/doubao|bytedance|trae|seed/i, "bytedance"], [/minimax/i, "minimax"],
  [/ernie|baidu/i, "baidu"], [/hunyuan|tencent/i, "tencent"],
  [/amazon|titan|nova/i, "amazon"], [/microsoft|phi|copilot/i, "microsoft"],
  [/cohere|command/i, "cohere"], [/ai21|jamba|jurassic/i, "ai21"],
  [/cursor|anysphere/i, "cursor"], [/harbor|terminus/i, "harbor"], [/swe/i, "sweagent"],
  [/factory|droid/i, "factoryai"], [/devin/i, "cognition"], [/pi agent|^pi$/i, "thinkingmachines"],
  [/epoch/i, "epochai"], [/arc[\s-]?agi|arc prize/i, "arcprize"], [/mercor/i, "mercor"],
  [/surge|snorkel/i, "surgeai"], [/datacurve|deepswe/i, "datacurve"],
  [/proximus|proximal/i, "proximal"], [/harvey/i, "harvey"], [/groq(?!k)/i, "groq"],
  [/step|阶跃/i, "stepfun"], [/amplio/i, "google"], [/qijizhifeng|qiji/i, "qijizhifeng"],
  [/granite|ibm/i, "ibm"], [/upstage|solar/i, "upstage"], [/perplexity|sonar/i, "perplexity"],
  [/reka/i, "reka"], [/liquid|lfm/i, "liquidai"],
];

function normKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isDarkTheme(): boolean {
  return document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.getAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round((n >> 16) + (255 - (n >> 16)) * amt);
  const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amt);
  const b = Math.round((n & 255) + (255 - (n & 255)) * amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function resolveBrand(value: string): string | null {
  const k = normKey(value);
  if (BRAND[k]) return k;
  if (TOOL_VENDOR[k]) return TOOL_VENDOR[k];
  for (const [re, v] of NAME_HINTS) if (re.test(value)) return v;
  return null;
}

function hashColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

/** Color for a fill/ring role. Ring colors brighten substantially in dark theme. */
function colorFor(value: string, ring: boolean): string {
  const dark = isDarkTheme();
  const brand = resolveBrand(value);
  const base = brand ? BRAND[brand] : hashColor(value || "其他");
  return dark ? lighten(base, ring ? 0.5 : 0.12) : base;
}

function getColor(key: string): string {
  return colorFor(key, false);
}

/** Deterministic palette color for preset-overlay series. */
function overlayColor(i: number): string {
  const base = COLORS[i % COLORS.length];
  return isDarkTheme() ? lighten(base, 0.12) : base;
}

function q<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function getPointNum(point: { raw: Record<string, unknown> }, path: string): number | null {
  const val = getNestedValue(point.raw, path);
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function getPointLabel(p: ChartPoint): string {
  if ("toolName" in p) return `${p.toolName} - ${p.modelName}`;
  return `${p.modelName} - ${(p as MergedModelHardwarePoint).gpuName}`;
}

function getPointPlotLabel(p: ChartPoint): string {
  if ("toolName" in p) return `${p.toolName} - ${p.modelName}`;
  return p.modelName;
}

function axisLabel(field: AxisField | undefined, fallback: string): string {
  if (!field) return fallback;
  return field.unit ? `${field.label} · ${field.unit}` : field.label;
}

function getThemeColors(): {
  text: string;
  grid: string;
  bg: string;
  panel: string;
  quadrant: string;
  pareto: string;
} {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark" ||
    (!document.documentElement.getAttribute("data-theme") &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  return isDark
    ? {
        text: "#d7dee4",
        grid: "#30363d",
        bg: "#0f1419",
        panel: "#1a2128",
        quadrant: "rgba(88, 166, 94, 0.11)",
        pareto: "#c9d1d9",
      }
    : {
        text: "#172025",
        grid: "#d9e2e5",
        bg: "#f7f9fa",
        panel: "#ffffff",
        quadrant: "rgba(130, 232, 139, 0.28)",
        pareto: "#24292f",
      };
}

function getAxisField(key: string): AxisField | undefined {
  return state.axisFields.find((f) => f.key === key);
}

function formatNumber(value: number, maximumFractionDigits = 2): string {
  return value.toLocaleString("zh-CN", { maximumFractionDigits });
}

function formatAxisValue(value: number, field: AxisField | undefined): string {
  if (!Number.isFinite(value)) return "";
  const key = field?.key ?? "";
  const unit = field?.unit ?? "";
  if (unit === "USD" || /cost|price|usd/i.test(key)) {
    if (value >= 1000) return `$${formatNumber(value, 0)}`;
    if (value >= 10) return `$${formatNumber(value, 1)}`;
    if (value >= 1) return `$${formatNumber(value, 2)}`;
    return `$${formatNumber(value, 4)}`;
  }
  if (unit === "%") return `${formatNumber(value, 1)}%`;
  if (unit === "/5") return `${formatNumber(value, 1)}/5`;
  if (unit) return `${formatNumber(value, value >= 100 ? 0 : 1)} ${unit}`;
  return formatNumber(value, value >= 100 ? 0 : 2);
}

function quantile(values: number[], qValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * qValue;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base] + ((sorted[base + 1] ?? sorted[base]) - sorted[base]) * rest;
}

function isReferencePlot(xField: AxisField | undefined, yField: AxisField | undefined): boolean {
  return xField?.direction === "lower-better" && yField?.direction === "higher-better";
}

function buildPlotData(
  points: ChartPoint[],
  xKey: string,
  yKey: string,
  xField: AxisField | undefined,
  yField: AxisField | undefined,
): PlotDatum[] {
  const xLog = xField?.scale === "logarithmic";
  const yLog = yField?.scale === "logarithmic";
  const plotted: PlotDatum[] = [];
  for (const p of points) {
    const x = getPointNum(p, xKey);
    const y = getPointNum(p, yKey);
    if (x === null || y === null) continue;
    if ((xLog && x <= 0) || (yLog && y <= 0)) continue;
    plotted.push({ point: p, id: p.id, x, y });
  }
  return plotted;
}

function computeParetoFrontier(plotted: PlotDatum[]): PlotDatum[] {
  const sorted = [...plotted].sort((a, b) => a.x - b.x || b.y - a.y);
  const frontier: PlotDatum[] = [];
  let bestY = -Infinity;
  for (const datum of sorted) {
    if (datum.y > bestY + 1e-9) {
      frontier.push(datum);
      bestY = datum.y;
    }
  }
  return frontier;
}

function chooseLabelIds(plotted: PlotDatum[], pareto: PlotDatum[]): Set<string> {
  if (state.labelMode === "all") return new Set(plotted.map((d) => d.id));
  const labels = new Set<string>();
  const add = (items: PlotDatum[], max: number) => {
    for (const item of items) {
      if (labels.size >= max) break;
      labels.add(item.id);
    }
  };
  add(pareto, 18);
  add([...plotted].sort((a, b) => b.y - a.y), 28);
  add([...plotted].sort((a, b) => a.x - b.x), 34);
  return labels;
}

function buildTooltipExtras(p: ChartPoint): string[] {
  const extras: string[] = [];
  if ("toolName" in p) {
    extras.push(`厂商: ${p.modelVendor}`);
    extras.push(`工具: ${p.toolName}`);
    const c = getPointNum(p, "codingFit");
    const a = getPointNum(p, "agentFit");
    const x = getPointNum(p, "contextFit");
    if (c !== null || a !== null || x !== null) {
      extras.push(`适配: C ${c ?? "—"} · A ${a ?? "—"} · X ${x ?? "—"}`);
    }
  } else {
    const hp = p as MergedModelHardwarePoint;
    extras.push(`硬件: ${hp.gpuName} (${hp.gpuVendor})`);
    const input = getPointNum(p, "inputTps");
    const output = getPointNum(p, "outputTps");
    if (input !== null || output !== null) {
      extras.push(`吞吐: in ${input ?? "—"} · out ${output ?? "—"} tok/s`);
    }
    const fit = getPointNum(p, "fitScore");
    if (fit !== null) extras.push(`硬件适配: ${formatNumber(fit, 1)}/5`);
  }
  const costSource = getNestedValue(p.raw, "costPerTaskSource");
  if (costSource) extras.push(`成本来源: ${String(costSource)}`);
  const scoreSource = getNestedValue(p.raw, "codingAgentScoreSource");
  const scoreRaw = getPointNum(p, "codingAgentScoreRawValue");
  if (scoreSource) {
    extras.push(`指数来源: ${String(scoreSource)}${scoreRaw !== null ? ` · raw ${formatNumber(scoreRaw, 1)}` : ""}`);
  }
  const swe = getPointNum(p, "evals.reportedSweBenchVerified");
  if (swe !== null) extras.push(`SWE-bench Verified: ${formatNumber(swe, 1)}%`);
  const benchObj = getNestedValue(p.raw, "bench") as Record<string, unknown> | undefined;
  if (benchObj) {
    const SRC: Record<string, string> = { official: "官方", vals: "Vals", "self-reported": "自报" };
    const srcs = [...new Set(
      Object.values(benchObj).map((m) => String((m as Record<string, unknown>).source ?? "")).filter(Boolean),
    )].map((s) => SRC[s] ?? s);
    if (srcs.length) extras.push(`榜单来源: ${srcs.join("/")}`);
  }
  return extras.slice(0, 5);
}

const referenceLayerPlugin = {
  id: "hpc-reference-layer",
  beforeDatasetsDraw(chart: Chart) {
    if (!state.reference.visible || state.reference.xCut === null || state.reference.yCut === null) return;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;
    const { chartArea, ctx } = chart;
    const right = Math.min(chartArea.right, xScale.getPixelForValue(state.reference.xCut));
    const bottom = Math.min(chartArea.bottom, yScale.getPixelForValue(state.reference.yCut));
    if (right <= chartArea.left || bottom <= chartArea.top) return;
    const theme = getThemeColors();
    ctx.save();
    ctx.fillStyle = theme.quadrant;
    ctx.fillRect(chartArea.left, chartArea.top, right - chartArea.left, bottom - chartArea.top);
    ctx.strokeStyle = theme.quadrant;
    ctx.strokeRect(chartArea.left, chartArea.top, right - chartArea.left, bottom - chartArea.top);
    ctx.restore();
  },
};

const pointLabelsPlugin = {
  id: "hpc-point-labels",
  afterDatasetsDraw(chart: Chart) {
    if (state.labelMode === "off") return;
    const { ctx, chartArea } = chart;
    const labels: Array<{ text: string; x: number; y: number }> = [];
    const maximum = state.labelMode === "all" ? 90 : 34;

    for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
      if (chart.data.datasets[datasetIndex]?.label === PARETO_LABEL) continue;
      const meta = chart.getDatasetMeta(datasetIndex);
      const seriesLabels = state.renderedLabels[datasetIndex] ?? [];
      for (let index = 0; index < meta.data.length && labels.length < maximum; index++) {
        const point = meta.data[index];
        const { x, y } = point.tooltipPosition(false);
        const text = seriesLabels[index];
        if (text && typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) {
          labels.push({ text, x, y });
        }
      }
    }

    const occupied: Array<{ left: number; right: number; top: number; bottom: number }> = [];
    const theme = getThemeColors();
    ctx.save();
    ctx.font = "600 11px Inter, Segoe UI, PingFang SC, sans-serif";
    ctx.textBaseline = "middle";
    for (const label of labels) {
      const width = ctx.measureText(label.text).width;
      const left = label.x + 7;
      const right = left + width + 6;
      const top = label.y - 10;
      const bottom = label.y + 5;
      const overlaps = occupied.some((box) =>
        left < box.right + 3 && right > box.left - 3 && top < box.bottom + 3 && bottom > box.top - 3,
      );
      if (overlaps || left < chartArea.left || right > chartArea.right || top < chartArea.top || bottom > chartArea.bottom) continue;
      occupied.push({ left, right, top, bottom });
      ctx.fillStyle = theme.panel;
      ctx.fillRect(left - 2, top - 1, width + 6, 15);
      ctx.fillStyle = theme.text;
      ctx.fillText(label.text, left + 1, label.y - 3);
    }
    ctx.restore();
  },
};

const effortLinksPlugin = {
  id: "effort-links",
  afterDatasetsDraw(chart: Chart) {
    if (!state.effortLinks.length) return;
    const { ctx, scales } = chart;
    const theme = getThemeColors();
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.fillStyle = theme.text;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 4]);
    for (const l of state.effortLinks) {
      const x1 = scales.x.getPixelForValue(l.x1);
      const y1 = scales.y.getPixelForValue(l.y1);
      const x2 = scales.x.getPixelForValue(l.x2);
      const y2 = scales.y.getPixelForValue(l.y2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const ang = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 7 * Math.cos(ang - 0.42), y2 - 7 * Math.sin(ang - 0.42));
      ctx.lineTo(x2 - 7 * Math.cos(ang + 0.42), y2 - 7 * Math.sin(ang + 0.42));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
};

Chart.register(...registerables, referenceLayerPlugin, pointLabelsPlugin, effortLinksPlugin);

interface ChartSeries {
  name: string;
  color: string;
  xKey: string;
  yKey: string;
  xDef: AxisField | undefined;
  yDef: AxisField | undefined;
  datums: PlotDatum[];
}

function renderChart() {
  const canvas = q<HTMLCanvasElement>("chartCanvas");
  if (!canvas) return;

  const theme = getThemeColors();
  const { xField, yField, colorField, points, searchTerm, colorFilter } = state;
  const overlay = state.activePresets.length >= 2;
  const overlayPresets = state.activePresets.map((i) => state.presets[i]).filter(Boolean);
  const xFieldDef = overlay ? getAxisField(overlayPresets[0].x) : getAxisField(xField);
  const yFieldDef = overlay ? getAxisField(overlayPresets[0].y) : getAxisField(yField);

  const filtered: ChartPoint[] = [];
  for (const p of points) {
    if (searchTerm) {
      const label = getPointLabel(p).toLowerCase();
      if (!label.includes(searchTerm.toLowerCase())) continue;
    }
    if (colorFilter) {
      const colorVal = String(getNestedValue(p.raw, colorField) ?? "");
      if (colorVal !== colorFilter) continue;
    }
    filtered.push(p);
  }

  const seriesList: ChartSeries[] = [];
  if (overlay) {
    overlayPresets.forEach((preset, slot) => {
      const xDef = getAxisField(preset.x);
      const yDef = getAxisField(preset.y);
      seriesList.push({
        name: preset.label,
        color: overlayColor(slot),
        xKey: preset.x,
        yKey: preset.y,
        xDef,
        yDef,
        datums: buildPlotData(filtered, preset.x, preset.y, xDef, yDef),
      });
    });
  } else {
    const all = buildPlotData(filtered, xField, yField, xFieldDef, yFieldDef);
    const groups = new Map<string, PlotDatum[]>();
    for (const d of all) {
      const key = String(getNestedValue(d.point.raw, colorField) ?? "其他");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }
    for (const [name, datums] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
      seriesList.push({ name, color: getColor(name), xKey: xField, yKey: yField, xDef: xFieldDef, yDef: yFieldDef, datums });
    }
  }

  const plotted = seriesList.flatMap((s) => s.datums);
  const referenceVisible = isReferencePlot(xFieldDef, yFieldDef) && plotted.length >= 3;
  const pareto = referenceVisible ? computeParetoFrontier(plotted) : [];
  const paretoIds = new Set(pareto.map((d) => d.id));
  const labelIds = chooseLabelIds(plotted, pareto);
  const xCut = referenceVisible ? quantile(plotted.map((d) => d.x), 0.45) : null;
  const yCut = referenceVisible ? quantile(plotted.map((d) => d.y), 0.65) : null;
  state.reference = { visible: referenceVisible, xCut, yCut, paretoCount: pareto.length };

  // Connector segments between effort variants of the same model×tool config (within one series).
  state.effortLinks = [];
  for (const s of seriesList) {
    const byConfig = new Map<string, PlotDatum[]>();
    for (const d of s.datums) {
      const key = `${String(getNestedValue(d.point.raw, "modelName") ?? "")}|${String(getNestedValue(d.point.raw, "toolId") ?? "")}`;
      if (!byConfig.has(key)) byConfig.set(key, []);
      byConfig.get(key)!.push(d);
    }
    for (const items of byConfig.values()) {
      const efforts = new Set(items.map((d) => String(getNestedValue(d.point.raw, "effort") ?? "")));
      if (efforts.size < 2) continue;
      items.sort(
        (a, b) =>
          (EFFORT_RANK[String(getNestedValue(a.point.raw, "effort") ?? "")] ?? 0) -
          (EFFORT_RANK[String(getNestedValue(b.point.raw, "effort") ?? "")] ?? 0),
      );
      for (let i = 1; i < items.length; i++) {
        state.effortLinks.push({ x1: items[i - 1].x, y1: items[i - 1].y, x2: items[i].x, y2: items[i].y });
      }
    }
  }

  const tooltipMap = new Map<number, TooltipMeta[]>();
  state.renderedLabels = [];

  const chartDatasets = seriesList.map((s, seriesIndex) => {
    state.renderedLabels[seriesIndex] = s.datums.map((d) => {
      if (state.labelMode === "off") return "";
      return labelIds.has(d.id) ? getPointPlotLabel(d.point) : "";
    });

    const metas: TooltipMeta[] = s.datums.map((d) => ({
      label: getPointLabel(d.point),
      xVal: `${axisLabel(s.xDef, s.xKey)}: ${formatAxisValue(d.x, s.xDef)}`,
      yVal: `${axisLabel(s.yDef, s.yKey)}: ${formatAxisValue(d.y, s.yDef)}`,
      extras: (overlay ? [`榜单: ${s.name}`] : []).concat(buildTooltipExtras(d.point)),
    }));
    tooltipMap.set(seriesIndex, metas);

    const ring = state.borderField;
    return {
      label: s.name,
      data: s.datums.map((d) => ({ x: d.x, y: d.y })),
      backgroundColor: s.color + (state.dataType === "model-tools" ? "c7" : "a6"),
      borderColor: ring
        ? s.datums.map((d) => colorFor(String(getNestedValue(d.point.raw, ring) ?? "其他"), true))
        : s.color,
      pointRadius: s.datums.map((d) => paretoIds.has(d.id) ? 5.2 : 4),
      pointHoverRadius: 7,
      borderWidth: s.datums.map((d) => (ring ? 2 : 1) + (paretoIds.has(d.id) ? 0.8 : 0)),
      showLine: false,
      fill: false,
    };
  });

  if (pareto.length >= 2) {
    chartDatasets.push({
      type: "line",
      label: PARETO_LABEL,
      data: pareto.map((d) => ({ x: d.x, y: d.y })),
      backgroundColor: "transparent",
      borderColor: theme.pareto,
      borderDash: [2, 7],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
      showLine: true,
      fill: false,
      tension: 0.18,
    } as never);
  }

  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  state.chart = new Chart(ctx, {
    type: "scatter",
    data: { datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: {
        mode: "nearest",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.panel,
          titleColor: theme.text,
          bodyColor: theme.text,
          borderColor: theme.grid,
          borderWidth: 1,
          padding: 8,
          cornerRadius: 4,
          displayColors: true,
          callbacks: {
            title(items) {
              const pointItems = items.filter((item) => item.dataset.label !== PARETO_LABEL);
              if (pointItems.length > 1) return `${pointItems.length} 个重叠点`;
              if (!pointItems.length) return PARETO_LABEL;
              const metas = tooltipMap.get(pointItems[0].datasetIndex);
              return metas?.[pointItems[0].dataIndex]?.label ?? "";
            },
            label(item) {
              if (item.dataset.label === PARETO_LABEL) return "Pareto 前沿";
              const metas = tooltipMap.get(item.datasetIndex);
              const meta = metas?.[item.dataIndex];
              if (!meta) return "";
              return `${meta.label}: ${meta.xVal}, ${meta.yVal}`;
            },
            afterBody(items) {
              const pointItems = items.filter((item) => item.dataset.label !== PARETO_LABEL);
              if (pointItems.length !== 1) return "";
              const metas = tooltipMap.get(pointItems[0].datasetIndex);
              return metas?.[pointItems[0].dataIndex]?.extras ?? "";
            },
          },
        },
      },
      scales: {
        x: {
          type: xFieldDef?.scale ?? "linear",
          title: {
            display: true,
            text: overlay ? overlayAxisTitle(overlayPresets, "x") : axisLabel(xFieldDef, xField),
            color: theme.text,
          },
          ticks: {
            color: theme.text,
            maxTicksLimit: 8,
            font: { size: 11 },
            callback(value) {
              return formatAxisValue(Number(value), xFieldDef);
            },
          },
          grid: { color: theme.grid },
        },
        y: {
          type: yFieldDef?.scale ?? "linear",
          title: {
            display: true,
            text: overlay ? overlayAxisTitle(overlayPresets, "y") : axisLabel(yFieldDef, yField),
            color: theme.text,
          },
          ticks: {
            color: theme.text,
            maxTicksLimit: 7,
            font: { size: 11 },
            callback(value) {
              return formatAxisValue(Number(value), yFieldDef);
            },
          },
          grid: { color: theme.grid },
        },
      },
    },
  });

  updateSummary(plotted.length, filtered.length, seriesList.length, state.reference);
  updateLegend(
    seriesList.map((s) => ({ name: s.name, color: s.color })),
    overlay ? "榜单" : "填充",
    plotted,
    pareto.length >= 2,
  );
}

/** Generic axis title for preset overlay: shared label if identical, else unit-based name. */
function overlayAxisTitle(presets: ChartPreset[], axis: "x" | "y"): string {
  const defs = presets.map((p) => getAxisField(axis === "x" ? p.x : p.y));
  const labels = new Set(defs.map((d) => d?.label ?? ""));
  if (labels.size === 1 && defs[0]) return axisLabel(defs[0], "");
  const units = new Set(defs.map((d) => d?.unit ?? ""));
  if (units.size === 1) {
    const u = [...units][0];
    const generic: Record<string, string> = {
      USD: "成本", "%": "得分", M: "tokens", min: "时长", h: "时长", s: "时间",
    };
    const g = generic[u] ?? "数值";
    return u ? `${g} · ${u}` : g;
  }
  return "多榜单叠加";
}

/** Two-section legend: filled swatches for color groups/presets, ring-only swatches for the border field. */
function updateLegend(fillEntries: Array<{ name: string; color: string }>, fillTitle: string, plotted: PlotDatum[], hasPareto: boolean) {
  const el = q<HTMLElement>("chartLegend");
  if (!el) return;
  el.innerHTML = "";
  const theme = getThemeColors();
  el.style.cssText = `display:flex;flex-direction:column;gap:4px;padding:2px 4px 8px;font-size:11px;color:${theme.text}`;

  const makeRow = (label: string, entries: Array<{ name: string; color: string; ring: boolean; idx?: number }>, hidden: number) => {
    if (!entries.length && !hidden) return;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px";
    const tag = document.createElement("span");
    tag.style.cssText = `opacity:.65;min-width:64px;font-weight:600`;
    tag.textContent = label;
    row.appendChild(tag);
    for (const e of entries) {
      const item = document.createElement("span");
      item.style.cssText = `display:inline-flex;align-items:center;gap:4px;white-space:nowrap${e.idx !== undefined ? ";cursor:pointer" : ""}`;
      const sw = document.createElement("span");
      sw.style.cssText = e.ring
        ? `width:9px;height:9px;border-radius:50%;border:2.2px solid ${e.color};background:transparent;display:inline-block`
        : `width:9px;height:9px;border-radius:50%;background:${e.color};border:none;display:inline-block`;
      const t = document.createElement("span");
      t.textContent = e.name;
      item.append(sw, t);
      if (e.idx !== undefined && state.chart) {
        const i = e.idx;
        if (!state.chart.isDatasetVisible(i)) item.style.opacity = ".35";
        item.onclick = () => {
          if (!state.chart) return;
          const vis = state.chart.isDatasetVisible(i);
          state.chart.setDatasetVisibility(i, !vis);
          item.style.opacity = vis ? ".35" : "1";
          state.chart.update();
        };
      }
      row.appendChild(item);
    }
    if (hidden > 0) {
      const more = document.createElement("span");
      more.style.opacity = ".55";
      more.textContent = `+${hidden} 组`;
      row.appendChild(more);
    }
    el.appendChild(row);
  };

  const CAP = 18;
  makeRow(fillTitle, fillEntries.slice(0, CAP).map((e, i) => ({ name: e.name, color: e.color, ring: false, idx: i })), Math.max(0, fillEntries.length - CAP));

  const ring = state.borderField;
  if (ring) {
    const counts = new Map<string, number>();
    for (const d of plotted) {
      const v = String(getNestedValue(d.point.raw, ring) ?? "其他");
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    makeRow("圆框", sorted.slice(0, CAP).map(([name]) => ({ name, color: colorFor(name, true), ring: true })), Math.max(0, sorted.length - CAP));
  }

  if (hasPareto) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:6px";
    const sw = document.createElement("span");
    sw.style.cssText = `width:20px;height:0;border-top:2px dashed ${theme.pareto};display:inline-block`;
    const t = document.createElement("span");
    t.textContent = PARETO_LABEL;
    row.append(sw, t);
    el.appendChild(row);
  }
}

function updateSummary(totalPoints: number, filteredPoints: number, totalGroups: number, reference: ReferenceLayer) {
  const el = q("chartSummary");
  if (!el) return;
  const missingText = filteredPoints > totalPoints ? ` · 轴缺失 ${filteredPoints - totalPoints}` : "";
  const hiddenLegendGroups = Math.max(0, totalGroups - 14);
  const legendText = hiddenLegendGroups ? ` · 图例另有 ${hiddenLegendGroups} 组` : "";
  const refText = reference.visible && reference.xCut !== null && reference.yCut !== null
    ? ` · Pareto ${reference.paretoCount} · 最优象限 x≤${formatAxisValue(reference.xCut, getAxisField(state.xField))}, y≥${formatAxisValue(reference.yCut, getAxisField(state.yField))}`
    : "";
  const markText = state.points.some((p) => "toolName" in p && p.toolName === "◆")
    ? " · ◆=裸模型评测（无 agent）"
    : "";
  const overlayText = state.activePresets.length >= 2 ? ` · 叠加 ${state.activePresets.length} 榜` : "";
  el.textContent = `数据点 ${totalPoints}/${filteredPoints}${missingText} · 分组 ${totalGroups}${legendText}${overlayText}${refText}${markText}`;
}

function populateSelect(id: string, fields: AxisField[], selected: string) {
  const sel = q<HTMLSelectElement>(id);
  if (!sel) return;
  sel.innerHTML = "";

  const groups = new Map<string, AxisField[]>();
  for (const f of fields) {
    const src = f.source;
    if (!groups.has(src)) groups.set(src, []);
    groups.get(src)!.push(f);
  }

  const sortedSources = [...groups.keys()].sort();
  for (const src of sortedSources) {
    const gFields = groups.get(src)!;
    const optgroup = document.createElement("optgroup");
    optgroup.label = src;
    for (const f of gFields) {
      const opt = document.createElement("option");
      opt.value = f.key;
      opt.textContent = `${f.label}${f.unit ? ` (${f.unit})` : ""}`;
      if (f.key === selected) opt.selected = true;
      optgroup.appendChild(opt);
    }
    sel.appendChild(optgroup);
  }
}

function populateColorSelect(id: string, pageType: string) {
  const sel = q<HTMLSelectElement>(id);
  if (!sel) return;
  sel.innerHTML = "";

  const colorOptions = pageType === "model-tools"
    ? [
        { key: "modelVendor", label: "模型厂商" },
        { key: "toolName", label: "工具名称" },
        { key: "supportStatus", label: "接入状态" },
      ]
    : [
        { key: "modelVendor", label: "模型厂商" },
        { key: "gpuVendor", label: "硬件厂商" },
        { key: "gpuName", label: "硬件名称" },
        { key: "deployMode", label: "部署方式" },
        { key: "precision", label: "量化精度" },
      ];

  for (const opt of colorOptions) {
    const o = document.createElement("option");
    o.value = opt.key;
    o.textContent = opt.label;
    sel.appendChild(o);
  }
}

function populateBorderSelect(id: string, pageType: string) {
  const sel = q<HTMLSelectElement>(id);
  if (!sel) return;
  sel.innerHTML = "";
  const borderOptions = pageType === "model-tools"
    ? [
        { key: "toolName", label: "工具名称" },
        { key: "effort", label: "Effort 档位" },
        { key: "modelVendor", label: "模型厂商" },
        { key: "supportStatus", label: "接入状态" },
        { key: "", label: "无（跟随填充）" },
      ]
    : [
        { key: "", label: "无（跟随填充）" },
        { key: "modelVendor", label: "模型厂商" },
        { key: "gpuVendor", label: "硬件厂商" },
        { key: "deployMode", label: "部署方式" },
      ];
  for (const opt of borderOptions) {
    const o = document.createElement("option");
    o.value = opt.key;
    o.textContent = opt.label;
    sel.appendChild(o);
  }
}

function presetPlottableCount(p: ChartPreset): number {
  return state.points.filter(
    (pt) => getPointNum(pt, p.x) !== null && getPointNum(pt, p.y) !== null,
  ).length;
}

/**
 * Compatibility signature for stacking presets: unit when present (USD, %…),
 * else the metric's leaf name (stderr, votes…), plus direction.
 */
function presetSig(p: ChartPreset): string {
  const part = (key: string) => {
    const f = getAxisField(key);
    const base = f?.unit ? `u:${f.unit}` : `k:${key.split(".").pop()}`;
    return `${base}:${f?.direction ?? ""}`;
  };
  return `${part(p.x)}|${part(p.y)}`;
}

function buildPresetPanel() {
  const panel = q<HTMLElement>("presetPanel");
  if (!panel) return;
  if (!state.presets.length) {
    q("presetMenu")?.closest(".control")?.setAttribute("hidden", "");
    return;
  }
  panel.innerHTML = "";

  const head = document.createElement("div");
  head.className = "preset-panel-head";
  const hint = document.createElement("span");
  hint.className = "preset-hint";
  hint.textContent = "可多选叠加（轴单位需一致）";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "text-button";
  clear.textContent = "清空";
  clear.addEventListener("click", () => {
    state.activePresets = [];
    syncPresetUI();
    renderChart();
  });
  head.append(hint, clear);
  panel.appendChild(head);

  const groups = new Map<string, Array<{ p: ChartPreset; i: number }>>();
  state.presets.forEach((p, i) => {
    const g = p.group ?? "其他";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push({ p, i });
  });
  for (const [gname, items] of groups) {
    const gnameEl = document.createElement("div");
    gnameEl.className = "preset-group-name";
    gnameEl.textContent = gname;
    panel.appendChild(gnameEl);
    for (const { p, i } of items) {
      const n = presetPlottableCount(p);
      const lab = document.createElement("label");
      lab.className = "preset-item";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.idx = String(i);
      cb.addEventListener("change", () => onPresetToggle(i, cb.checked));
      const t = document.createElement("span");
      t.textContent = `${p.label.replace(/^[^·]+·\s*/, "")}（${n}）`;
      lab.append(cb, t);
      panel.appendChild(lab);
    }
  }
  syncPresetUI();
}

function onPresetToggle(idx: number, checked: boolean) {
  if (checked) {
    if (!state.activePresets.includes(idx)) state.activePresets.push(idx);
  } else {
    state.activePresets = state.activePresets.filter((i) => i !== idx);
  }
  syncPresetUI();
  renderChart();
}

/** Apply preset selection to axes/selects, gate incompatible options, update summary label. */
function syncPresetUI() {
  const n = state.activePresets.length;
  const sum = q<HTMLElement>("presetMenuSummary");
  if (sum) sum.textContent = n ? `已选 ${n} 个预设` : "手动选轴…";

  // Axes/color are preset-driven once real overlaying (≥2) is active.
  const overlay = n >= 2;
  for (const id of ["xAxisSelect", "yAxisSelect", "colorFieldSelect"]) {
    const el = q<HTMLSelectElement>(id);
    if (el) el.disabled = overlay;
  }

  const sig = n ? presetSig(state.presets[state.activePresets[0]]) : null;
  document.querySelectorAll<HTMLInputElement>("#presetPanel input[type=checkbox]").forEach((cb) => {
    const i = Number(cb.dataset.idx);
    cb.checked = state.activePresets.includes(i);
    const blocked = !!sig && !cb.checked && presetSig(state.presets[i]) !== sig;
    cb.disabled = blocked;
    cb.closest(".preset-item")?.classList.toggle("is-disabled", blocked);
  });

  if (n) {
    const first = state.presets[state.activePresets[0]];
    state.xField = first.x;
    state.yField = first.y;
    if (first.colorField) state.colorField = first.colorField;
    const xSel = q<HTMLSelectElement>("xAxisSelect");
    const ySel = q<HTMLSelectElement>("yAxisSelect");
    const cSel = q<HTMLSelectElement>("colorFieldSelect");
    if (xSel) xSel.value = state.xField;
    if (ySel) ySel.value = state.yField;
    if (cSel) cSel.value = state.colorField;
    populateFilterSelect("colorFilterSelect");
  }
}

function populateFilterSelect(id: string) {
  const sel = q<HTMLSelectElement>(id);
  if (!sel) return;
  const field = state.colorField;
  const values = new Set<string>();
  for (const p of state.points) {
    const v = String(getNestedValue(p.raw, field) ?? "");
    if (v && v !== "null" && v !== "undefined") values.add(v);
  }
  sel.innerHTML = '<option value="">全部</option>';
  for (const v of [...values].sort()) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    sel.appendChild(o);
  }
}

function bindEvents() {
  const xSel = q<HTMLSelectElement>("xAxisSelect");
  const ySel = q<HTMLSelectElement>("yAxisSelect");
  const colorSel = q<HTMLSelectElement>("colorFieldSelect");
  const filterSel = q<HTMLSelectElement>("colorFilterSelect");
  const labelSel = q<HTMLSelectElement>("labelModeSelect");
  const searchInput = q<HTMLInputElement>("chartSearchInput");

  document.addEventListener("click", (e) => {
    const menu = q<HTMLDetailsElement>("presetMenu");
    if (menu?.open && !menu.contains(e.target as Node)) menu.open = false;
  });

  xSel?.addEventListener("change", () => {
    state.xField = xSel.value;
    renderChart();
  });
  ySel?.addEventListener("change", () => {
    state.yField = ySel.value;
    renderChart();
  });
  colorSel?.addEventListener("change", () => {
    state.colorField = colorSel.value;
    populateFilterSelect("colorFilterSelect");
    renderChart();
  });
  q<HTMLSelectElement>("borderFieldSelect")?.addEventListener("change", (e) => {
    state.borderField = (e.target as HTMLSelectElement).value;
    renderChart();
  });
  filterSel?.addEventListener("change", () => {
    state.colorFilter = filterSel.value;
    renderChart();
  });
  labelSel?.addEventListener("change", () => {
    state.labelMode = labelSel.value as ChartState["labelMode"];
    renderChart();
  });
  searchInput?.addEventListener("input", () => {
    state.searchTerm = searchInput.value;
    renderChart();
  });

  q("chartResetButton")?.addEventListener("click", () => {
    const resetX = state.dataType === "model-tools" ? "costPerTaskUSD" : "gpuVramGB";
    const resetY = state.dataType === "model-tools" ? "codingAgentScore" : "outputTps";
    const resetBorder = state.dataType === "model-tools" ? "toolName" : "";
    state.xField = resetX;
    state.yField = resetY;
    state.colorField = "modelVendor";
    state.borderField = resetBorder;
    state.labelMode = "auto";
    state.searchTerm = "";
    state.colorFilter = "";
    state.activePresets = [];

    if (xSel) xSel.value = resetX;
    if (ySel) ySel.value = resetY;
    if (colorSel) colorSel.value = "modelVendor";
    const borderSel2 = q<HTMLSelectElement>("borderFieldSelect");
    if (borderSel2) borderSel2.value = resetBorder;
    if (labelSel) labelSel.value = "auto";
    if (searchInput) searchInput.value = "";

    syncPresetUI();
    populateFilterSelect("colorFilterSelect");
    renderChart();
  });

  const observer = new MutationObserver(() => {
    if (state.chart) renderChart();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

async function init() {
  const root = document.querySelector<HTMLElement>("[data-chart-page]");
  if (!root) return;
  const pageType = root.dataset.chartPage as ChartState["dataType"];
  state.dataType = pageType;

  try {
    if (pageType === "model-tools") {
      const { points, axisFields, presets } = await loadModelToolChartData();
      state.points = points;
      state.axisFields = axisFields;
      state.presets = presets;
      state.xField = "costPerTaskUSD";
      state.yField = "codingAgentScore";
      state.borderField = "toolName";
    } else {
      const { points, axisFields } = await loadModelHardwareChartData();
      state.points = points;
      state.axisFields = axisFields;
      state.xField = "gpuVramGB";
      state.yField = "outputTps";
    }
  } catch (err) {
    console.error("Failed to load chart data:", err);
    const canvas = q<HTMLCanvasElement>("chartCanvas");
    if (canvas?.parentElement) {
      canvas.parentElement.innerHTML = `<div class="muted" style="text-align:center;padding:48px">数据加载失败: ${err instanceof Error ? err.message : "未知错误"}</div>`;
    }
    return;
  }

  populateSelect("xAxisSelect", state.axisFields, state.xField);
  populateSelect("yAxisSelect", state.axisFields, state.yField);
  populateColorSelect("colorFieldSelect", pageType);
  populateBorderSelect("borderFieldSelect", pageType);
  const borderSelInit = q<HTMLSelectElement>("borderFieldSelect");
  if (borderSelInit) borderSelInit.value = state.borderField;
  buildPresetPanel();
  populateFilterSelect("colorFilterSelect");

  bindEvents();
  renderChart();
}

document.addEventListener("DOMContentLoaded", init);
if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
}
