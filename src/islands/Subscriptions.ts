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
  for (const cat of CATEGORY_ORDER) {
    const catRows = plans.filter((r) => r.category === cat);
    if (!catRows.length) continue;
    html += `<tr class="fam-cat-row"><td colspan="${2 + cols.length}">${escapeHtml(cat)} · ${catRows.length} 档</td></tr>`;
    for (const r of catRows) {
      const cells = cols.map((c) => {
        const yes = (r.families ?? []).includes(c.key);
        const guess = (r.familiesGuess ?? []).includes(c.key);
        if (yes) {
          return `<td class="heat-cell fam-yes" title="${escapeAttr(`${r.product} ${r.tier} · ${c.label}`)}">✓</td>`;
        }
        if (guess) {
          return `<td class="heat-cell fam-guess" title="${escapeAttr(`${r.product} ${r.tier} · ${c.label}（待核实）`)}">◐</td>`;
        }
        return `<td class="heat-cell fam-no"></td>`;
      });
      html += `<tr>
        <td class="heat-model-col" title="${escapeAttr(r.vendor)}">${escapeHtml(r.product)}</td>
        <td class="fam-tier">${escapeHtml(r.tier)}<span class="fam-price">${escapeHtml(r.priceText)}</span></td>
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
    summary.innerHTML = `✓ 已确认覆盖　◐ 待核实　·　多模型覆盖最广：${top.map(escapeHtml).join("、")}`;
  }
}

// ── 月价 × 额度散点图 ──
function renderChart(): void {
  const canvas = q<HTMLCanvasElement>("subChartCanvas");
  const metricSelect = q<HTMLSelectElement>("quotaMetricSelect");
  const summary = q("subChartSummary");
  if (!canvas) return;

  const metricKey = (metricSelect?.value ?? "qMonth") as "qMonth" | "qWeek" | "q5h";
  const metricLabel = QUOTA_METRICS.find((m) => m.key === metricKey)?.label ?? "额度/月≈";

  const byCat = new Map<string, Array<{ x: number; y: number; row: SubRow }>>();
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

  const datasets = [...byCat.entries()].map(([cat, pts]) => ({
    label: `${cat}（${pts.length}）`,
    data: pts.map((p) => ({ x: p.x, y: p.y })),
    backgroundColor: CATEGORY_COLORS[cat] ?? "#888",
    borderColor: "#ffffff",
    borderWidth: 1,
    pointRadius: 6,
    pointHoverRadius: 8,
    _rows: pts,
  }));

  const totalPlotted = [...byCat.values()].reduce((s, l) => s + l.length, 0);
  if (summary) {
    summary.textContent = `${metricLabel}：图上 ${totalPlotted} 档 · ${skipped} 档无该口径数据未显示（免费价按 ¥0.4 占位；各产品额度口径不同，仅供量级比较）`;
  }

  if (chart) chart.destroy();
  chart = new Chart(canvas, {
    type: "scatter",
    data: { datasets: datasets as never },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: { position: "top", labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            title(items) {
              const ds = datasets[items[0].datasetIndex] as { _rows?: Array<{ row: SubRow }> };
              const r = ds._rows?.[items[0].dataIndex]?.row;
              return r ? `${r.product} · ${r.tier}` : "";
            },
            label(item) {
              const ds = datasets[item.datasetIndex] as { _rows?: Array<{ row: SubRow }> };
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
  });
}

function bindControls(): void {
  q<HTMLSelectElement>("quotaMetricSelect")?.addEventListener("change", () => renderChart());
}

load().catch((err) => {
  console.error("subscriptions page data load failed:", err);
  const summary = q("matrixSummary");
  if (summary) summary.textContent = "数据加载失败。";
});
