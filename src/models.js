const fieldDefs = [
  { key: "name", label: "模型名称", type: "text", visible: true },
  { key: "vendor", label: "厂商", type: "text", visible: true },
  { key: "multimodal", label: "多模态", type: "text", visible: true },
  { key: "performance", label: "性能定位", type: "text", visible: true },
  { key: "multiplier", label: "价格倍率", type: "number", visible: true },
  { key: "arenaElo", label: "Arena Elo", type: "number", visible: true, heatmap: true },
  { key: "mmlu", label: "MMLU", type: "number", visible: true, heatmap: true },
  { key: "humanEval", label: "HumanEval", type: "number", visible: true, heatmap: true },
  { key: "contextWindow", label: "上下文", type: "text", visible: true },
  { key: "officialPrice", label: "官方 API ($/1M)", type: "object", visible: true, priceGrid: true },
  { key: "otherPlatforms", label: "第三方平台价格", type: "array", visible: true, platformGrid: true },
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
    if (f.heatmap) {
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
      <div class="heatmap-container mini">
        <div class="heatmap-bar" style="width: ${percent}%; background: ${color}"></div>
        <span class="heatmap-value">${val}</span>
      </div>
    `;
  }

  if (field.priceGrid) {
    return `
      <div class="price-grid">
        <span class="p-in">In: $${val.in}</span>
        <span class="p-out">Out: $${val.out}</span>
      </div>
    `;
  }

  if (field.platformGrid && Array.isArray(val)) {
    return `
      <div class="platform-stack">
        ${val.map(p => `
          <div class="p-item">
            <span class="p-name">${p.name}</span>
            <span class="p-price">$${p.in}/$${p.out}</span>
          </div>
        `).join('')}
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
    return `rgba(255, ${Math.floor(255 * (percent / 50))}, 0, 0.15)`;
  } else {
    return `rgba(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.15)`;
  }
}

init();
