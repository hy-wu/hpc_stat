/**
 * chart-data.ts
 * Data loading, merging, and axis field definitions for scatter/line chart pages.
 * Loads all JSON data files, merges them by model/tool/hardware keys,
 * and exposes field definitions for user-axis selection.
 */

import { dataUrl } from "./data-url";
import { getNestedValue } from "./format";

// ── Field definition ──
export interface AxisField {
  key: string;       // dot-separated path to the value
  label: string;     // human-readable label
  unit?: string;     // optional unit suffix
  source: string;    // which dataset this comes from
  scale?: "linear" | "logarithmic";
  direction?: "higher-better" | "lower-better";
}

// ── Data point for charting ──
export interface ChartPoint {
  id: string;
  label: string;               // primary label (model name)
  subLabel?: string;            // secondary label (tool/hardware name)
  x: number | null;
  y: number | null;
  colorKey?: string;            // for color encoding
  meta: Record<string, unknown>; // all merged values
}

// ── Available axis fields ──

/** Fields for Model × Tool chart */
export const modelToolAxisFields: AxisField[] = [
  { key: "costPerTaskUSD", label: "估算任务成本", unit: "USD", source: "模型定价", scale: "logarithmic", direction: "lower-better" },
  { key: "codingAgentScore", label: "可用编码/Agent 指数", source: "模型评测", direction: "higher-better" },
  { key: "codingAgentIndex", label: "LLM-Stats 编码指数", source: "模型评测", direction: "higher-better" },
  // Model-tools specific
  { key: "codingFit", label: "代码适配 (C)", unit: "/5", source: "模型×工具" },
  { key: "agentFit", label: "Agent 适配 (A)", unit: "/5", source: "模型×工具" },
  { key: "contextFit", label: "长上下文适配 (X)", unit: "/5", source: "模型×工具" },
  // Model fields
  { key: "arenaElo", label: "Arena ELO", source: "模型" },
  { key: "params", label: "参数量", unit: "B", source: "模型" },
  { key: "paramsActive", label: "激活参数量", unit: "B", source: "模型" },
  { key: "copilotMultiplier", label: "Copilot 倍率", source: "模型" },
  // Model evals
  { key: "evals.gpqaDiamond", label: "GPQA Diamond", unit: "%", source: "模型评测" },
  { key: "evals.reportedSweBenchVerified", label: "SWE-bench Verified", unit: "%", source: "模型评测" },
  { key: "evals.hle", label: "Humanity's Last Exam", unit: "%", source: "模型评测" },
  { key: "evals.browseComp", label: "BrowseComp", unit: "%", source: "模型评测" },
  // Model llmStats
  { key: "llmStats.codeArena", label: "LLM-Stats Code Arena", source: "模型评测" },
  { key: "llmStats.coding", label: "LLM-Stats 编码", unit: "%", source: "模型评测" },
  { key: "llmStats.reasoning", label: "LLM-Stats 推理", unit: "%", source: "模型评测" },
  { key: "llmStats.math", label: "LLM-Stats 数学", unit: "%", source: "模型评测" },
  { key: "llmStats.tools", label: "LLM-Stats 工具使用", unit: "%", source: "模型评测" },
  { key: "llmStats.longCtx", label: "LLM-Stats 长上下文", unit: "%", source: "模型评测" },
  { key: "llmStats.speed", label: "LLM-Stats 速度", unit: "%", source: "模型评测" },
  { key: "llmStats.search", label: "LLM-Stats 搜索", unit: "%", source: "模型评测" },
  { key: "llmStats.vision", label: "LLM-Stats 视觉", unit: "%", source: "模型评测" },
  // Model pricing
  { key: "pricing.official.in", label: "官方 In 价格", unit: "$/M", source: "模型定价" },
  { key: "pricing.official.out", label: "官方 Out 价格", unit: "$/M", source: "模型定价" },
  { key: "pricing.official.hit", label: "官方 In(Hit) 价格", unit: "$/M", source: "模型定价" },
  { key: "pricing.openrouter.in", label: "OpenRouter In", unit: "$/M", source: "模型定价" },
  { key: "pricing.openrouter.out", label: "OpenRouter Out", unit: "$/M", source: "模型定价" },
  { key: "pricing.cursor.in", label: "Cursor In", unit: "$/M", source: "模型定价" },
  { key: "pricing.cursor.out", label: "Cursor Out", unit: "$/M", source: "模型定价" },
  // Tool fields
  { key: "githubStars", label: "工具 GitHub Stars", source: "工具" },
  { key: "toolPricing", label: "工具起步价", unit: "USD", source: "工具" },
  // Tool fit scores
  { key: "avgCodingFit", label: "模型平均代码适配", unit: "/5", source: "聚合" },
  { key: "avgAgentFit", label: "模型平均 Agent 适配", unit: "/5", source: "聚合" },
  { key: "avgContextFit", label: "模型平均长上下文适配", unit: "/5", source: "聚合" },
];

/** Fields for Model × Hardware chart */
export const modelHardwareAxisFields: AxisField[] = [
  { key: "gpuVramGB", label: "GPU 显存", unit: "GB", source: "GPU" },
  { key: "outputTps", label: "输出速度 (decode)", unit: "tok/s", source: "模型×硬件", direction: "higher-better" },
  { key: "gpuPriceUSD", label: "GPU 参考价", unit: "USD", source: "GPU", scale: "logarithmic", direction: "lower-better" },
  { key: "gpuPriceCNY", label: "闲鱼二手价", unit: "¥", source: "GPU", scale: "logarithmic", direction: "lower-better" },
  // Model-hardware specific
  { key: "fitScore", label: "硬件适配分", unit: "/5", source: "模型×硬件" },
  { key: "memoryFit", label: "显存适配", unit: "/5", source: "模型×硬件" },
  { key: "bandwidthFit", label: "带宽适配", unit: "/5", source: "模型×硬件" },
  { key: "computeFit", label: "算力适配", unit: "/5", source: "模型×硬件" },
  { key: "inputTps", label: "输入速度 (prefill)", unit: "tok/s", source: "模型×硬件" },
  { key: "concurrency", label: "并发数", source: "模型×硬件" },
  { key: "minVramGB", label: "最低显存需求", unit: "GB", source: "模型×硬件" },
  { key: "gpuCount", label: "GPU 卡数", source: "模型×硬件" },
  // Model fields
  { key: "arenaElo", label: "Arena ELO", source: "模型" },
  { key: "params", label: "参数量", unit: "B", source: "模型" },
  { key: "paramsActive", label: "激活参数量", unit: "B", source: "模型" },
  { key: "copilotMultiplier", label: "Copilot 倍率", source: "模型" },
  // Model evals
  { key: "evals.gpqaDiamond", label: "GPQA Diamond", unit: "%", source: "模型评测" },
  { key: "evals.reportedSweBenchVerified", label: "SWE-bench Verified", unit: "%", source: "模型评测" },
  { key: "evals.hle", label: "Humanity's Last Exam", unit: "%", source: "模型评测" },
  { key: "evals.browseComp", label: "BrowseComp", unit: "%", source: "模型评测" },
  // Model llmStats
  { key: "llmStats.codeArena", label: "LLM-Stats Code Arena", source: "模型评测" },
  { key: "llmStats.reasoning", label: "LLM-Stats 推理", unit: "%", source: "模型评测" },
  { key: "llmStats.math", label: "LLM-Stats 数学", unit: "%", source: "模型评测" },
  { key: "llmStats.tools", label: "LLM-Stats 工具使用", unit: "%", source: "模型评测" },
  { key: "llmStats.speed", label: "LLM-Stats 速度", unit: "%", source: "模型评测" },
  // Model pricing
  { key: "pricing.official.in", label: "官方 In 价格", unit: "$/M", source: "模型定价" },
  { key: "pricing.official.out", label: "官方 Out 价格", unit: "$/M", source: "模型定价" },
  // GPU fields
  { key: "gpuBandwidthGBs", label: "GPU 带宽", unit: "GB/s", source: "GPU" },
  { key: "gpuBf16TFLOPS", label: "GPU BF16 算力", unit: "TFLOPS", source: "GPU" },
  { key: "gpuFp16TFLOPS", label: "GPU FP16 算力", unit: "TFLOPS", source: "GPU" },
  { key: "gpuFp8TFLOPS", label: "GPU FP8 算力", unit: "TFLOPS", source: "GPU" },
  { key: "gpuInt8TOPS", label: "GPU INT8 算力", unit: "TOPS", source: "GPU" },
  { key: "gpuPowerW", label: "GPU 功耗", unit: "W", source: "GPU" },
  { key: "gpuCudaCores", label: "GPU CUDA 核心数", source: "GPU" },
  // Aggregated
  { key: "avgFitScore", label: "模型平均硬件适配", unit: "/5", source: "聚合" },
  { key: "avgMemoryFit", label: "模型平均显存适配", unit: "/5", source: "聚合" },
  { key: "avgBandwidthFit", label: "模型平均带宽适配", unit: "/5", source: "聚合" },
  { key: "avgComputeFit", label: "模型平均算力适配", unit: "/5", source: "聚合" },
  { key: "avgInputTps", label: "模型平均输入速度", unit: "tok/s", source: "聚合" },
  { key: "avgOutputTps", label: "模型平均输出速度", unit: "tok/s", source: "聚合" },
];

// ── Data loading ──

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

function normalizeModelIdentity(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Build a map of modelId → model record for quick lookup */
function buildModelMap(models: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const m of models) {
    const id = m.id as string;
    // Store a flat version with dot-path access
    if (id) {
      map.set(id, m);
      map.set(normalizeModelIdentity(id), m);
    }
    // Also index by name
    if (m.name) {
      map.set(m.name as string, m);
      map.set(normalizeModelIdentity(m.name as string), m);
    }
  }
  return map;
}

function getModelRecord(
  modelMap: Map<string, Record<string, unknown>>,
  modelId: string,
): Record<string, unknown> | undefined {
  return modelMap.get(modelId) ?? modelMap.get(normalizeModelIdentity(modelId));
}

/** Build a map of toolId → tool record */
function buildToolMap(tools: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const t of tools) {
    map.set(t.id as string, t);
  }
  return map;
}

/** Build a map of gpuId → gpu record */
function buildGpuMap(gpus: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const g of gpus) {
    map.set(g.id as string, g);
  }
  return map;
}

/** Get a numeric value from a record via dot-path, returning null if not available */
function getNum(record: Record<string, unknown> | undefined, path: string): number | null {
  if (!record) return null;
  const val = getNestedValue(record, path);
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

interface PriceEstimate {
  value: number | null;
  source: string;
}

const PRICING_PRIORITY = [
  "official",
  "openrouter",
  "deep-infra",
  "cursor",
  "paratera",
  "deepseek_official",
];

function estimateCostPerTask(model: Record<string, unknown> | undefined): PriceEstimate {
  const pricing = model?.pricing as Record<string, unknown> | undefined;
  if (!pricing) return { value: null, source: "" };

  let best: PriceEstimate = { value: null, source: "" };
  for (const key of PRICING_PRIORITY) {
    const p = pricing[key] as Record<string, unknown> | undefined;
    const input = Number(p?.in);
    const output = Number(p?.out);
    if (!Number.isFinite(input) || !Number.isFinite(output)) continue;
    const value = input + output * 0.125;
    if (value <= 0) continue;
    if (best.value === null || key === "official" || value < best.value) {
      best = { value: Number(value.toFixed(4)), source: key };
    }
    if (key === "official") break;
  }
  return best;
}

function getCodingAgentIndex(model: Record<string, unknown> | undefined): number | null {
  return getNum(model, "llmStats.coding");
}

interface CodingScoreEstimate {
  value: number | null;
  source: string;
  rawValue: number | null;
}

interface CodingScoreContext {
  codeArenaValues: number[];
  arenaEloValues: number[];
}

function collectPositiveValues(models: Record<string, unknown>[], path: string): number[] {
  return models
    .map((model) => getNum(model, path))
    .filter((value): value is number => value !== null && value > 0);
}

function normalizeObservedScore(value: number, values: number[]): number | null {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return 100;
  const scaled = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Number(scaled.toFixed(2))));
}

function estimateCodingAgentScore(
  model: Record<string, unknown> | undefined,
  ctx: CodingScoreContext,
): CodingScoreEstimate {
  const coding = getNum(model, "llmStats.coding");
  if (coding !== null && coding > 0) {
    return { value: Number(coding.toFixed(2)), source: "LLM-Stats Coding", rawValue: coding };
  }

  const swe = getNum(model, "evals.reportedSweBenchVerified");
  if (swe !== null && swe > 0) {
    return { value: Number(swe.toFixed(2)), source: "SWE-bench Verified", rawValue: swe };
  }

  const codeArena = getNum(model, "llmStats.codeArena");
  if (codeArena !== null && codeArena > 0) {
    return {
      value: normalizeObservedScore(codeArena, ctx.codeArenaValues),
      source: "LLM-Stats Code Arena · observed min-max",
      rawValue: codeArena,
    };
  }

  const gpqa = getNum(model, "evals.gpqaDiamond");
  if (gpqa !== null && gpqa > 0) {
    return { value: Number(gpqa.toFixed(2)), source: "GPQA Diamond", rawValue: gpqa };
  }

  const arenaElo = getNum(model, "arenaElo");
  if (arenaElo !== null && arenaElo > 0) {
    return {
      value: normalizeObservedScore(arenaElo, ctx.arenaEloValues),
      source: "Arena ELO · observed min-max",
      rawValue: arenaElo,
    };
  }

  return { value: null, source: "", rawValue: null };
}

function mergeHandModelRows(
  models: Record<string, unknown>[],
  handModels: Record<string, unknown>[],
): Record<string, unknown>[] {
  const merged = models.map((model) => ({ ...model }));
  const byIdentity = new Map<string, Record<string, unknown>>();
  for (const model of merged) {
    for (const value of [model.id, model.name]) {
      if (typeof value === "string" && value.trim()) byIdentity.set(normalizeModelIdentity(value), model);
    }
  }

  for (const hand of handModels) {
    const handRow = normalizeHandModel(hand);
    const existing = [hand.modelId, hand.name]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map(normalizeModelIdentity)
      .map((key) => byIdentity.get(key))
      .find(Boolean);

    if (existing) {
      mergeHandFields(existing, handRow);
      continue;
    }

    merged.push(handRow);
    for (const value of [handRow.id, handRow.name]) {
      if (typeof value === "string" && value.trim()) byIdentity.set(normalizeModelIdentity(value), handRow);
    }
  }
  return merged;
}

function normalizeHandModel(hand: Record<string, unknown>): Record<string, unknown> {
  const name = String(hand.name ?? hand.modelId ?? "Unknown model");
  const pricing = (hand.pricing ?? {}) as Record<string, unknown>;
  return {
    id: `paratera-${slugifyModelName(String(hand.modelId ?? name))}`,
    name,
    vendor: inferHandVendor(name),
    contextWindow: hand.contextLength,
    pricing: {
      paratera: {
        in: pricing.input,
        hit: pricing.hit,
        out: pricing.output,
        cacheOutput: pricing.cacheOutput,
        cacheStorage: pricing.cacheStorage,
      },
    },
  };
}

function mergeHandFields(existing: Record<string, unknown>, handRow: Record<string, unknown>): void {
  if (handRow.contextWindow !== undefined && handRow.contextWindow !== null && handRow.contextWindow !== "") {
    if (existing.contextWindow === undefined || existing.contextWindow === null || existing.contextWindow === "") {
      existing.contextWindow = handRow.contextWindow;
    }
  }
  const existingPricing = (existing.pricing ?? {}) as Record<string, unknown>;
  const handPricing = (handRow.pricing ?? {}) as Record<string, unknown>;
  existing.pricing = { ...existingPricing, paratera: handPricing.paratera };
}

function slugifyModelName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "model";
}

function inferHandVendor(name: string): string {
  if (/^qwen/i.test(name)) return "Qwen";
  if (/^deepseek/i.test(name)) return "DeepSeek";
  if (/^kimi/i.test(name)) return "Moonshot AI";
  if (/^glm/i.test(name)) return "Zhipu AI";
  if (/^doubao|^wanx/i.test(name)) return "ByteDance";
  if (/^intern/i.test(name)) return "Shanghai AI Lab";
  if (/^minimax/i.test(name)) return "MiniMax";
  if (/^ernie/i.test(name)) return "Baidu";
  if (/^paddleocr/i.test(name)) return "Baidu";
  if (/^baichuan/i.test(name)) return "Baichuan";
  return "Paratera catalog";
}

// ── Merged data builders ──

export interface MergedModelToolPoint {
  id: string;
  modelName: string;
  toolName: string;
  modelVendor: string;
  supportStatus: string;
  // All raw values accessible via getNestedValue
  raw: Record<string, unknown>;
}

export interface MergedModelHardwarePoint {
  id: string;
  modelName: string;
  gpuName: string;
  modelVendor: string;
  gpuVendor: string;
  // All raw values
  raw: Record<string, unknown>;
}

/**
 * Load all data and merge model-tools records with model/tool info.
 * Returns flat points + axis fields for the page.
 */
export async function loadModelToolChartData(): Promise<{
  points: MergedModelToolPoint[];
  axisFields: AxisField[];
}> {
  const [toolsRecords, modelsRaw, agentTools, handModels] = await Promise.all([
    fetchJson<Record<string, unknown>[]>(dataUrl("model-tools.json")),
    fetchJson<Record<string, unknown>[]>(dataUrl("models.json")),
    fetchJson<Record<string, unknown>[]>(dataUrl("agent-tools.json")),
    fetchJson<Record<string, unknown>[]>(dataUrl("hand/paratera20260809.json")),
  ]);

  const models = mergeHandModelRows(modelsRaw, handModels);
  const modelMap = buildModelMap(models);
  const toolMap = buildToolMap(agentTools);
  const scoreContext: CodingScoreContext = {
    codeArenaValues: collectPositiveValues(models, "llmStats.codeArena"),
    arenaEloValues: collectPositiveValues(models, "arenaElo"),
  };

  const points: MergedModelToolPoint[] = toolsRecords.map((r) => {
    const modelId = r.modelId as string;
    const toolId = r.toolId as string;
    const modelRec = getModelRecord(modelMap, modelId);
    const toolRec = toolMap.get(toolId);
    const score = estimateCodingAgentScore(modelRec, scoreContext);

    // Merge all into raw
    const cost = estimateCostPerTask(modelRec);
    const raw: Record<string, unknown> = {
      ...modelRec,
      ...r,
      __modelRecord: modelRec,
      __toolRecord: toolRec,
      costPerTaskUSD: cost.value,
      costPerTaskSource: cost.source,
      codingAgentIndex: getCodingAgentIndex(modelRec),
      codingAgentScore: score.value,
      codingAgentScoreSource: score.source,
      codingAgentScoreRawValue: score.rawValue,
    };

    // Add tool-specific fields prefixed
    if (toolRec) {
      raw.githubStars = toolRec.githubStars;
      raw.toolPricing = getNestedValue(toolRec, "pricing.startingUSD");
      raw.toolFreeTier = getNestedValue(toolRec, "pricing.freeTier");
      raw.toolOpenSource = getNestedValue(toolRec, "pricing.openSource");
    }

    // Add avg fit scores per model for this tool
    raw.avgCodingFit = r.codingFit;
    raw.avgAgentFit = r.agentFit;
    raw.avgContextFit = r.contextFit;

    return {
      id: r.id as string,
      modelName: r.modelName as string,
      toolName: r.toolName as string,
      modelVendor: r.modelVendor as string,
      supportStatus: r.supportStatus as string,
      raw,
    };
  });

  return { points, axisFields: modelToolAxisFields };
}

/**
 * Load all data and merge model-hardware records with model/gpu info.
 */
export async function loadModelHardwareChartData(): Promise<{
  points: MergedModelHardwarePoint[];
  axisFields: AxisField[];
}> {
  const [hwRecords, modelsRaw, gpus, handModels] = await Promise.all([
    fetchJson<Record<string, unknown>[]>(dataUrl("model-hardware.json")),
    fetchJson<Record<string, unknown>[]>(dataUrl("models.json")),
    fetchJson<Record<string, unknown>[]>(dataUrl("gpus.json")),
    fetchJson<Record<string, unknown>[]>(dataUrl("hand/paratera20260809.json")),
  ]);

  const models = mergeHandModelRows(modelsRaw, handModels);
  const modelMap = buildModelMap(models);
  const gpuMap = buildGpuMap(gpus);
  const scoreContext: CodingScoreContext = {
    codeArenaValues: collectPositiveValues(models, "llmStats.codeArena"),
    arenaEloValues: collectPositiveValues(models, "arenaElo"),
  };

  const points: MergedModelHardwarePoint[] = hwRecords.map((r) => {
    const modelId = r.modelId as string;
    const gpuId = r.gpuId as string;
    const modelRec = getModelRecord(modelMap, modelId);
    const gpuRec = gpuMap.get(gpuId);
    const score = estimateCodingAgentScore(modelRec, scoreContext);

    const cost = estimateCostPerTask(modelRec);
    const raw: Record<string, unknown> = {
      ...modelRec,
      ...r,
      __modelRecord: modelRec,
      __gpuRecord: gpuRec,
      costPerTaskUSD: cost.value,
      costPerTaskSource: cost.source,
      codingAgentIndex: getCodingAgentIndex(modelRec),
      codingAgentScore: score.value,
      codingAgentScoreSource: score.source,
      codingAgentScoreRawValue: score.rawValue,
    };

    // Add GPU-specific fields with prefix
    if (gpuRec) {
      raw.gpuVramGB = gpuRec.vramGB;
      raw.gpuBandwidthGBs = gpuRec.bandwidthGBs;
      raw.gpuBf16TFLOPS = gpuRec.bf16TFLOPS;
      raw.gpuFp16TFLOPS = gpuRec.fp16TFLOPS;
      raw.gpuFp8TFLOPS = gpuRec.fp8TFLOPS;
      raw.gpuInt8TOPS = gpuRec.int8TOPS;
      raw.gpuPowerW = gpuRec.powerW;
      raw.gpuPriceUSD = gpuRec.priceUSD ?? gpuRec.msrpUSD;
      raw.gpuPriceCNY = gpuRec.priceCNY;
      raw.gpuCudaCores = gpuRec.cudaCores;
    }

    // Add hardware-specific avg fields
    raw.avgFitScore = r.fitScore;
    raw.avgMemoryFit = r.memoryFit;
    raw.avgBandwidthFit = r.bandwidthFit;
    raw.avgComputeFit = r.computeFit;
    raw.avgInputTps = r.inputTps;
    raw.avgOutputTps = r.outputTps;

    return {
      id: r.id as string,
      modelName: r.modelName as string,
      gpuName: r.gpuName as string,
      modelVendor: r.modelVendor as string,
      gpuVendor: r.gpuVendor as string,
      raw,
    };
  });

  return { points, axisFields: modelHardwareAxisFields };
}

/**
 * Get a numeric value from a merged point's raw data.
 */
export function getPointNum(point: { raw: Record<string, unknown> }, path: string): number | null {
  return getNum(point.raw, path);
}

/**
 * Group points by a color key (e.g. modelVendor, toolName, gpuName).
 */
export function groupPoints<T extends { raw: Record<string, unknown> }>(
  points: T[],
  colorKey: string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const p of points) {
    const val = String(getNestedValue(p.raw, colorKey) ?? "其他");
    if (!groups.has(val)) groups.set(val, []);
    groups.get(val)!.push(p);
  }
  return groups;
}
