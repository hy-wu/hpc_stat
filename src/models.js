const fieldDefs = [
  { key: "name", label: "模型名称", type: "text", visible: true },
  { key: "vendor", label: "厂商", type: "text", visible: true },
  { key: "multimodal", label: "多模态", type: "text", visible: true },
  { key: "copilotMultiplier", label: "Copilot 倍率", type: "number", visible: true },
  { key: "performance", label: "性能定位", type: "text", visible: true },
  { key: "arenaElo", label: "Arena Elo", type: "number", visible: true, heatmap: true },
  { key: "mmlu", label: "MMLU", type: "number", visible: true, heatmap: true },
  { key: "humanEval", label: "HumanEval", type: "number", visible: true, heatmap: true },
  { key: "gsm8k", label: "GSM8K", type: "number", visible: true, heatmap: true },
  { key: "gpqa", label: "GPQA", type: "number", visible: true, heatmap: true },
  { key: "math", label: "MATH", type: "number", visible: true, heatmap: true },
  { key: "contextWindow", label: "上下文", type: "text", visible: true },
  // Copilot
  { key: "pricing.copilot.in", label: "Copilot In", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.copilot.out", label: "Copilot Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // Official
  { key: "pricing.official.in", label: "官方 In", type: "number", visible: true, heatmap: true, inverseHeatmap: true, source: "https://openai.com/api/pricing" },
  { key: "pricing.official.hit", label: "官方 In(Hit)", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.official.out", label: "官方 Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // Cursor
  { key: "pricing.cursor.in", label: "Cursor In", type: "number", visible: true, heatmap: true, inverseHeatmap: true, source: "https://cursor.com/cn/docs/models-and-pricing" },
  { key: "pricing.cursor.out", label: "Cursor Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // DeepSeek Official
  { key: "pricing.deepseek_official.in", label: "DeepSeek In", type: "number", visible: true, heatmap: true, inverseHeatmap: true, source: "https://api-docs.deepseek.com/quick_start/pricing" },
  { key: "pricing.deepseek_official.hit", label: "DeepSeek In(Hit)", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.deepseek_official.out", label: "DeepSeek Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // SiliconFlow
  { key: "pricing.siliconflow.in", label: "硅基流动 In", type: "number", visible: true, heatmap: true, inverseHeatmap: true, source: "https://siliconflow.cn/pricing" },
  { key: "pricing.siliconflow.hit", label: "硅基流动 In(Hit)", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "pricing.siliconflow.out", label: "硅基流动 Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // OpenRouter
  { key: "pricing.openrouter.in", label: "OpenRouter In", type: "number", visible: true, heatmap: true, inverseHeatmap: true, source: "https://openrouter.ai/models" },
  { key: "pricing.openrouter.out", label: "OpenRouter Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  // Nvidia
  { key: "pricing.nvidia.in", label: "Nvidia In", type: "number", visible: true, heatmap: true, inverseHeatmap: true, source: "https://www.nvidia.com/en-us/ai-data-science/generative-ai/nim/" },
  { key: "pricing.nvidia.out", label: "Nvidia Out", type: "number", visible: true, heatmap: true, inverseHeatmap: true },
  { key: "notes", label: "备注", type: "text", visible: false },
];

const state = {
  models: [],
  visibleColumns: new Set(fieldDefs.filter(f => f.key !== 'notes').map(f => f.key)),
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
  columnPicker: document.querySelector("#columnPicker"),
  toggleColumnsButton: document.querySelector("#toggleColumnsButton"),
  visibleCount: document.querySelector("#visibleCount"),
  bestElo: document.querySelector("#bestElo"),
  bestHumanEval: document.querySelector("#bestHumanEval"),
};

const defaultVisibleColumns = new Set(fieldDefs.filter(f => f.key !== 'notes').map(f => f.key));

async function init() {
  try {
    const response = await fetch("data/models.json");
    state.models = await response.json();
    renderColumnPicker();
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

  elements.toggleColumnsButton.addEventListener("click", () => {
    elements.columnPicker.hidden = !elements.columnPicker.hidden;
  });

  elements.columnPicker.addEventListener("click", (e) => {
    const action = e.target.closest("[data-column-action]")?.dataset.columnAction;
    if (!action) return;
    if (action === "select-all") state.visibleColumns = new Set(fieldDefs.map(f => f.key));
    if (action === "reset-default") state.visibleColumns = new Set(defaultVisibleColumns);
    renderColumnPicker();
    render();
  });

  elements.columnPicker.addEventListener("change", (e) => {
    if (e.target.type !== 'checkbox') return;
    const key = e.target.value;
    if (e.target.checked) state.visibleColumns.add(key);
    else state.visibleColumns.delete(key);
    renderColumnPicker();
    render();
  });
}

function renderColumnPicker() {
  const selectedCount = state.visibleColumns.size;
  elements.columnPicker.innerHTML = `
    <div class="column-picker-head">
      <div>
        <p class="column-picker-title">显示列</p>
        <p class="column-picker-meta">已选 ${selectedCount} / ${fieldDefs.length}</p>
      </div>
      <div class="column-picker-tools">
        <button class="ghost-button" type="button" data-column-action="select-all">全选</button>
        <button class="text-button" type="button" data-column-action="reset-default">恢复默认</button>
      </div>
    </div>
    <div class="column-picker-grid">
      ${fieldDefs.map(f => `
        <label class="column-option">
          <input type="checkbox" value="${f.key}" ${state.visibleColumns.has(f.key) ? 'checked' : ''}>
          <span>${f.label}</span>
        </label>
      `).join('')}
    </div>
  `;
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
      stats[f.key] = { min: Math.min(...values), max: Math.max(...values) };
    }
  });

  const activeFields = fieldDefs.filter(f => state.visibleColumns.has(f.key));

  elements.tableHead.innerHTML = `<tr>${activeFields
    .map(f => `<th>
      <button data-sort="${f.key}">${f.label}${state.sortField === f.key ? (state.sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}</button>
      ${f.source ? `<a href="${f.source}" target="_blank" class="source-icon" title="查看价格来源">🔗</a>` : ''}
    </th>`)
    .join("")}</tr>`;

  elements.tableBody.innerHTML = rows
    .map(r => `<tr>${activeFields
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
    let colorPercent = lengthPercent;
    if (field.inverseHeatmap) colorPercent = 100 - lengthPercent; 
    const color = getHeatmapColor(colorPercent);
    return `
      <div class="heatmap-container mini">
        <div class="heatmap-bar" style="width: ${lengthPercent}%; background: ${color}"></div>
        <span class="heatmap-value">${typeof val === 'number' && field.key.includes('pricing') ? val.toFixed(3) : val}</span>
      </div>
    `;
  }

  if (field.key === "multimodal") return `<span class="tag multimodal">${val}</span>`;
  if (field.key === "copilotMultiplier") return val === null ? "-" : (val === 0 ? "Free" : `${val}x`);

  return val;
}

function getHeatmapColor(percent) {
  if (percent < 50) return `rgba(255, ${Math.floor(255 * (percent / 50))}, 0, 0.2)`;
  return `rgba(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.2)`;
}

init();
