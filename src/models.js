const fieldDefs = [
  { key: "name", label: "模型名称", type: "text", visible: true },
  { key: "vendor", label: "厂商", type: "text", visible: true },
  { key: "multimodal", label: "多模态", type: "text", visible: true },
  { key: "performance", label: "性能定位", type: "text", visible: true },
  { key: "arenaElo", label: "Arena Elo", type: "number", visible: true, heatmap: true },
  { key: "mmlu", label: "MMLU", type: "number", visible: true, heatmap: true },
  { key: "humanEval", label: "HumanEval", type: "number", visible: true, heatmap: true },
  { key: "gsm8k", label: "GSM8K", type: "number", visible: true, heatmap: true },
  { key: "gpqa", label: "GPQA", type: "number", visible: true, heatmap: true },
  { key: "math", label: "MATH", type: "number", visible: true, heatmap: true },
  { key: "contextWindow", label: "上下文", type: "text", visible: true },
  // Copilot Pricing
  { key: "pricing.copilot.in", label: "Copilot In ($/1M)", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.copilot.out", label: "Copilot Out ($/1M)", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // Official API
  { key: "pricing.official.in", label: "官方 In ($/1M)", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.official.out", label: "官方 Out ($/1M)", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // Domestic Platform (SiliconFlow / DeepSeek)
  { key: "pricing.domestic.in", label: "国内平台 In", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.domestic.out", label: "国内平台 Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // Relay / Relay Aggregators
  { key: "pricing.relay.in", label: "中转平台 In", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.relay.out", label: "中转平台 Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // OpenRouter
  { key: "pricing.openrouter.in", label: "OpenRouter In", type: "number", visible: false, heatmap: true, inverseHeatmap: true },
  { key: "pricing.openrouter.out", label: "OpenRouter Out", type: "number", visible: false, heatmap: true, inverseHeatmap: true },
  // Nvidia
  { key: "pricing.nvidia.in", label: "Nvidia In", type: "number", visible: false, heatmap: true, inverseHeatmap: true },
  { key: "pricing.nvidia.out", label: "Nvidia Out", type: "number", visible: false, heatmap: true, inverseHeatmap: true },
];

const state = {
  models: [],
  visibleColumns: new Set(fieldDefs.filter(f => f.visible).map((f) => f.key)),
  sortField: "arenaElo",
  sortDirection: "desc",
  globalSearch: "",
  compact: false,
};

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  gpuTable: document.querySelector("#gpuTable"),
  compactToggleButton: document.querySelector("#compactToggleButton"),
  visibleCount: document.querySelector("#visibleCount"),
  bestElo: document.querySelector("#bestElo"),
  bestHumanEval: document.querySelector("#bestHumanEval"),
};

async function init() {
  try {
    const response = await fetch("data/models.json");
    state.models = await response.json();
    bindEvents();
    render();
  } catch (err) {
    console.error("Failed to load models:", err);
  }
}

function bindEvents() {
  elements.globalSearch.addEventListener("input", () => {
    state.globalSearch = elements.globalSearch.value.trim().toLowerCase();
    render();
  });

  elements.compactToggleButton.addEventListener("click", () => {
    state.compact = !state.compact;
    elements.gpuTable.classList.toggle("compact", state.compact);
    elements.compactToggleButton.textContent = state.compact ? "标准模式" : "紧凑模式";
  });
}

function render() {
  const filtered = state.models
    .filter(m => 
      !state.globalSearch || 
      Object.values(m).some(v => String(v).toLowerCase().includes(state.globalSearch))
    )
    .sort((a, b) => {
      const va = getNestedValue(a, state.sortField);
      const vb = getNestedValue(b, state.sortField);
      const res = (va < vb ? -1 : va > vb ? 1 : 0);
      return state.sortDirection === "asc" ? res : -res;
    });

  renderSummary(filtered);
  renderTable(filtered);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function renderSummary(rows) {
  if (elements.visibleCount) elements.visibleCount.textContent = rows.length;
  if (elements.bestElo) {
    const maxVal = Math.max(...rows.map(r => r.arenaElo || 0));
    elements.bestElo.textContent = maxVal > 0 ? maxVal : "-";
  }
  if (elements.bestHumanEval) {
    const maxVal = Math.max(...rows.map(r => r.humanEval || 0));
    elements.bestHumanEval.textContent = maxVal > 0 ? `${maxVal}%` : "-";
  }
}

function renderTable(rows) {
  const stats = {};
  fieldDefs.forEach(f => {
    if (f.heatmap) {
      const values = state.models.map(m => getNestedValue(m, f.key)).filter(v => typeof v === 'number');
      stats[f.key] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }
  });

  elements.tableHead.innerHTML = `<tr>${fieldDefs
    .filter(f => state.visibleColumns.has(f.key))
    .map(f => `<th><button data-sort="${f.key}">${f.label}${state.sortField === f.key ? (state.sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>`)
    .join("")}</tr>`;

  elements.tableBody.innerHTML = rows
    .map(r => `<tr>${fieldDefs
      .filter(f => state.visibleColumns.has(f.key))
      .map(f => `<td>${formatCell(r, f, stats[f.key])}</td>`)
      .join("")}</tr>`)
    .join("");

  elements.tableHead.querySelectorAll("[data-sort]").forEach(btn => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.sort;
      if (state.sortField === field) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = field;
        state.sortDirection = "desc";
      }
      render();
    });
  });
}

function formatCell(row, field, stat) {
  const val = getNestedValue(row, field.key);
  if (val === null || val === undefined) return "-";

  if (field.heatmap && typeof val === "number") {
    const lengthPercent = (val - stat.min) / (stat.max - stat.min || 1) * 100;
    // For benchmarks: High = Green (100). For price: High = Red (0).
    let colorPercent = lengthPercent;
    if (field.inverseHeatmap) colorPercent = 100 - lengthPercent; 
    
    const color = getHeatmapColor(colorPercent);
    return `
      <div class="heatmap-container mini">
        <div class="heatmap-bar" style="width: ${lengthPercent}%; background: ${color}"></div>
        <span class="heatmap-value">${typeof val === 'number' && field.key.includes('pricing') ? val.toFixed(2) : val}</span>
      </div>
    `;
  }

  if (field.key === "multimodal") {
    return `<span class="tag multimodal">${val}</span>`;
  }

  return val;
}

function getHeatmapColor(percent) {
  if (percent < 50) {
    return `rgba(255, ${Math.floor(255 * (percent / 50))}, 0, 0.2)`;
  } else {
    return `rgba(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.2)`;
  }
}

init();
