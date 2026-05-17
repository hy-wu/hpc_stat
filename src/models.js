const fieldDefs = [
  { key: "name", label: "模型名称", type: "text", visible: true },
  { key: "vendor", label: "厂商", type: "text", visible: true },
  { key: "performance", label: "性能定位", type: "text", visible: true },
  { key: "multiplier", label: "价格倍率", type: "number", visible: true },
  { key: "arenaElo", label: "Arena Elo", type: "number", visible: true, heatmap: true },
  { key: "mmlu", label: "MMLU", type: "number", visible: true, heatmap: true },
  { key: "humanEval", label: "HumanEval", type: "number", visible: true, heatmap: true },
  { key: "gsm8k", label: "GSM8K", type: "number", visible: true, heatmap: true },
  { key: "gpqa", label: "GPQA", type: "number", visible: true, heatmap: true },
  { key: "math", label: "MATH", type: "number", visible: true, heatmap: true },
  { key: "contextWindow", label: "上下文", type: "text", visible: true },
  { key: "inputPrice", label: "输入 $/1M", type: "number", visible: true, priceBar: true },
  { key: "outputPrice", label: "输出 $/1M", type: "number", visible: true, priceBar: true },
];

const state = {
  models: [],
  visibleColumns: new Set(fieldDefs.map((f) => f.key)),
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
      const va = a[state.sortField];
      const vb = b[state.sortField];
      const res = (va < vb ? -1 : va > vb ? 1 : 0);
      return state.sortDirection === "asc" ? res : -res;
    });

  renderSummary(filtered);
  renderTable(filtered);
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
  const maxValues = {};
  fieldDefs.forEach(f => {
    if (f.heatmap || f.priceBar) {
      maxValues[f.key] = Math.max(...state.models.map(m => m[f.key] || 0));
    }
  });

  elements.tableHead.innerHTML = `<tr>${fieldDefs
    .filter(f => state.visibleColumns.has(f.key))
    .map(f => `<th><button data-sort="${f.key}">${f.label}${state.sortField === f.key ? (state.sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button></th>`)
    .join("")}</tr>`;

  elements.tableBody.innerHTML = rows
    .map(r => `<tr>${fieldDefs
      .filter(f => state.visibleColumns.has(f.key))
      .map(f => `<td>${formatCell(r, f, maxValues[f.key])}</td>`)
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

function formatCell(row, field, maxVal) {
  const val = row[field.key];
  if (val === null || val === undefined) return "-";

  if (field.heatmap && typeof val === "number") {
    const percent = Math.min(100, (val / maxVal) * 100);
    const color = getHeatmapColor(percent);
    return `
      <div class="heatmap-container">
        <div class="heatmap-bar" style="width: ${percent}%; background: ${color}"></div>
        <span class="heatmap-value">${val}</span>
      </div>
    `;
  }

  if (field.priceBar && typeof val === "number") {
    const percent = maxVal > 0 ? Math.min(100, (val / maxVal) * 100) : 0;
    // For price, lower is usually "better" (green), but here we just show scale
    return `
      <div class="price-bar-container">
        <div class="price-bar" style="width: ${percent}%; background: var(--accent)"></div>
        <span class="price-value">$${val.toFixed(2)}</span>
      </div>
    `;
  }

  if (field.type === "number" && typeof val === "number") {
    return val.toLocaleString();
  }
  return val;
}

function getHeatmapColor(percent) {
  // 0% = Red, 50% = Yellow, 100% = Green
  if (percent < 50) {
    return `rgb(255, ${Math.floor(255 * (percent / 50))}, 0, 0.2)`;
  } else {
    return `rgb(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.2)`;
  }
}

init();
