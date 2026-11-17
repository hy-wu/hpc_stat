/**
 * Client-side island: 订阅对比页附加可视化
 * 1) 模型家族 × 套餐 覆盖矩阵
 * 2) 月价 × 额度 散点图（Chart.js, log-log）
 */

import { Chart, registerables } from "chart.js";
import { dataUrl } from "../lib/data-url";
import { escapeHtml, escapeAttr } from "../lib/escape";

Chart.register(...registerables);

interface SubRow {
  id: string;
  category: string;
  vendor: string;
  product: string;
  tier: string;
  priceText: string;
  monthlyCny: number | null;
  hourlyCny?: number | null;
  billing?: string[];
  quotaText?: string;
  q5h?: number | null;
  qWeek?: number | null;
  qMonth?: number | null;
  quotaUnit?: string;
  families?: string[];
  familiesGuess?: string[];
  modelCount?: number;
  models?: string;
  perks?: string;
  verified?: string;
  asOf?: string;
  source?: string;
  notes?: string;
}

const FAMILY_ORDER: Array<{ key: string; label: string }> = [
  { key: "doubao", label: "豆包·Seed" },
  { key: "qwen", label: "千问 Qwen" },
  { key: "glm", label: "GLM 智谱" },
  { key: "kimi", label: "Kimi" },
  { key: "deepseek", label: "DeepSeek" },
  { key: "minimax", label: "MiniMax" },
  { key: "ernie", label: "文心 ERNIE" },
  { key: "hunyuan", label: "混元" },
  { key: "spark", label: "星火" },
  { key: "skywork", label: "天工" },
  { key: "mimo", label: "MiMo" },
  { key: "claude", label: "Claude" },
  { key: "gpt", label: "GPT" },
  { key: "gemini", label: "Gemini" },
  { key: "thirdparty", label: "第三方聚合" },
  { key: "auto", label: "Auto 路由" },
];

const CATEGORY_ORDER = ["C端助手", "编程订阅", "API平台"];
const CATEGORY_COLORS: Record<string, string> = {
  "C端助手": "#2f80ed",
  "编程订阅": "#27ae60",
  "API平台": "#f2994a",
  "算力租赁": "#9b51e0",
};

const QUOTA_METRICS = [
  { key: "qMonth", label: "额度/月≈" },
  { key: "qWeek", label: "额度/周" },
  { key: "q5h", label: "额度/5小时" },
] as const;

let rows: SubRow[] = [];
let chart: Chart | null = null;

function q<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

async function load(): Promise<void> {
  const res = await fetch(dataUrl("subscriptions.json"));
  rows = (await res.json()) as SubRow[];
  renderMatrix();
  renderChart();
  bindControls();
}

// ── 模型家族 × 套餐覆盖矩阵 ──
interface MatrixRow {
  product: string;
  vendor: string;
  tiers: SubRow[];
  tierLabel: string;
  priceLabel: string;
  families: Set<string>;
  familiesGuess: Set<string>;
}

function coverageSignature(r: SubRow): string {
  return [...(r.families ?? [])].sort().join(",") + "|" + [...(r.familiesGuess ?? [])].sort().join(",");
}

function priceRangeLabel(tiers: SubRow[]): string {
  const prices = tiers
    .map((t) => t.monthlyCny)
    .filter((v): v is number => typeof v === "number");
  if (prices.length >= 2) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `¥${min}/月`;
    return `¥${min}–¥${max}/月`;
  }
  const texts = [...new Set(tiers.map((t) => t.priceText))];
  return texts.join(" / ");
}

/** 同产品且覆盖签名完全一致的档位合并为一行 */
function collapseRows(catRows: SubRow[]): MatrixRow[] {
  const byProduct = new Map<string, SubRow[]>();
  for (const r of catRows) {
    const key = `${r.vendor}::${r.product}`;
    const list = byProduct.get(key) ?? [];
    list.push(r);
    byProduct.set(key, list);
  }
  const merged: MatrixRow[] = [];
  for (const productRows of byProduct.values()) {
    const bySig = new Map<string, SubRow[]>();
    for (const r of productRows) {
      const sig = coverageSignature(r);
      const list = bySig.get(sig) ?? [];
      list.push(r);
      bySig.set(sig, list);
    }
    for (const tiers of bySig.values()) {
      const first = tiers[0];
      merged.push({
        product: first.product,
        vendor: first.vendor,
        tiers,
        tierLabel: tiers.map((t) => t.tier).join(" / "),
        priceLabel: priceRangeLabel(tiers),
        families: new Set(first.families ?? []),
        familiesGuess: new Set(first.familiesGuess ?? []),
      });
    }
  }
  return merged;
}

let mergeSameCoverage = true;

function renderMatrix(): void {
  const tbody = q("familyMatrixBody");
  const summary = q("matrixSummary");
  if (!tbody) return;

  const plans = rows.filter(
    (r) =>
      r.category !== "算力租赁" &&
      ((r.families && r.families.length > 0) || (r.familiesGuess && r.familiesGuess.length > 0)),
  );

  // 只保留实际被引用的家族列
  const usedFamilies = new Set<string>();
  for (const r of plans) {
    (r.families ?? []).forEach((f) => usedFamilies.add(f));
    (r.familiesGuess ?? []).forEach((f) => usedFamilies.add(f));
  }
  const cols = FAMILY_ORDER.filter((f) => usedFamilies.has(f.key));

  // 表头
  const thead = q("familyMatrixHead");
  if (thead) {
    thead.innerHTML = `<tr>
      <th class="heat-model-col">套餐（按类别分组）</th>
      <th>档位</th>
      ${cols.map((c) => `<th class="heat-bench-col"><span>${escapeHtml(c.label)}</span></th>`).join("")}
    </tr>`;
  }

  let html = "";
  let rowCount = 0;
  let mergedCount = 0;
  for (const cat of CATEGORY_ORDER) {
    const catRows = plans.filter((r) => r.category === cat);
    if (!catRows.length) continue;
    const display = mergeSameCoverage ? collapseRows(catRows) : catRows.map((r) => ({
      product: r.product,
      vendor: r.vendor,
      tiers: [r],
      tierLabel: r.tier,
      priceLabel: r.priceText,
      families: new Set(r.families ?? []),
      familiesGuess: new Set(r.familiesGuess ?? []),
    }));
    mergedCount += catRows.length - display.length;
    rowCount += display.length;
    html += `<tr class="fam-cat-row"><td colspan="${2 + cols.length}">${escapeHtml(cat)} · ${display.length} 行 / ${catRows.length} 档</td></tr>`;
    for (const m of display) {
      const cells = cols.map((c) => {
        const title = `${m.product} ${m.tierLabel} · ${c.label}`;
        if (m.families.has(c.key)) {
          return `<td class="heat-cell fam-yes" title="${escapeAttr(title)}">✓</td>`;
        }
        if (m.familiesGuess.has(c.key)) {
          return `<td class="heat-cell fam-guess" title="${escapeAttr(title + "（待核实）")}">◐</td>`;
        }
        return `<td class="heat-cell fam-no"></td>`;
      });
      const mergedTip = m.tiers.length > 1 ? ` title="${escapeAttr(m.tiers.map((t) => `${t.tier}：${t.priceText}`).join("；"))}"` : "";
      html += `<tr>
        <td class="heat-model-col" title="${escapeAttr(m.vendor)}">${escapeHtml(m.product)}</td>
        <td class="fam-tier"${mergedTip}>${escapeHtml(m.tierLabel)}<span class="fam-price">${escapeHtml(m.priceLabel)}</span></td>
        ${cells.join("")}
      </tr>`;
    }
  }
  tbody.innerHTML = html;

  if (summary) {
    const multi = plans.filter((r) => ((r.families ?? []).length + (r.familiesGuess ?? []).length) >= 3);
    const top = multi
      .sort((a, b) => ((b.families ?? []).length + (b.familiesGuess ?? []).length) - ((a.families ?? []).length + (a.familiesGuess ?? []).length))
      .slice(0, 3)
      .map((r) => `${r.product}·${r.tier}`);
    const mergeNote = mergeSameCoverage && mergedCount > 0 ? ` · 已缩并 ${mergedCount} 档同覆盖档位` : "";
    summary.innerHTML = `✓ 已确认覆盖　◐ 待核实　·　多模型覆盖最广：${top.map(escapeHtml).join("、")}${mergeNote}`;
  }
}

// ── 月价 × 额度散点图 ──
interface PlotPoint {
  x: number;
  y: number;
  row: SubRow;
}

interface PointDataset {
  label: string;
  data: Array<{ x: number; y: number }>;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  pointRadius: number;
  pointHoverRadius: number;
  _rows: PlotPoint[];
}

function hexAlpha(hex: string, alpha: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

/** 在点上绘制「产品·档位」标签，贪心避让已占用区域 */
let chartSummaryBase = "";

const planLabelPlugin = {
  id: "planLabels",
  afterDatasetsDraw(c: Chart) {
    const ctx = c.ctx;
    const area = c.chartArea;
    ctx.save();
    ctx.font = "10px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#333";
    const occupied: Array<[number, number, number, number]> = [];
    let skippedLabels = 0;

    c.data.datasets.forEach((ds, di) => {
      const rowsOfDs = (ds as unknown as PointDataset)._rows;
      if (!rowsOfDs) return;
      const meta = c.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((el, ei) => {
        const p = rowsOfDs[ei];
        if (!p) return;
        const { x: px, y: py } = el as unknown as { x: number; y: number };
        const label = `${p.row.product} ${p.row.tier}`;
        const w = ctx.measureText(label).width;
        const candidates: Array<[number, number]> = [
          [px + 8, py - 7],
          [px + 8, py + 7],
          [px - w - 8, py - 7],
          [px - w - 8, py + 7],
        ];
        for (const [lx, ly] of candidates) {
          const x1 = lx;
          const y1 = ly - 6;
          const x2 = lx + w;
          const y2 = ly + 6;
          if (x1 < area.left || x2 > area.right || y1 < area.top || y2 > area.bottom) continue;
          if (occupied.some(([a1, b1, a2, b2]) => !(x2 < a1 || x1 > a2 || y2 < b1 || y1 > b2))) continue;
          ctx.fillStyle = ink;
          ctx.fillText(label, lx, ly);
          occupied.push([x1, y1, x2, y2]);
          return;
        }
        skippedLabels++;
      });
    });
    ctx.restore();
    const el = q("subChartSummary");
    if (el && chartSummaryBase) {
      el.textContent = chartSummaryBase + (skippedLabels > 0 ? ` · ${skippedLabels} 个标签因重叠省略` : "");
    }
  },
};

function renderChart(): void {
  const canvas = q<HTMLCanvasElement>("subChartCanvas");
  const metricSelect = q<HTMLSelectElement>("quotaMetricSelect");
  const summary = q("subChartSummary");
  if (!canvas) return;

  const metricKey = (metricSelect?.value ?? "qMonth") as "qMonth" | "qWeek" | "q5h";
  const metricLabel = QUOTA_METRICS.find((m) => m.key === metricKey)?.label ?? "额度/月≈";

  const byCat = new Map<string, PlotPoint[]>();
  let skipped = 0;
  for (const r of rows) {
    const y = r[metricKey];
    const x = r.monthlyCny;
    if (typeof y !== "number" || y <= 0 || typeof x !== "number") {
      skipped++;
      continue;
    }
    const list = byCat.get(r.category) ?? [];
    list.push({ x: Math.max(x, 0.4), y, row: r });
    byCat.set(r.category, list);
  }

  // 同一产品的档位连线（>=2 点才有线）
  const byProduct = new Map<string, { cat: string; pts: PlotPoint[] }>();
  for (const [cat, pts] of byCat) {
    for (const p of pts) {
      const key = `${p.row.vendor}::${p.row.product}`;
      const g = byProduct.get(key) ?? { cat, pts: [] };
      g.pts.push(p);
      byProduct.set(key, g);
    }
  }
  const lineDatasets = [...byProduct.values()]
    .filter((g) => g.pts.length >= 2)
    .map((g) => ({
      type: "line" as const,
      label: "",
      data: [...g.pts].sort((a, b) => a.x - b.x).map((p) => ({ x: p.x, y: p.y })),
      borderColor: hexAlpha(CATEGORY_COLORS[g.cat] ?? "#888", 0.45),
      borderWidth: 1.5,
      borderDash: [4, 3],
      pointRadius: 0,
      fill: false,
      tension: 0,
    }));

  const pointDatasets: PointDataset[] = [...byCat.entries()].map(([cat, pts]) => ({
    label: `${cat}（${pts.length}）`,
    data: pts.map((p) => ({ x: p.x, y: p.y })),
    backgroundColor: CATEGORY_COLORS[cat] ?? "#888",
    borderColor: "#ffffff",
    borderWidth: 1,
    pointRadius: 6,
    pointHoverRadius: 8,
    _rows: pts,
  }));

  const datasets = [...lineDatasets, ...pointDatasets];
  const totalPlotted = [...byCat.values()].reduce((s, l) => s + l.length, 0);
  chartSummaryBase = `${metricLabel}：图上 ${totalPlotted} 档 · ${lineDatasets.length} 条产品档位折线 · ${skipped} 档无该口径数据未显示（免费价按 ¥0.4 占位；各产品额度口径不同，仅供量级比较）`;
  if (summary) summary.textContent = chartSummaryBase;

  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: "scatter",
    data: { datasets: datasets as never },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: {
          position: "top",
          labels: { boxWidth: 12, filter: (item) => item.text !== "" },
        },
        tooltip: {
          filter: (item) => Boolean((datasets[item.datasetIndex] as PointDataset)._rows),
          callbacks: {
            title(items) {
              const ds = datasets[items[0].datasetIndex] as PointDataset;
              const r = ds._rows?.[items[0].dataIndex]?.row;
              return r ? `${r.product} · ${r.tier}` : "";
            },
            label(item) {
              const ds = datasets[item.datasetIndex] as PointDataset;
              const r = ds._rows?.[item.dataIndex]?.row;
              if (!r) return "";
              return [
                `价格：${r.priceText}`,
                `额度：${r.quotaText ?? "—"}`,
                `模型：${r.models ?? "—"}`,
                `核实：${r.verified ?? "—"}（${r.asOf ?? "—"}）`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          title: { display: true, text: "月价 ¥（log，免费按 0.4 占位）" },
          min: 0.3,
          ticks: {
            callback: (v) => {
              const n = Number(v);
              return [0.4, 1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].includes(n)
                ? n === 0.4 ? "免费" : `¥${n}`
                : "";
            },
          },
        },
        y: {
          type: "logarithmic",
          title: { display: true, text: metricLabel },
        },
      },
    },
    plugins: [planLabelPlugin],
  });
}

function bindControls(): void {
  q<HTMLSelectElement>("quotaMetricSelect")?.addEventListener("change", () => renderChart());
  q<HTMLInputElement>("mergeCoverageToggle")?.addEventListener("change", (e) => {
    mergeSameCoverage = (e.target as HTMLInputElement).checked;
    renderMatrix();
  });
}

load().catch((err) => {
  console.error("subscriptions page data load failed:", err);
  const summary = q("matrixSummary");
  if (summary) summary.textContent = "数据加载失败。";
});
