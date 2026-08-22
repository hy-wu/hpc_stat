/**
 * Client-side island: dense cost/performance scatter plots with Pareto frontiers.
 */

import { Chart, registerables } from "chart.js";
import { getNestedValue } from "../lib/format";
import {
  loadModelToolChartData,
  loadModelHardwareChartData,
  type AxisField,
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
  xField: string;
  yField: string;
  colorField: string;
  chart: Chart | null;
  searchTerm: string;
  colorFilter: string;
  labelMode: "auto" | "all" | "off";
  renderedLabels: string[][];
  reference: ReferenceLayer;
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
  xField: "costPerTaskUSD",
  yField: "codingAgentScore",
  colorField: "modelVendor",
  chart: null,
  searchTerm: "",
  colorFilter: "",
  labelMode: "auto",
  renderedLabels: [],
  reference: { visible: false, xCut: null, yCut: null, paretoCount: 0 },
};

const COLORS = [
  "#111827", "#d46a3d", "#7463d1", "#1677f2", "#1592e6", "#34a853",
  "#2f55d4", "#6b7280", "#b56320", "#007b8a", "#a13e6b", "#4b7b39",
];

function getColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
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

function buildPlotData(points: ChartPoint[], xField: AxisField | undefined, yField: AxisField | undefined): PlotDatum[] {
  const xLog = xField?.scale === "logarithmic";
  const yLog = yField?.scale === "logarithmic";
  const plotted: PlotDatum[] = [];
  for (const p of points) {
    const x = getPointNum(p, state.xField);
    const y = getPointNum(p, state.yField);
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

Chart.register(...registerables, referenceLayerPlugin, pointLabelsPlugin);

function renderChart() {
  const canvas = q<HTMLCanvasElement>("chartCanvas");
  if (!canvas) return;

  const theme = getThemeColors();
  const { xField, yField, colorField, points, searchTerm, colorFilter } = state;
  const xFieldDef = getAxisField(xField);
  const yFieldDef = getAxisField(yField);

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

  const plotted = buildPlotData(filtered, xFieldDef, yFieldDef);
  const referenceVisible = isReferencePlot(xFieldDef, yFieldDef) && plotted.length >= 3;
  const pareto = referenceVisible ? computeParetoFrontier(plotted) : [];
  const paretoIds = new Set(pareto.map((d) => d.id));
  const labelIds = chooseLabelIds(plotted, pareto);
  const xCut = referenceVisible ? quantile(plotted.map((d) => d.x), 0.45) : null;
  const yCut = referenceVisible ? quantile(plotted.map((d) => d.y), 0.65) : null;
  state.reference = { visible: referenceVisible, xCut, yCut, paretoCount: pareto.length };

  const plottedById = new Map(plotted.map((d) => [d.id, d]));
  const groups = new Map<string, ChartPoint[]>();
  for (const datum of plotted) {
    const key = String(getNestedValue(datum.point.raw, colorField) ?? "其他");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(datum.point);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  const tooltipMap = new Map<number, TooltipMeta[]>();
  state.renderedLabels = [];

  const chartDatasets = sortedGroups.map(([name, group], groupIndex) => {
    const color = getColor(name);
    state.renderedLabels[groupIndex] = group.map((p) => {
      if (state.labelMode === "off") return "";
      return labelIds.has(p.id) ? getPointPlotLabel(p) : "";
    });

    const metas: TooltipMeta[] = [];
    const data = group.map((p) => {
      const datum = plottedById.get(p.id)!;
      metas.push({
        label: getPointLabel(p),
        xVal: `${axisLabel(xFieldDef, xField)}: ${formatAxisValue(datum.x, xFieldDef)}`,
        yVal: `${axisLabel(yFieldDef, yField)}: ${formatAxisValue(datum.y, yFieldDef)}`,
        extras: buildTooltipExtras(p),
      });
      return { x: datum.x, y: datum.y };
    });
    tooltipMap.set(groupIndex, metas);

    return {
      label: name,
      data,
      backgroundColor: color + (state.dataType === "model-tools" ? "c7" : "a6"),
      borderColor: color,
      pointRadius: group.map((p) => paretoIds.has(p.id) ? 5.2 : 4),
      pointHoverRadius: 7,
      borderWidth: group.map((p) => paretoIds.has(p.id) ? 1.8 : 1),
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
        legend: {
          position: "top",
          labels: {
            color: theme.text,
            padding: 10,
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            font: { size: 11, weight: 600 },
            filter: (legendItem, data) => {
              const dataset = data.datasets[legendItem.datasetIndex ?? -1];
              if (dataset?.label === PARETO_LABEL) return true;
              return (legendItem.datasetIndex ?? Number.MAX_SAFE_INTEGER) < 14;
            },
          },
        },
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
            text: axisLabel(xFieldDef, xField),
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
            text: axisLabel(yFieldDef, yField),
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

  updateSummary(plotted.length, filtered.length, sortedGroups.length, state.reference);
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
  el.textContent = `数据点 ${totalPoints}/${filteredPoints}${missingText} · 分组 ${totalGroups}${legendText}${refText}`;
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
    state.xField = resetX;
    state.yField = resetY;
    state.colorField = "modelVendor";
    state.labelMode = "auto";
    state.searchTerm = "";
    state.colorFilter = "";

    if (xSel) xSel.value = resetX;
    if (ySel) ySel.value = resetY;
    if (colorSel) colorSel.value = "modelVendor";
    if (labelSel) labelSel.value = "auto";
    if (searchInput) searchInput.value = "";

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
      const { points, axisFields } = await loadModelToolChartData();
      state.points = points;
      state.axisFields = axisFields;
      state.xField = "costPerTaskUSD";
      state.yField = "codingAgentScore";
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
  populateFilterSelect("colorFilterSelect");

  bindEvents();
  renderChart();
}

document.addEventListener("DOMContentLoaded", init);
if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
}
