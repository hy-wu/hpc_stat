// Analyze raw goofish search dumps in data/goofish/<id>.json with strict
// filtering: noise-word blacklist, per-segment price sanity bands, and a
// minimum sample requirement. Writes median priceCNY/priceUSD into gpus.json.
// Raw dumps are kept untouched for later verification.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const GPU_FILE = new URL("../data/gpus.json", import.meta.url);
const DIR = new URL("../data/goofish/", import.meta.url);
const CNY_PER_USD = 7.15;
const TODAY = "2026-08-22";

const NOISE = [
  "包装", "盒子", "纸箱", "图纸", "点位图", "原理图", "教程", "资料", "软件", "整合包",
  "部署包", "部署", "维修", "支架", "U盘", "u盘", "驱动", "bios", "BIOS", "刷机", "背板",
  "风扇", "供电线", "转接线", "转接", "模组线", "电源线", "线材", "硅脂", "导热", "散热",
  "机箱", "主板盒", "快递", "回收", "求购", "出租", "租赁", "算力租", "代练", "盲盒",
  "键帽", "贴纸", "手办", "玩具", "培训", "代刷", "改水冷", "水冷", "空盒", "测试工具",
  "测试软件", "超频工具", "解密", "跑分软件", "解锁", "教程包", "课程", "咨询", "适配服务",
  "上门服务", "改装", "魔改", "矿渣盲盒", "抽奖", "补差价", "定金", "运费",
  "出租", "算力出租", "算力收益", "整机", "数字人", "系统安装", "重装系统", "装机配置",
  "押金", "招募", "托管", "分成",
  "笔记本", "整机电脑", "整机出售",
];

// [min, max] plausible listing price (CNY) per segment
function priceBand(gpu) {
  const s = gpu.segment;
  if (s === "CPU") return [3, 90000];
  if (s === "Desktop" || s === "Mining") return [100, 60000];
  if (s === "Workstation") return [200, 120000];
  if (s === "Data Center") return [400, 1500000];
  if (s === "Inference") return [60, 400000];
  if (s === "FPGA") return [40, 200000];
  if (s === "Cloud Accelerator") return [400, 1500000];
  if (s === "SoC") return [800, 120000];
  return [10, 1500000];
}

function buildTokens(model) {
  const cleaned = model
    .replace(/\(.*?\)|（.*?）/g, "")
    .replace(/\d+-core GPU/gi, "")
    .replace(/\b(Dev Board|Eval Board|hashboard|Control Board|chip|module)\b/gi, "")
    .trim();
  const tokens = new Set();
  const add = (s) => { const t = s.toLowerCase().replace(/[\s-]+/g, ""); if (t.length >= 3) tokens.add(t); };
  const noVendor = cleaned
    .replace(/^(NVIDIA|AMD|Intel|Apple|Huawei|Baidu|Cambricon|Biren|Iluvatar CoreX|Hygon|Moore Threads|Google|Xilinx|Bitmain|Metax|Tianshu|Enflame|Vastai|Denglin|Sophgo|Innosilicon)\s*/i, "")
    .trim();
  add(noVendor);
  // drop marketing series words so bare "RTX4090"/"RX580" titles match
  add(noVendor.replace(/^(GeForce|Radeon|Instinct|Tesla|Quadro|TITAN)\s+/i, "").trim());
  // model-number tokens: "RTX 4090", "E5-2690", "MLU370", "S80", ...
  for (const m of cleaned.matchAll(/[A-Za-z]{1,6}\d{0,2}\s*-?\s*\d{2,}[A-Za-z0-9]*/g)) {
    const t = m[0].toLowerCase().replace(/[\s-]+/g, "");
    if (/^\d+[gt]b?$/.test(t)) continue;   // VRAM sizes
    if (/^[a-z]\d$/.test(t)) continue;      // too generic (m4, a2)
    if (t.length >= 3) tokens.add(t);
  }
  // mixed digit-letter codes like "7G100"
  for (const m of cleaned.matchAll(/\d+[a-z]+\d+/gi)) {
    const t = m[0].toLowerCase();
    if (t.length >= 3) tokens.add(t);
  }
  return { tokens: [...tokens], bareNums: cleaned.match(/\b\d{3,5}\b/g) ?? [] };
}

function titleMatches(title, tokens, bareNums = []) {
  const t = title.toLowerCase().replace(/\s+/g, "");
  if (tokens.some((tok) => t.includes(tok))) return true;
  // bare-number fallback for GPU-ish listings ("3090 显卡", "2080ti")
  return bareNums.some((n) => t.includes(n) && /(显卡|显示卡|gpu|卡)/.test(t));
}

function parsePrice(p) {
  const m = String(p).replace(/[¥￥,\s]/g, "").match(/[\d.]+/);
  if (!m) return null;
  const v = parseFloat(m[0]);
  return Number.isFinite(v) ? v : null;
}

function itemsOf(dump) {
  if (Array.isArray(dump?.items)) return dump.items;
  if (Array.isArray(dump?.data?.items)) return dump.data.items;
  if (Array.isArray(dump?.result?.data?.items)) return dump.result.data.items;
  return [];
}

const gpus = JSON.parse(readFileSync(GPU_FILE, "utf8"));
const files = new Set(readdirSync(DIR).filter((f) => f.endsWith(".json")));
const summary = { updated: 0, noMatch: 0, lowSample: 0, missingDump: 0 };
const noMatchList = [];

for (const gpu of gpus) {
  // Reset goofish-derived price fields first
  if (gpu.merchant === "goofish") {
    gpu.priceCNY = null; gpu.priceUSD = null; gpu.priceUpdated = null; gpu.merchant = "";
    gpu.notes = String(gpu.notes ?? "").replace(/闲鱼2026-08-22(?:中位价|前列聚簇价)[^)]*\)\s*/g, "").trim();
  }
  if (!files.has(`${gpu.id}.json`)) { summary.missingDump++; continue; }
  let dump;
  try { dump = JSON.parse(readFileSync(new URL(`${gpu.id}.json`, DIR), "utf8")); } catch { continue; }
  const items = itemsOf(dump);
  const built = buildTokens(gpu.model);
  const gpuish = ["Desktop", "Mining", "Workstation"].includes(gpu.segment);
  const tokens = built.tokens;
  const bareNums = gpuish ? built.bareNums : [];
  const [lo, hi] = priceBand(gpu);
  const noise = gpu.segment === "SoC" ? NOISE.filter((n) => n !== "整机") : NOISE;
  // Relevance-rank-ordered candidate prices (search order preserved in dumps)
  const ranked = [];
  for (const it of items) {
    const title = String(it.title ?? "");
    if (!titleMatches(title, tokens, bareNums)) continue;
    if (noise.some((n) => title.includes(n))) continue;
    const price = parsePrice(it.price);
    if (price === null || price < lo || price > hi) continue;
    ranked.push(price);
    if (ranked.length >= 8) break;
  }
  if (!ranked.length) { summary.noMatch++; noMatchList.push(gpu.id); continue; }
  // Cluster: pick the candidate with the most peers within ±30%, use cluster median
  let bestCluster = [ranked[0]];
  for (const p of ranked) {
    const cluster = ranked.filter((q) => Math.abs(q - p) <= 0.3 * Math.max(p, q));
    if (cluster.length > bestCluster.length) bestCluster = cluster;
  }
  if (bestCluster.length < 2) summary.lowSample++;
  bestCluster.sort((a, b) => a - b);
  const median = bestCluster[Math.floor(bestCluster.length / 2)];
  const spread = bestCluster.length > 1
    ? Math.round(((bestCluster[bestCluster.length - 1] - bestCluster[0]) / median) * 100)
    : null;
  gpu.priceCNY = Math.round(median);
  gpu.priceUSD = Math.round(median / CNY_PER_USD);
  gpu.priceUpdated = TODAY;
  gpu.merchant = "goofish";
  gpu.notes = (gpu.notes ? gpu.notes + " " : "") +
    `闲鱼${TODAY}前列聚簇价¥${gpu.priceCNY}(样本${bestCluster.length}${spread !== null ? `,离散${spread}%` : ",待核验"})`;
  summary.updated++;
}

writeFileSync(GPU_FILE, JSON.stringify(gpus, null, 2) + "\n");
console.log(JSON.stringify(summary));
writeFileSync(new URL("_nomatch.txt", DIR), noMatchList.join("\n") + "\n");
console.log("noMatch ids -> data/goofish/_nomatch.txt");
