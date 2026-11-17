import { Chart, registerables, type ChartDataset, type Plugin } from "chart.js";
import { escapeHtml, escapeAttr } from "../lib/escape";
import {
  groupCoverage, productKey, SUBSCRIPTION_FAMILIES as FAMILIES, type Subscription, type SubscriptionSelection,
} from "../lib/subscriptions";

Chart.register(...registerables);

const CATEGORIES = ["C端助手", "编程订阅", "API平台"];
const METRICS = { qMonth: "额度/月≈", qWeek: "额度/周", q5h: "额度/5小时" };
type Metric = keyof typeof METRICS;
type Point = { x: number; y: number; row: Subscription };
type PlanDataset = ChartDataset<"scatter", Point[]> & { productId: string };

let rows: Subscription[] = [];
let chart: Chart<"scatter", Point[]> | null = null;
const hiddenProducts = new Set<string>();
const productColors = new Map<string, string>();
const COLORS = ["#3289c7", "#d16d32", "#32a377", "#c24b7d", "#a49324", "#7968c7", "#bf4a40",
  "#288f98", "#b47d25", "#5375bb", "#9a62a6", "#638c36", "#cc6780", "#597f83", "#997456", "#8f733d"];
let labelMode = "auto";

function q<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function priceLabel(tiers: Subscription[]): string {
  const prices = tiers.map((t) => t.monthlyCny);
  if (prices.every((v): v is number => typeof v === "number" && Number.isFinite(v))) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? (min === 0 ? "免费" : `¥${min}/月`) : `¥${min}–${max}/月`;
  }
  return [...new Set(tiers.map((t) => t.priceText))].join(" / ");
}

function renderMatrix(): void {
  const plans = rows.filter((r) => r.category !== "算力租赁" &&
    ((r.families?.length ?? 0) + (r.familiesGuess?.length ?? 0) > 0));
  const used = new Set(plans.flatMap((r) => [...(r.families ?? []), ...(r.familiesGuess ?? [])]));
  const cols = FAMILIES.filter(([key]) => used.has(key));
  q("heatTable").style.setProperty("--family-count", String(cols.length));
  q("familyMatrixHead").innerHTML = `<tr>
    <th scope="col" class="heat-model-col">产品 / 厂商</th><th scope="col">档位与月价</th>
    ${cols.map(([, name]) => `<th scope="col" class="heat-bench-col"><span>${escapeHtml(name)}</span></th>`).join("")}
  </tr>`;
  let count = 0;
  let html = "";
  for (const category of CATEGORIES) {
    const subset = plans.filter((r) => r.category === category);
    if (!subset.length) continue;
    const groups = q<HTMLInputElement>("mergeCoverageToggle").checked
      ? groupCoverage(subset) : subset.map((r) => [r]);
    count += groups.length;
    html += `<tr class="fam-cat-row"><th scope="rowgroup" colspan="${cols.length + 2}">${escapeHtml(category)}
      <span>${groups.length} 行 / ${subset.length} 档</span></th></tr>`;
    for (const tiers of groups) {
      const first = tiers[0];
      const tierContent = tiers.length > 1
        ? `<details class="tier-details"><summary>${tiers.length} 档 · ${escapeHtml(priceLabel(tiers))}</summary>
            <ul>${tiers.map((t) => `<li><span>${escapeHtml(t.tier)}</span><span>${escapeHtml(t.priceText)}</span></li>`).join("")}</ul></details>`
        : `<span>${escapeHtml(first.tier)}</span><small>${escapeHtml(first.priceText)}</small>`;
      html += `<tr>
        <th scope="row" class="heat-model-col">${escapeHtml(first.product)}<small>${escapeHtml(first.vendor)}</small></th>
        <td class="fam-tier">${tierContent}</td>
        ${cols.map(([key, name]) => {
          const state = first.families?.includes(key) ? "yes" : first.familiesGuess?.includes(key) ? "guess" : "no";
          const text = state === "yes" ? "已确认覆盖" : state === "guess" ? "待核实" : "未收录覆盖";
          return `<td class="heat-cell fam-${state}" title="${escapeAttr(`${first.product} · ${name}：${text}`)}"
            aria-label="${escapeAttr(`${name}：${text}`)}">${state === "yes" ? "✓" : state === "guess" ? "◐" : "·"}</td>`;
        }).join("")}
      </tr>`;
    }
  }
  q("familyMatrixBody").innerHTML = html ||
    `<tr><td colspan="${cols.length + 2}" class="empty-state">当前筛选没有可展示的模型覆盖。算力租赁请查看明细表。</td></tr>`;
  q("matrixSummary").textContent = `${plans.length} 档套餐 → ${count} 行覆盖组合 · ${cols.length} 个模型家族 · 同产品、同覆盖的档位合并，点击档数查看价格`;
}

// Stable product colors keep line, points and legend in sync across all filters.
function productColor(id: string): string {
  return productColors.get(id) ?? COLORS[0];
}

function shortName(name: string): string {
  return name.replace(/（[^）]*）/g, "").replace(" App 办公助理会员", "").trim();
}

const labelsPlugin: Plugin<"scatter"> = {
  id: "subscriptionLabels",
  afterDatasetsDraw(c) {
    const { ctx, chartArea: area } = c;
    const mode = labelMode === "auto" ? (c.width < 600 ? "products" : "tiers") : labelMode;
    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim();
    const paper = getComputedStyle(document.documentElement).getPropertyValue("--panel").trim();
    const occupied: Array<{ x: number; y: number; w: number; h: number }> = [];
    const points = c.data.datasets.flatMap((_, i) => c.isDatasetVisible(i)
      ? c.getDatasetMeta(i).data.map((el) => ({ x: el.x, y: el.y })) : []);
    let skipped = 0;
    ctx.save();
    ctx.font = "11px 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textBaseline = "middle";
    c.data.datasets.forEach((ds, di) => {
      if (!c.isDatasetVisible(di) || mode === "none") return;
      const meta = c.getDatasetMeta(di);
      meta.data.forEach((el, pi) => {
        if (mode === "products" && pi !== ds.data.length - 1) return;
        const point = ds.data[pi] as Point;
        const text = pi === ds.data.length - 1
          ? `${shortName(point.row.product)}${mode === "tiers" ? ` · ${point.row.tier}` : ""}`
          : point.row.tier;
        const w = ctx.measureText(text).width + 8;
        const h = 17;
        const { x, y } = el;
        const offsets = [[9, -22], [9, 6], [-w - 9, -22], [-w - 9, 6], [-w / 2, -32], [-w / 2, 15]];
        for (const [dx, dy] of offsets) {
          const box = { x: x + dx, y: y + dy, w, h };
          if (box.x < area.left || box.x + w > area.right || box.y < area.top || box.y + h > area.bottom) continue;
          if (occupied.some((b) => box.x < b.x + b.w + 3 && box.x + w + 3 > b.x &&
            box.y < b.y + b.h + 2 && box.y + h + 2 > b.y)) continue;
          if (points.some((p) => p.x + 5 > box.x && p.x - 5 < box.x + w &&
            p.y + 5 > box.y && p.y - 5 < box.y + h)) continue;
          ctx.fillStyle = paper || "#fff";
          ctx.globalAlpha = 0.92;
          ctx.fillRect(box.x, box.y, w, h);
          ctx.globalAlpha = 1;
          ctx.fillStyle = ink || "#333";
          ctx.fillText(text, box.x + 4, box.y + h / 2);
          occupied.push(box);
          return;
        }
        skipped++;
      });
    });
    ctx.restore();
    q("chartLabelStatus").textContent = skipped ? `${skipped} 个密集标签已避让隐藏，悬停查看完整档位` : "";
  },
};

function renderChart(): void {
  const metric = q<HTMLSelectElement>("quotaMetricSelect").value as Metric;
  const units = [...new Set(rows.filter((r) => (r[metric] ?? 0) > 0 &&
    typeof r.monthlyCny === "number").map((r) => r.quotaUnit ?? "未标注"))].sort();
  const select = q<HTMLSelectElement>("quotaUnitSelect");
  const previous = select.value;
  select.innerHTML = `<option value="">全部单位（仅总览）</option>` +
    units.map((u) => `<option value="${escapeAttr(u)}">${escapeHtml(u)}</option>`).join("");
  select.value = units.includes(previous) ? previous : "";
  const unit = select.value;
  const includeFree = q<HTMLInputElement>("includeFreeToggle").checked;
  const groups = new Map<string, Point[]>();
  let freeCount = 0;
  for (const row of rows) {
    const x = row.monthlyCny;
    const y = row[metric];
    if (typeof x !== "number" || !Number.isFinite(x) || x < 0 ||
      typeof y !== "number" || !Number.isFinite(y) || y <= 0 ||
      (unit && (row.quotaUnit ?? "未标注") !== unit)) continue;
    if (x === 0) {
      freeCount++;
      if (!includeFree) continue;
    }
    // Never connect plans with different quota units, even within a product.
    const key = JSON.stringify([productKey(row), row.quotaUnit]);
    const list = groups.get(key) ?? [];
    list.push({ x: x === 0 ? 0.4 : x, y, row });
    groups.set(key, list);
  }
  const datasets: PlanDataset[] = [...groups.entries()].map(([id, data]) => {
    data.sort((a, b) => a.x - b.x || a.y - b.y);
    const color = productColor(productKey(data[0].row));
    return {
      productId: id,
      label: shortName(data[0].row.product),
      data, showLine: true, tension: 0, borderWidth: 1.7,
      borderColor: color, backgroundColor: color,
      pointRadius: 4.5, pointHoverRadius: 7, pointHitRadius: 6,
      hidden: hiddenProducts.has(id),
    };
  });
  chart?.destroy();
  chart = null;
  const total = datasets.reduce((n, ds) => n + ds.data.length, 0);
  q("subChartSummary").textContent = `${total} 档 · ${datasets.length} 组产品曲线 · ${freeCount} 档免费/试用${includeFree ? "已纳入" : "默认不纳入"} · 同色为同产品，按月价连接`;
  q("chartUnitNote").textContent = unit
    ? `当前单位：${unit}。同名“积分 / Credits”在不同产品间也不等值，不代表统一购买力。`
    : "总览混合了积分、Credits、请求次数和额度倍数；纵轴数值不等值，不能据此判断跨产品性价比。建议先选额度单位，再比较同一产品的档位。";
  q("chartEmpty").hidden = total > 0;
  q("chartCanvasWrap").hidden = total === 0;
  q("chartLabelStatus").textContent = "";
  renderLegend(datasets);
  if (!total) return;
  const points = datasets.flatMap((ds) => ds.data);
  const styles = getComputedStyle(document.documentElement);
  const muted = styles.getPropertyValue("--muted").trim();
  const line = styles.getPropertyValue("--line").trim();
  chart = new Chart<"scatter", Point[]>(q<HTMLCanvasElement>("subChartCanvas"), {
    type: "scatter",
    data: { datasets },
    plugins: [labelsPlugin],
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      layout: { padding: { top: 24, right: 28, bottom: 8 } },
      interaction: { mode: "nearest", intersect: true },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const row = (items[0]?.raw as Point | undefined)?.row;
              return row ? wrapText(`${row.product} · ${row.tier}`) : "";
            },
            label: (item) => {
              const { row } = item.raw as Point;
              return [`月价：${row.priceText}`, `${METRICS[metric]}：${row[metric]?.toLocaleString()} ${row.quotaUnit ?? ""}`,
                `原始口径：${row.quotaText ?? "未披露"}`,
                `核实：${row.verified ?? "未标注"} · ${row.asOf ?? "未标注"}`].flatMap(wrapText);
            },
          },
        },
      },
      scales: {
        x: {
          type: "logarithmic",
          suggestedMin: Math.min(...points.map((p) => p.x)) / 1.4,
          suggestedMax: Math.max(...points.map((p) => p.x)) * 1.5,
          grid: { color: line },
          title: { display: true, color: muted, text: includeFree ? "月价 ¥ · 对数轴（免费按 0.4 占位）" : "月价 ¥ · 对数轴" },
          ticks: { color: muted, maxTicksLimit: 9, callback: (v) => Number(v) === 0.4 ? "免费" : `¥${Number(v).toLocaleString()}` },
        },
        y: {
          type: "logarithmic",
          suggestedMin: Math.min(...points.map((p) => p.y)) / 1.5,
          suggestedMax: Math.max(...points.map((p) => p.y)) * 1.6,
          grid: { color: line },
          title: { display: true, color: muted, text: `${METRICS[metric]}${unit ? ` · ${unit}` : " · 混合单位"}` },
          ticks: { color: muted, maxTicksLimit: 8, callback: (v) => Number(v).toLocaleString() },
        },
      },
    },
  });
}

function wrapText(text: string): string[] {
  const width = q("subChartCanvas").clientWidth;
  const limit = Math.max(12, Math.min(38, Math.floor((width - 36) / 12)));
  return text.match(new RegExp(`.{1,${limit}}`, "gu")) ?? [];
}

function renderLegend(datasets: PlanDataset[]): void {
  q("productLegend").innerHTML = datasets.map((ds) => `<button type="button" class="product-chip"
    data-product-id="${escapeAttr(ds.productId)}" aria-pressed="${!ds.hidden}"
    title="${escapeAttr(`${ds.data[0].row.product} · ${ds.data[0].row.quotaUnit}，点击显示/隐藏`)}">
    <span class="product-dot" style="background:${escapeAttr(String(ds.borderColor))}"></span>
    ${escapeHtml(ds.label)}<small>${ds.data.length}</small></button>`).join("");
}

q("productLegend").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-product-id]");
  if (!button || !chart) return;
  const id = button.dataset.productId!;
  if (hiddenProducts.has(id)) hiddenProducts.delete(id); else hiddenProducts.add(id);
  const index = chart.data.datasets.findIndex((ds) => (ds as PlanDataset).productId === id);
  chart.setDatasetVisibility(index, !hiddenProducts.has(id));
  button.setAttribute("aria-pressed", String(!hiddenProducts.has(id)));
  chart.update();
});
q("showAllProducts").addEventListener("click", () => {
  hiddenProducts.clear();
  renderChart();
});
q("mergeCoverageToggle").addEventListener("change", renderMatrix);
for (const id of ["quotaMetricSelect", "quotaUnitSelect", "includeFreeToggle"]) {
  q(id).addEventListener("change", renderChart);
}
q("chartLabelMode").addEventListener("change", (event) => {
  labelMode = (event.target as HTMLSelectElement).value;
  chart?.draw();
});
document.addEventListener("subscriptions:selection", (event) => {
  const detail = (event as CustomEvent<SubscriptionSelection>).detail;
  rows = detail.rows;
  const plottable = detail.allRows.filter((r) => typeof r.monthlyCny === "number" &&
    Object.keys(METRICS).some((metric) => (r[metric as Metric] ?? 0) > 0));
  [...new Set(plottable.map(productKey))].sort().forEach((key, index) => {
    productColors.set(key, COLORS[index % COLORS.length]);
  });
  renderMatrix();
  renderChart();
});
document.addEventListener("subscriptions:error", () => {
  const message = "订阅数据加载失败，请刷新页面重试。";
  q("matrixSummary").textContent = message;
  q("subChartSummary").textContent = message;
  q("chartCanvasWrap").hidden = true;
});
new MutationObserver(() => {
  if (!chart) return;
  const styles = getComputedStyle(document.documentElement);
  for (const axis of ["x", "y"]) {
    const scale = chart.options.scales?.[axis];
    if (!scale) continue;
    if (scale.ticks) scale.ticks.color = styles.getPropertyValue("--muted").trim();
    if (scale.title) scale.title.color = styles.getPropertyValue("--muted").trim();
    if (scale.grid) scale.grid.color = styles.getPropertyValue("--line").trim();
  }
  chart.update("none");
}).observe(document.documentElement, {
  attributes: true, attributeFilter: ["data-theme", "class"],
});
