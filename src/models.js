let fieldDefs = [];
let vendorLinks = {};
let defaultVisibleColumns = new Set();

const state = {
  models: [],
  visibleColumns: new Set(fieldDefs.filter(f => f.visible).map(f => f.key)),
  sortField: "name",
  sortDirection: "asc",
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

async function init() {
  try {
    const [modelsResponse, fieldsResponse] = await Promise.all([
      fetch("data/models.json"),
      fetch("data/model-fields.json"),
    ]);
    const rawData = await modelsResponse.json();
    const fieldConfig = await fieldsResponse.json();
    fieldDefs = fieldConfig.fields || [];
    vendorLinks = fieldConfig.vendorLinks || {};
    defaultVisibleColumns = new Set(fieldDefs.filter(f => f.visible).map(f => f.key));
    state.visibleColumns = new Set(defaultVisibleColumns);

    state.models = rawData.map(m => {
      const model = {...m};
      if (model.pricing?.deepseek_official) {
        model.pricing.official = model.pricing.deepseek_official;
      }
      if (!model.pricing) model.pricing = {};
      return model;
    });

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
    const verifiedCount = rows.filter(r => r.verification?.status === "verified").length;
    elements.bestElo.textContent = `${verifiedCount}/${rows.length}`;
  }
  if (elements.bestHumanEval) {
    const priceCount = rows.filter(r => getNestedValue(r, "pricing.official.in") && getNestedValue(r, "pricing.official.out")).length;
    elements.bestHumanEval.textContent = `${priceCount}/${rows.length}`;
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
      ${f.source ? `<a href="${f.source}" target="_blank" class="source-icon" title="查看平台定价">🔗</a>` : ''}
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
  const verified = isVerifiedField(row, field.key);
  const sourceTitle = getSourceTitle(row);
  const className = verified ? "verified-cell" : "unverified-cell";
  if (val === null || val === undefined) {
    return `<span class="unverified-cell" title="未核验或暂无数据">-</span>`;
  }

  if (field.key === "vendor") {
    const link = vendorLinks[val];
    return link
      ? `<a href="${link}" target="_blank" class="vendor-link ${className}" title="${sourceTitle || "前往官网定价"}">${val}</a>`
      : `<span class="${className}" title="${sourceTitle}">${val}</span>`;
  }

  if (field.heatmap && typeof val === "number") {
    const lengthPercent = (val - stat.min) / (stat.max - stat.min || 1) * 100;
    let colorPercent = lengthPercent;
    if (field.inverseHeatmap) colorPercent = 100 - lengthPercent; 
    const color = getHeatmapColor(colorPercent);
    return `
      <div class="heatmap-container mini ${className}" title="${verified ? sourceTitle : "未核验"}">
        <div class="heatmap-bar" style="width: ${lengthPercent}%; background: ${color}"></div>
        <span class="heatmap-value">${typeof val === 'number' && field.key.includes('pricing') ? val.toFixed(3) : val}</span>
      </div>
    `;
  }

  if (field.key === "multimodal") return `<span class="tag multimodal ${className}" title="${sourceTitle}">${val}</span>`;
  if (field.key === "copilotMultiplier") return val === null ? "-" : `<span class="${className}" title="${sourceTitle}">${val}x</span>`;

  return `<span class="${className}" title="${verified ? sourceTitle : "未核验"}">${val}</span>`;
}

function isVerifiedField(row, key) {
  const fields = row.verification?.verifiedFields;
  return Array.isArray(fields) && fields.includes(key);
}

function getSourceTitle(row) {
  const sources = row.verification?.sources;
  if (!Array.isArray(sources) || sources.length === 0) return "";
  return sources.map(source => source.label).join(" / ");
}

function getHeatmapColor(percent) {
  if (percent < 50) return `rgba(255, ${Math.floor(255 * (percent / 50))}, 0, 0.2)`;
  return `rgba(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.2)`;
}

init();
