let fieldDefs = [];
let vendorLinks = {};
let defaultVisibleColumns = new Set();
const sortCollator = new Intl.Collator("zh-Hans-CN", { numeric: true, sensitivity: "base" });

const state = {
  models: [],
  visibleColumns: new Set(fieldDefs.filter(f => f.visible).map(f => f.key)),
  sortField: "name",
  sortDirection: "asc",
  globalSearch: "",
  vendor: "all",
  modality: "all",
  verificationStatus: "all",
  rules: [],
  compact: false,
};

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  modalityFilter: document.querySelector("#modalityFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  vendorFilter: document.querySelector("#vendorFilter"),
  sortField: document.querySelector("#sortField"),
  sortDirectionButton: document.querySelector("#sortDirectionButton"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  addRuleButton: document.querySelector("#addRuleButton"),
  filterRules: document.querySelector("#filterRules"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  gpuTable: document.querySelector("#gpuTable"),
  compactToggleButton: document.querySelector("#compactToggleButton"),
  columnPicker: document.querySelector("#columnPicker"),
  toggleColumnsButton: document.querySelector("#toggleColumnsButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
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

    renderSelectOptions();
    renderColumnPicker();
    syncColumnPickerState();
    renderRules();
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

  elements.modalityFilter.addEventListener("change", () => {
    state.modality = elements.modalityFilter.value;
    render();
  });

  elements.statusFilter.addEventListener("change", () => {
    state.verificationStatus = elements.statusFilter.value;
    render();
  });

  elements.vendorFilter.addEventListener("change", () => {
    state.vendor = elements.vendorFilter.value;
    render();
  });

  elements.sortField.addEventListener("change", () => {
    state.sortField = elements.sortField.value;
    render();
  });

  elements.sortDirectionButton.addEventListener("click", () => {
    state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
    elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
    render();
  });

  elements.resetFiltersButton.addEventListener("click", () => {
    state.globalSearch = "";
    state.vendor = "all";
    state.modality = "all";
    state.verificationStatus = "all";
    state.rules = [];
    elements.globalSearch.value = "";
    elements.vendorFilter.value = "all";
    elements.modalityFilter.value = "all";
    elements.statusFilter.value = "all";
    renderRules();
    render();
  });

  elements.addRuleButton.addEventListener("click", () => {
    const defaultField = fieldDefs.find(field => field.type === "number" && field.visible)?.key || fieldDefs[0]?.key || "name";
    state.rules.push({ field: defaultField, op: ">=", value: "" });
    renderRules();
    render();
  });

  elements.compactToggleButton.addEventListener("click", () => {
    state.compact = !state.compact;
    elements.gpuTable.classList.toggle("compact", state.compact);
    elements.compactToggleButton.textContent = state.compact ? "标准模式" : "紧凑模式";
  });

  elements.toggleColumnsButton.addEventListener("click", () => {
    elements.columnPicker.hidden = !elements.columnPicker.hidden;
    syncColumnPickerState();
  });

  if (elements.exportCsvButton) {
    elements.exportCsvButton.addEventListener("click", exportCsv);
  }

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
  const allSelected = selectedCount === fieldDefs.length;
  elements.columnPicker.innerHTML = `
    <div class="column-picker-head">
      <div>
        <span class="column-picker-title">显示列</span>
        <span class="column-picker-meta">已选 ${selectedCount} / ${fieldDefs.length}</span>
      </div>
      <div class="column-picker-tools">
        <button class="ghost-button" type="button" data-column-action="select-all" ${allSelected ? "disabled" : ""}>全选</button>
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
  syncColumnPickerState();
}

function render() {
  const filtered = getFilteredRows();
  renderSummary(filtered);
  renderTable(filtered);
}

function getFilteredRows() {
  const sortFieldDef = fieldDefs.find(f => f.key === state.sortField);
  return state.models
    .filter(matchesGlobalSearch)
    .filter(model => state.vendor === "all" || model.vendor === state.vendor)
    .filter(model => state.modality === "all" || String(model.multimodal || "") === state.modality)
    .filter(model => state.verificationStatus === "all" || String(model.verification?.status || "unknown") === state.verificationStatus)
    .filter(matchesRules)
    .sort((a, b) => compareRows(a, b, state.sortField, state.sortDirection, sortFieldDef));
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc == null ? undefined : acc[part], obj);
}

function compareRows(a, b, sortField, sortDirection, fieldDef) {
  const va = getSortValue(getNestedValue(a, sortField), fieldDef);
  const vb = getSortValue(getNestedValue(b, sortField), fieldDef);
  const aMissing = va.missing;
  const bMissing = vb.missing;

  if (aMissing || bMissing) {
    if (aMissing !== bMissing) return aMissing ? 1 : -1;
    return compareTieBreakers(a, b);
  }

  const res = compareSortValues(va, vb);
  if (res !== 0) return sortDirection === "asc" ? res : -res;
  return compareTieBreakers(a, b);
}

function getSortValue(value, fieldDef) {
  if (value === null || value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value))) {
    return { missing: true, kind: "missing", value: null };
  }

  if (fieldDef?.type === "number") {
    const numeric = Number(value);
    return Number.isFinite(numeric)
      ? { missing: false, kind: "number", value: numeric }
      : { missing: false, kind: "text", value: String(value) };
  }

  if (fieldDef?.key === "contextWindow") {
    const tokens = String(value).trim().match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
    if (tokens) {
      const multiplier = { K: 1_000, M: 1_000_000, B: 1_000_000_000 }[tokens[2]?.toUpperCase()] || 1;
      return { missing: false, kind: "number", value: Number(tokens[1]) * multiplier };
    }
  }

  if (typeof value === "boolean") {
    return { missing: false, kind: "number", value: Number(value) };
  }

  if (typeof value === "number") {
    return { missing: false, kind: "number", value };
  }

  return { missing: false, kind: "text", value: String(value) };
}

function compareSortValues(a, b) {
  if (a.kind === "number" && b.kind === "number") {
    return a.value - b.value;
  }

  if (a.kind !== b.kind) {
    return a.kind === "number" ? -1 : 1;
  }

  return sortCollator.compare(String(a.value), String(b.value));
}

function compareTieBreakers(a, b) {
  return sortCollator.compare(String(a.name || a.id || ""), String(b.name || b.id || ""));
}

function renderSelectOptions() {
  fillSelect(elements.modalityFilter, ["all", ...uniqueValues("multimodal")], "全部模态");
  fillSelect(elements.statusFilter, ["all", ...uniqueVerificationStatuses()], "全部状态", verificationStatusLabel);
  fillSelect(elements.vendorFilter, ["all", ...uniqueValues("vendor")], "全部厂商");
  elements.sortField.innerHTML = fieldDefs
    .map(field => `<option value="${field.key}">${field.label}</option>`)
    .join("");
  elements.sortField.value = state.sortField;
  elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
}

function fillSelect(select, values, allLabel, labelFormatter = value => value) {
  select.innerHTML = values
    .map(value => `<option value="${escapeAttr(value)}">${value === "all" ? allLabel : labelFormatter(value)}</option>`)
    .join("");
}

function uniqueValues(key) {
  return [...new Set(state.models.map(model => getNestedValue(model, key)).filter(Boolean))]
    .sort((a, b) => sortCollator.compare(String(a), String(b)));
}

function uniqueVerificationStatuses() {
  return [...new Set(state.models.map(model => model.verification?.status || "unknown"))]
    .sort((a, b) => sortCollator.compare(verificationStatusLabel(a), verificationStatusLabel(b)));
}

function verificationStatusLabel(status) {
  const labels = {
    verified: "已核验",
    partial: "部分核验",
    generated: "生成/待核验",
    unverified: "未核验",
    unknown: "未知",
  };
  return labels[status] || status;
}

function matchesGlobalSearch(model) {
  if (!state.globalSearch) return true;
  return fieldDefs.some(field => String(getNestedValue(model, field.key) ?? "").toLowerCase().includes(state.globalSearch))
    || String(model.id || "").toLowerCase().includes(state.globalSearch)
    || String(model.verification?.status || "").toLowerCase().includes(state.globalSearch)
    || (model.verification?.sources || []).some(source => String(source.label || source.url || "").toLowerCase().includes(state.globalSearch));
}

function matchesRules(model) {
  return state.rules.every(rule => {
    const field = fieldDefs.find(item => item.key === rule.field);
    const actual = getNestedValue(model, rule.field);
    const expected = rule.value;
    if (!expected) return true;
    if (field?.type === "number") {
      const left = Number(actual);
      const right = Number(expected);
      if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
      if (rule.op === ">=") return left >= right;
      if (rule.op === "<=") return left <= right;
      if (rule.op === ">") return left > right;
      if (rule.op === "<") return left < right;
      if (rule.op === "=") return left === right;
      if (rule.op === "!=") return left !== right;
    }
    const left = String(actual ?? "").toLowerCase();
    const right = String(expected).toLowerCase();
    if (rule.op === "=") return left === right;
    if (rule.op === "!=") return left !== right;
    return left.includes(right);
  });
}

function renderRules() {
  elements.filterRules.innerHTML = state.rules
    .map((rule, index) => `
      <div class="rule">
        <div>
          <label>字段</label>
          <select data-rule-field="${index}">
            ${fieldDefs.map(field => `<option value="${field.key}" ${field.key === rule.field ? "selected" : ""}>${field.label}</option>`).join("")}
          </select>
        </div>
        <div>
          <label>条件</label>
          <select data-rule-op="${index}">
            ${operatorOptions(rule.op)}
          </select>
        </div>
        <div>
          <label>值</label>
          <input data-rule-value="${index}" value="${escapeAttr(rule.value)}" />
        </div>
        <button class="ghost-button" data-rule-remove="${index}" type="button" title="删除条件">×</button>
      </div>
    `)
    .join("");

  elements.filterRules.querySelectorAll("[data-rule-field]").forEach(select => {
    select.addEventListener("change", () => {
      state.rules[Number(select.dataset.ruleField)].field = select.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-op]").forEach(select => {
    select.addEventListener("change", () => {
      state.rules[Number(select.dataset.ruleOp)].op = select.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-value]").forEach(input => {
    input.addEventListener("input", () => {
      state.rules[Number(input.dataset.ruleValue)].value = input.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-remove]").forEach(button => {
    button.addEventListener("click", () => {
      state.rules.splice(Number(button.dataset.ruleRemove), 1);
      renderRules();
      render();
    });
  });
}

function operatorOptions(selected) {
  const ops = ["contains", "=", "!=", ">=", "<=", ">", "<"];
  const labels = {
    contains: "包含",
    "=": "等于",
    "!=": "不等于",
    ">=": "大于等于",
    "<=": "小于等于",
    ">": "大于",
    "<": "小于",
  };
  return ops.map(op => `<option value="${op}" ${op === selected ? "selected" : ""}>${labels[op]}</option>`).join("");
}

function syncColumnPickerState() {
  const selectedCount = state.visibleColumns.size;
  const hiddenCount = Math.max(0, fieldDefs.length - selectedCount);
  const expanded = !elements.columnPicker.hidden;
  elements.toggleColumnsButton.setAttribute("aria-expanded", String(expanded));
  elements.toggleColumnsButton.textContent = `列设置 (已选 ${selectedCount} / 未选 ${hiddenCount})`;
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
      const values = rows.map(m => getNestedValue(m, f.key)).filter(v => typeof v === 'number');
      stats[f.key] = values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
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
      elements.sortField.value = state.sortField;
      elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
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

  if (field.heatmap && stat && typeof val === "number") {
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

function exportCsv() {
  const activeFields = fieldDefs.filter(f => state.visibleColumns.has(f.key));
  const rows = getFilteredRows();

  const escape = v => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const header = activeFields.map(f => escape(f.label)).join(",");
  const body = rows.map(r =>
    activeFields.map(f => escape(getNestedValue(r, f.key))).join(",")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `llm-models-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

init();
