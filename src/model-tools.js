const sortCollator = new Intl.Collator("zh-Hans-CN", { numeric: true, sensitivity: "base" });

const ruleFields = [
  { key: "modelName", label: "模型", type: "text" },
  { key: "toolName", label: "工具", type: "text" },
  { key: "modelVendor", label: "模型厂商", type: "text" },
  { key: "supportStatus", label: "接入状态", type: "text" },
  { key: "routeTags", label: "接入方式", type: "text" },
  { key: "capabilityTags", label: "适用能力", type: "text" },
  { key: "codingFit", label: "代码适配", type: "number" },
  { key: "agentFit", label: "Agent 适配", type: "number" },
  { key: "contextFit", label: "长上下文", type: "number" },
  { key: "priceMeter", label: "价格/消耗口径", type: "text" },
  { key: "planRequirement", label: "套餐要求", type: "text" },
  { key: "notes", label: "评价", type: "text" },
];

const sortOptions = [
  { key: "coverage", label: "覆盖工具数" },
  { key: "avgAgentFit", label: "平均 Agent 适配" },
  { key: "avgCodingFit", label: "平均代码适配" },
  { key: "avgContextFit", label: "平均长上下文" },
  { key: "modelName", label: "模型名称" },
  { key: "modelVendor", label: "模型厂商" },
];

const state = {
  records: [],
  toolNames: [],
  visibleTools: new Set(),
  sortField: "coverage",
  sortDirection: "desc",
  globalSearch: "",
  tool: "all",
  modelVendor: "all",
  supportStatus: "all",
  route: "all",
  rules: [],
  compact: false,
};

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  toolFilter: document.querySelector("#toolFilter"),
  modelVendorFilter: document.querySelector("#modelVendorFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  routeFilter: document.querySelector("#routeFilter"),
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
  nativeCount: document.querySelector("#nativeCount"),
  byokCount: document.querySelector("#byokCount"),
  avgAgentFit: document.querySelector("#avgAgentFit"),
};

async function init() {
  try {
    const response = await fetch("data/model-tools.json");
    state.records = await response.json();
    state.toolNames = uniqueRecordValues("toolName");
    state.visibleTools = new Set(state.toolNames);

    renderSelectOptions();
    renderColumnPicker();
    syncColumnPickerState();
    renderRules();
    bindEvents();
    render();
  } catch (err) {
    console.error("Failed to load model-tool matrix:", err);
  }
}

function bindEvents() {
  elements.globalSearch.addEventListener("input", () => {
    state.globalSearch = elements.globalSearch.value.trim().toLowerCase();
    render();
  });

  elements.toolFilter.addEventListener("change", () => {
    state.tool = elements.toolFilter.value;
    render();
  });

  elements.modelVendorFilter.addEventListener("change", () => {
    state.modelVendor = elements.modelVendorFilter.value;
    render();
  });

  elements.statusFilter.addEventListener("change", () => {
    state.supportStatus = elements.statusFilter.value;
    render();
  });

  elements.routeFilter.addEventListener("change", () => {
    state.route = elements.routeFilter.value;
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
    state.tool = "all";
    state.modelVendor = "all";
    state.supportStatus = "all";
    state.route = "all";
    state.rules = [];
    elements.globalSearch.value = "";
    elements.toolFilter.value = "all";
    elements.modelVendorFilter.value = "all";
    elements.statusFilter.value = "all";
    elements.routeFilter.value = "all";
    renderRules();
    render();
  });

  elements.addRuleButton.addEventListener("click", () => {
    state.rules.push({ field: "agentFit", op: ">=", value: "" });
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

  elements.exportCsvButton.addEventListener("click", exportCsv);

  elements.columnPicker.addEventListener("click", (e) => {
    const action = e.target.closest("[data-column-action]")?.dataset.columnAction;
    if (!action) return;
    if (action === "select-all") state.visibleTools = new Set(state.toolNames);
    if (action === "reset-default") state.visibleTools = new Set(state.toolNames);
    renderColumnPicker();
    render();
  });

  elements.columnPicker.addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    if (e.target.checked) state.visibleTools.add(e.target.value);
    else state.visibleTools.delete(e.target.value);
    renderColumnPicker();
    render();
  });
}

function render() {
  const records = getFilteredRecords();
  const tools = getVisibleTools();
  const matrixRows = buildMatrixRows(records, tools);
  renderSummary(records, matrixRows, tools);
  renderTable(matrixRows, tools);
}

function getFilteredRecords() {
  return state.records
    .filter(matchesGlobalSearch)
    .filter(record => state.tool === "all" || record.toolName === state.tool)
    .filter(record => state.modelVendor === "all" || record.modelVendor === state.modelVendor)
    .filter(record => state.supportStatus === "all" || record.supportStatus === state.supportStatus)
    .filter(record => matchesArrayFilter(record.routeTags, state.route))
    .filter(matchesRules);
}

function getVisibleTools() {
  if (state.tool !== "all") return [state.tool];
  return state.toolNames.filter(toolName => state.visibleTools.has(toolName));
}

function buildMatrixRows(records, tools) {
  const visibleToolSet = new Set(tools);
  const rowMap = new Map();

  records
    .filter(record => visibleToolSet.has(record.toolName))
    .forEach(record => {
      const key = record.modelId || record.modelName;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          modelId: record.modelId,
          modelName: record.modelName,
          modelVendor: record.modelVendor,
          cells: new Map(),
        });
      }
      rowMap.get(key).cells.set(record.toolName, record);
    });

  return [...rowMap.values()]
    .map(row => {
      const cells = [...row.cells.values()];
      return {
        ...row,
        coverage: cells.length,
        avgCodingFit: average(cells.map(cell => cell.codingFit)),
        avgAgentFit: average(cells.map(cell => cell.agentFit)),
        avgContextFit: average(cells.map(cell => cell.contextFit)),
      };
    })
    .sort(compareMatrixRows);
}

function matchesGlobalSearch(record) {
  if (!state.globalSearch) return true;
  return getValueAsText(record).toLowerCase().includes(state.globalSearch);
}

function matchesArrayFilter(values, selected) {
  if (selected === "all") return true;
  return Array.isArray(values) && values.includes(selected);
}

function matchesRules(record) {
  return state.rules.every(rule => {
    const field = ruleFields.find(item => item.key === rule.field);
    const actual = getNestedValue(record, rule.field);
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
      return false;
    }

    const left = getValueAsText(actual).toLowerCase();
    const right = String(expected).toLowerCase();
    if (rule.op === "=") return left === right;
    if (rule.op === "!=") return left !== right;
    return left.includes(right);
  });
}

function compareMatrixRows(a, b) {
  const left = getMatrixSortValue(a, state.sortField);
  const right = getMatrixSortValue(b, state.sortField);
  let result;
  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = sortCollator.compare(String(left || ""), String(right || ""));
  }
  if (result !== 0) return state.sortDirection === "asc" ? result : -result;
  return sortCollator.compare(a.modelName, b.modelName);
}

function getMatrixSortValue(row, key) {
  if (key === "modelName") return row.modelName;
  if (key === "modelVendor") return row.modelVendor;
  return row[key] ?? 0;
}

function renderSummary(records, matrixRows, tools) {
  elements.visibleCount.textContent = `${records.length} 组合 / ${matrixRows.length} 模型 × ${tools.length} 工具`;
  elements.nativeCount.textContent = records.filter(record => ["官方内置", "官方/开源默认"].includes(record.supportStatus)).length;
  elements.byokCount.textContent = records.filter(record => (record.routeTags || []).some(tag => ["BYOK", "OpenAI-compatible", "本地模型"].includes(tag))).length;
  const avg = average(records.map(record => record.agentFit));
  elements.avgAgentFit.textContent = avg === null ? "-" : `${formatNumber(avg)}/5`;
}

function renderSelectOptions() {
  fillSelect(elements.toolFilter, ["all", ...state.toolNames], "全部工具");
  fillSelect(elements.modelVendorFilter, ["all", ...uniqueRecordValues("modelVendor")], "全部厂商");
  fillSelect(elements.statusFilter, ["all", ...uniqueRecordValues("supportStatus")], "全部状态");
  fillSelect(elements.routeFilter, ["all", ...uniqueRecordValues("routeTags")], "全部方式");
  elements.sortField.innerHTML = sortOptions
    .map(option => `<option value="${escapeAttr(option.key)}">${escapeHtml(option.label)}</option>`)
    .join("");
  elements.sortField.value = state.sortField;
  elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = values
    .map(value => `<option value="${escapeAttr(value)}">${value === "all" ? allLabel : escapeHtml(value)}</option>`)
    .join("");
}

function uniqueRecordValues(key) {
  const values = state.records.flatMap(record => {
    const value = getNestedValue(record, key);
    if (Array.isArray(value)) return value.filter(Boolean);
    return value === null || value === undefined || value === "" ? [] : [value];
  });
  return [...new Set(values)].sort((a, b) => sortCollator.compare(String(a), String(b)));
}

function renderColumnPicker() {
  const selectedCount = state.visibleTools.size;
  const allSelected = selectedCount === state.toolNames.length;
  elements.columnPicker.innerHTML = `
    <div class="column-picker-head">
      <div>
        <span class="column-picker-title">显示工具列</span>
        <span class="column-picker-meta">已选 ${selectedCount} / ${state.toolNames.length}</span>
      </div>
      <div class="column-picker-tools">
        <button class="ghost-button" type="button" data-column-action="select-all" ${allSelected ? "disabled" : ""}>全选</button>
        <button class="text-button" type="button" data-column-action="reset-default">恢复默认</button>
      </div>
    </div>
    <div class="column-picker-grid">
      ${state.toolNames.map(toolName => `
        <label class="column-option">
          <input type="checkbox" value="${escapeAttr(toolName)}" ${state.visibleTools.has(toolName) ? "checked" : ""}>
          <span>${escapeHtml(toolName)}</span>
        </label>
      `).join("")}
    </div>
  `;
  syncColumnPickerState();
}

function syncColumnPickerState() {
  const selectedCount = state.visibleTools.size;
  const hiddenCount = Math.max(0, state.toolNames.length - selectedCount);
  elements.toggleColumnsButton.setAttribute("aria-expanded", String(!elements.columnPicker.hidden));
  elements.toggleColumnsButton.textContent = `工具列 (已选 ${selectedCount} / 未选 ${hiddenCount})`;
}

function renderRules() {
  elements.filterRules.innerHTML = state.rules
    .map((rule, index) => `
      <div class="rule">
        <div>
          <label>字段</label>
          <select data-rule-field="${index}">
            ${ruleFields.map(field => `<option value="${escapeAttr(field.key)}" ${field.key === rule.field ? "selected" : ""}>${escapeHtml(field.label)}</option>`).join("")}
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

function renderTable(rows, tools) {
  elements.tableHead.innerHTML = `
    <tr>
      <th class="matrix-sticky-col"><button data-sort="modelName">模型${sortMarker("modelName")}</button></th>
      <th><button data-sort="modelVendor">厂商${sortMarker("modelVendor")}</button></th>
      <th><button data-sort="coverage">覆盖${sortMarker("coverage")}</button></th>
      <th><button data-sort="avgAgentFit">均分${sortMarker("avgAgentFit")}</button></th>
      ${tools.map(toolName => `<th class="matrix-tool-head">${escapeHtml(toolName)}</th>`).join("")}
    </tr>
  `;

  elements.tableBody.innerHTML = rows
    .map(row => `
      <tr>
        <td class="matrix-sticky-col"><strong>${escapeHtml(row.modelName)}</strong></td>
        <td>${escapeHtml(row.modelVendor)}</td>
        <td>${row.coverage}/${tools.length}</td>
        <td>${formatAverageCell(row)}</td>
        ${tools.map(toolName => `<td class="matrix-tool-cell">${formatMatrixCell(row.cells.get(toolName))}</td>`).join("")}
      </tr>
    `)
    .join("");

  elements.tableHead.querySelectorAll("[data-sort]").forEach(btn => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.sort;
      if (state.sortField === field) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortField = field;
        state.sortDirection = ["modelName", "modelVendor"].includes(field) ? "asc" : "desc";
      }
      elements.sortField.value = state.sortField;
      elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
      render();
    });
  });
}

function sortMarker(key) {
  if (state.sortField !== key) return "";
  return state.sortDirection === "asc" ? " ↑" : " ↓";
}

function scoreBars(c, a, x, extraClass = "") {
  const pct = v => v != null ? `${Math.round(v / 5 * 100)}%` : "0%";
  const fmt = v => v != null ? formatNumber(v) : "—";
  const title = `代码 ${fmt(c)}/5 · Agent ${fmt(a)}/5 · 上下文 ${fmt(x)}/5`;
  return `<div class="score-bars-wrap${extraClass ? " " + extraClass : ""}" title="${escapeAttr(title)}">
    <div class="score-bars">
      <div class="score-bar score-bar-c" style="width:${pct(c)}"></div>
      <div class="score-bar score-bar-a" style="width:${pct(a)}"></div>
      <div class="score-bar score-bar-x" style="width:${pct(x)}"></div>
    </div>
    <span class="score-text">C ${fmt(c)} · A ${fmt(a)} · X ${fmt(x)}</span>
  </div>`;
}

function formatAverageCell(row) {
  return scoreBars(row.avgCodingFit, row.avgAgentFit, row.avgContextFit, "score-bars-avg");
}

function formatMatrixCell(record) {
  if (!record) {
    return `<span class="matrix-empty" title="暂无该模型在此工具中的记录">—</span>`;
  }

  const statusClass = getToneClass(record.supportStatus, "status");
  const routeTags = (record.routeTags || []).slice(0, 3);
  const sourceLinks = (record.sources || []).slice(0, 2).map(source =>
    `<a class="source-link matrix-source-link" href="${escapeAttr(source.url)}" target="_blank">${escapeHtml(source.label || "来源")}</a>`
  ).join("");
  const title = [
    record.notes,
    record.priceMeter,
    record.planRequirement,
    record.latencyNote,
  ].filter(Boolean).join("\n");

  return `
    <div class="matrix-cell" title="${escapeAttr(title)}">
      <div class="matrix-cell-top">
        <span class="tag group-status ${statusClass} verified-cell">${escapeHtml(record.supportStatus)}</span>
      </div>
      ${scoreBars(record.codingFit, record.agentFit, record.contextFit)}
      <div class="tag-list matrix-route-tags">
        ${routeTags.map(route => `<span class="tag group-route ${getToneClass(route, "route")} verified-cell">${escapeHtml(route)}</span>`).join("")}
      </div>
      ${sourceLinks ? `<div class="matrix-sources">${sourceLinks}</div>` : ""}
    </div>
  `;
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, part) => acc == null ? undefined : acc[part], obj);
}

function average(values) {
  const cleanValues = values.filter(value => typeof value === "number" && Number.isFinite(value));
  if (!cleanValues.length) return null;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
}

function formatNullable(value) {
  return value === null || value === undefined ? "-" : formatNumber(value);
}

function formatNumber(value) {
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toFixed(1).replace(/\.0$/, "");
}

function getValueAsText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === "object") return Object.values(item).map(getValueAsText).filter(Boolean).join(" ");
      return String(item);
    }).join(" / ");
  }
  if (value && typeof value === "object") {
    return Object.values(value).map(getValueAsText).filter(Boolean).join(" / ");
  }
  return String(value);
}

function getToneClass(value, group) {
  const text = `${group}:${value}`;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  }
  return `tone-${hash % 8}`;
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

function exportCsv() {
  const records = getFilteredRecords();
  const tools = getVisibleTools();
  const rows = buildMatrixRows(records, tools);
  const header = ["模型", "厂商", "覆盖工具数", "平均代码适配", "平均 Agent 适配", "平均长上下文", ...tools];
  const body = rows.map(row => [
    row.modelName,
    row.modelVendor,
    `${row.coverage}/${tools.length}`,
    formatNullable(row.avgCodingFit),
    formatNullable(row.avgAgentFit),
    formatNullable(row.avgContextFit),
    ...tools.map(toolName => getCellCsvText(row.cells.get(toolName))),
  ]);
  const csv = [header, ...body]
    .map(line => line.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "model-tool-matrix.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function getCellCsvText(record) {
  if (!record) return "";
  return [
    record.supportStatus,
    `C${record.codingFit}/A${record.agentFit}/X${record.contextFit}`,
    (record.routeTags || []).join(" / "),
    record.priceMeter,
    record.notes,
  ].filter(Boolean).join(" | ");
}

init();
