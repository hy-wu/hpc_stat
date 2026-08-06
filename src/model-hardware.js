const sortCollator = new Intl.Collator("zh-Hans-CN", { numeric: true, sensitivity: "base" });

const ruleFields = [
  { key: "modelName", label: "模型", type: "text" },
  { key: "gpuName", label: "硬件", type: "text" },
  { key: "modelVendor", label: "模型厂商", type: "text" },
  { key: "gpuVendor", label: "硬件厂商", type: "text" },
  { key: "deployMode", label: "部署方式", type: "text" },
  { key: "precision", label: "量化精度", type: "text" },
  { key: "scenario", label: "场景", type: "text" },
  { key: "gpuCount", label: "卡数", type: "number" },
  { key: "minVramGB", label: "最低显存(GB)", type: "number" },
  { key: "inputTps", label: "输入速度(tok/s)", type: "number" },
  { key: "outputTps", label: "输出速度(tok/s)", type: "number" },
  { key: "concurrency", label: "并发数", type: "number" },
  { key: "perfSource", label: "速度数据口径", type: "text" },
  { key: "fitScore", label: "硬件适配", type: "number" },
  { key: "memoryFit", label: "显存容量适配", type: "number" },
  { key: "bandwidthFit", label: "带宽适配", type: "number" },
  { key: "computeFit", label: "算力适配", type: "number" },
  { key: "throughputNote", label: "吞吐说明", type: "text" },
  { key: "costNote", label: "成本说明", type: "text" },
  { key: "notes", label: "评价", type: "text" },
];

const sortOptions = [
  { key: "coverage", label: "覆盖硬件数" },
  { key: "avgFitScore", label: "平均硬件适配" },
  { key: "avgMemoryFit", label: "平均显存适配" },
  { key: "avgBandwidthFit", label: "平均带宽适配" },
  { key: "modelName", label: "模型名称" },
  { key: "modelVendor", label: "模型厂商" },
];

const state = {
  records: [],
  gpuNames: [],
  visibleGpus: new Set(),
  perfMax: { inputTps: 0, outputTps: 0, concurrency: 0 },
  sortField: "coverage",
  sortDirection: "desc",
  globalSearch: "",
  gpu: "all",
  modelVendor: "all",
  deployMode: "all",
  precision: "all",
  rules: [],
  compact: false,
  autoHiddenCount: 0,
};

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  gpuFilter: document.querySelector("#gpuFilter"),
  modelVendorFilter: document.querySelector("#modelVendorFilter"),
  deployModeFilter: document.querySelector("#deployModeFilter"),
  precisionFilter: document.querySelector("#precisionFilter"),
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
  singleCardCount: document.querySelector("#singleCardCount"),
  multiCardCount: document.querySelector("#multiCardCount"),
  avgFitScore: document.querySelector("#avgFitScore"),
};

async function init() {
  try {
    const response = await fetch("data/model-hardware.json");
    state.records = await response.json();
    state.gpuNames = uniqueRecordValues("gpuName");
    state.visibleGpus = new Set(state.gpuNames);
    // 速度/并发的纵向色阶高度按全量数据的全局最大值归一化，筛选时标尺不变
    state.perfMax = {
      inputTps: Math.max(0, ...state.records.map(record => Number(record.inputTps) || 0)),
      outputTps: Math.max(0, ...state.records.map(record => Number(record.outputTps) || 0)),
      concurrency: Math.max(0, ...state.records.map(record => Number(record.concurrency) || 0)),
    };

    renderSelectOptions();
    renderColumnPicker();
    syncColumnPickerState();
    renderRules();
    bindEvents();
    render();
  } catch (err) {
    console.error("Failed to load model-hardware matrix:", err);
    if (elements.tableBody) {
      elements.tableBody.innerHTML = `<tr><td colspan="99" class="muted" style="text-align:center;padding:24px">模型 × 硬件数据加载失败：请确认通过静态服务器访问且 data/model-hardware.json 存在。</td></tr>`;
    }
  }
}

function bindEvents() {
  elements.globalSearch.addEventListener("input", () => {
    state.globalSearch = elements.globalSearch.value.trim().toLowerCase();
    render();
  });

  elements.gpuFilter.addEventListener("change", () => {
    state.gpu = elements.gpuFilter.value;
    render();
  });

  elements.modelVendorFilter.addEventListener("change", () => {
    state.modelVendor = elements.modelVendorFilter.value;
    render();
  });

  elements.deployModeFilter.addEventListener("change", () => {
    state.deployMode = elements.deployModeFilter.value;
    render();
  });

  elements.precisionFilter.addEventListener("change", () => {
    state.precision = elements.precisionFilter.value;
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
    state.gpu = "all";
    state.modelVendor = "all";
    state.deployMode = "all";
    state.precision = "all";
    state.rules = [];
    elements.globalSearch.value = "";
    elements.gpuFilter.value = "all";
    elements.modelVendorFilter.value = "all";
    elements.deployModeFilter.value = "all";
    elements.precisionFilter.value = "all";
    renderRules();
    render();
  });

  elements.addRuleButton.addEventListener("click", () => {
    state.rules.push({ field: "fitScore", op: ">=", value: "" });
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
    if (action === "select-all") state.visibleGpus = new Set(state.gpuNames);
    if (action === "reset-default") state.visibleGpus = new Set(state.gpuNames);
    renderColumnPicker();
    render();
  });

  elements.columnPicker.addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    if (e.target.checked) state.visibleGpus.add(e.target.value);
    else state.visibleGpus.delete(e.target.value);
    renderColumnPicker();
    render();
  });
}

function render() {
  const records = getFilteredRecords();
  const gpus = getVisibleGpus(records);
  const matrixRows = buildMatrixRows(records, gpus);
  renderSummary(records, matrixRows, gpus);
  renderTable(matrixRows, gpus);
  updateAutoHiddenHint(gpus);
}

function getFilteredRecords() {
  return state.records
    .filter(matchesGlobalSearch)
    .filter(record => state.gpu === "all" || record.gpuName === state.gpu)
    .filter(record => state.modelVendor === "all" || record.modelVendor === state.modelVendor)
    .filter(record => state.deployMode === "all" || record.deployMode === state.deployMode)
    .filter(record => state.precision === "all" || record.precision === state.precision)
    .filter(matchesRules);
}

function getVisibleGpus(filteredRecords) {
  if (state.gpu !== "all") return [state.gpu];
  // 筛选后自动隐藏完全没有记录的硬件列（列设置可再手动隐藏更多列）
  const records = filteredRecords || getFilteredRecords();
  const hitGpuNames = new Set(records.map(record => record.gpuName));
  return state.gpuNames.filter(gpuName => state.visibleGpus.has(gpuName) && hitGpuNames.has(gpuName));
}

function buildMatrixRows(records, gpus) {
  const visibleGpuSet = new Set(gpus);
  const rowMap = new Map();

  records
    .filter(record => visibleGpuSet.has(record.gpuName))
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
      rowMap.get(key).cells.set(record.gpuName, record);
    });

  return [...rowMap.values()]
    .map(row => {
      const cells = [...row.cells.values()];
      return {
        ...row,
        coverage: cells.length,
        avgFitScore: average(cells.map(cell => cell.fitScore)),
        avgMemoryFit: average(cells.map(cell => cell.memoryFit)),
        avgBandwidthFit: average(cells.map(cell => cell.bandwidthFit)),
        avgComputeFit: average(cells.map(cell => cell.computeFit)),
      };
    })
    .sort(compareMatrixRows);
}

function matchesGlobalSearch(record) {
  if (!state.globalSearch) return true;
  return getValueAsText(record).toLowerCase().includes(state.globalSearch);
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
      // 值框不是合法数字时忽略该条件，避免误清空全部行
      if (!Number.isFinite(left) || !Number.isFinite(right)) return true;
      if (rule.op === ">=") return left >= right;
      if (rule.op === "<=") return left <= right;
      if (rule.op === ">") return left > right;
      if (rule.op === "<") return left < right;
      if (rule.op === "=") return left === right;
      if (rule.op === "!=") return left !== right;
      return true;
    }

    const left = getValueAsText(actual).toLowerCase();
    const right = String(expected).toLowerCase();
    if (rule.op === "=") return left === right;
    if (rule.op === "!=") return !left.includes(right);
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

function renderSummary(records, matrixRows, gpus) {
  elements.visibleCount.textContent = `${records.length} 组合 / ${matrixRows.length} 模型 × ${gpus.length} 硬件`;
  elements.singleCardCount.textContent = records.filter(record => ["单卡", "单设备"].includes(record.deployMode)).length;
  elements.multiCardCount.textContent = records.filter(record => ["多卡", "集群"].includes(record.deployMode)).length;
  const avg = average(records.map(record => record.fitScore));
  elements.avgFitScore.textContent = avg === null ? "-" : `${formatNumber(avg)}/5`;
}

function renderSelectOptions() {
  fillSelect(elements.gpuFilter, ["all", ...state.gpuNames], "全部硬件");
  fillSelect(elements.modelVendorFilter, ["all", ...uniqueRecordValues("modelVendor")], "全部厂商");
  fillSelect(elements.deployModeFilter, ["all", ...uniqueRecordValues("deployMode")], "全部方式");
  fillSelect(elements.precisionFilter, ["all", ...uniqueRecordValues("precision")], "全部精度");
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
  const selectedCount = state.visibleGpus.size;
  const allSelected = selectedCount === state.gpuNames.length;
  elements.columnPicker.innerHTML = `
    <div class="column-picker-head">
      <div>
        <span class="column-picker-title">显示硬件列</span>
        <span class="column-picker-meta">已选 ${selectedCount} / ${state.gpuNames.length}</span>
      </div>
      <div class="column-picker-tools">
        <button class="ghost-button" type="button" data-column-action="select-all" ${allSelected ? "disabled" : ""}>全选</button>
        <button class="text-button" type="button" data-column-action="reset-default">恢复默认</button>
      </div>
    </div>
    <div class="column-picker-grid">
      ${state.gpuNames.map(gpuName => `
        <label class="column-option">
          <input type="checkbox" value="${escapeAttr(gpuName)}" ${state.visibleGpus.has(gpuName) ? "checked" : ""}>
          <span>${escapeHtml(gpuName)}</span>
        </label>
      `).join("")}
    </div>
  `;
  syncColumnPickerState();
}

function syncColumnPickerState() {
  const selectedCount = state.visibleGpus.size;
  const hiddenCount = Math.max(0, state.gpuNames.length - selectedCount);
  elements.toggleColumnsButton.setAttribute("aria-expanded", String(!elements.columnPicker.hidden));
  const autoHidden = state.autoHiddenCount > 0 ? ` · 自动隐 ${state.autoHiddenCount}` : "";
  elements.toggleColumnsButton.textContent = `硬件列 (已选 ${selectedCount} / 未选 ${hiddenCount}${autoHidden})`;
}

function updateAutoHiddenHint(gpus) {
  const autoHiddenCount = state.gpu === "all"
    ? state.gpuNames.filter(gpuName => state.visibleGpus.has(gpuName) && !gpus.includes(gpuName)).length
    : 0;
  if (autoHiddenCount === state.autoHiddenCount) return;
  state.autoHiddenCount = autoHiddenCount;
  syncColumnPickerState();
}

function renderRules() {
  elements.filterRules.innerHTML = state.rules
    .map((rule, index) => {
      const fieldType = ruleFields.find(item => item.key === rule.field)?.type || "text";
      return `
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
            ${operatorOptions(rule.op, fieldType)}
          </select>
        </div>
        <div>
          <label>值</label>
          <input data-rule-value="${index}" value="${escapeAttr(rule.value)}" />
        </div>
        <button class="ghost-button" data-rule-remove="${index}" type="button" title="删除条件">×</button>
      </div>
    `;
    })
    .join("");

  elements.filterRules.querySelectorAll("[data-rule-field]").forEach(select => {
    select.addEventListener("change", () => {
      const rule = state.rules[Number(select.dataset.ruleField)];
      rule.field = select.value;
      // 切换字段后若当前条件不适配新字段类型，自动回退到合理默认，避免出现"永远无结果"
      const newType = ruleFields.find(item => item.key === rule.field)?.type || "text";
      if (!opsForType(newType).includes(rule.op)) {
        rule.op = newType === "number" ? ">=" : "contains";
      }
      renderRules();
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

function opsForType(fieldType) {
  return fieldType === "number" ? [">=", "<=", ">", "<", "=", "!="] : ["contains", "=", "!="];
}

function operatorOptions(selected, fieldType) {
  const labels = {
    contains: "包含",
    "=": fieldType === "number" ? "等于" : "等于",
    "!=": fieldType === "number" ? "不等于" : "不包含",
    ">=": "大于等于",
    "<=": "小于等于",
    ">": "大于",
    "<": "小于",
  };
  return opsForType(fieldType)
    .map(op => `<option value="${op}" ${op === selected ? "selected" : ""}>${labels[op]}</option>`)
    .join("");
}

function renderTable(rows, gpus) {
  elements.tableHead.innerHTML = `
    <tr>
      <th class="matrix-sticky-col"><button data-sort="modelName">模型${sortMarker("modelName")}</button></th>
      <th><button data-sort="modelVendor">厂商${sortMarker("modelVendor")}</button></th>
      <th><button data-sort="coverage">覆盖${sortMarker("coverage")}</button></th>
      <th><button data-sort="avgFitScore">均分${sortMarker("avgFitScore")}</button></th>
      ${gpus.map(gpuName => `<th class="matrix-tool-head">${escapeHtml(gpuName)}</th>`).join("")}
    </tr>
  `;

  if (!rows.length) {
    elements.tableBody.innerHTML = `<tr><td colspan="${gpus.length + 4}" class="muted" style="text-align:center;padding:24px">没有匹配的模型 × 硬件组合；请调整搜索或筛选条件。</td></tr>`;
    return;
  }

  elements.tableBody.innerHTML = rows
    .map(row => `
      <tr>
        <td class="matrix-sticky-col"><strong>${escapeHtml(row.modelName)}</strong></td>
        <td>${escapeHtml(row.modelVendor)}</td>
        <td>${row.coverage}/${gpus.length}</td>
        <td>${formatAverageCell(row)}</td>
        ${gpus.map(gpuName => `<td class="matrix-tool-cell">${formatMatrixCell(row.cells.get(gpuName))}</td>`).join("")}
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

function scoreBars(m, b, c, extraClass = "") {
  const pct = v => v != null ? `${Math.round(v / 5 * 100)}%` : "0%";
  const fmt = v => v != null ? formatNumber(v) : "—";
  const title = `显存 ${fmt(m)}/5 · 带宽 ${fmt(b)}/5 · 算力 ${fmt(c)}/5`;
  return `<div class="score-bars-wrap${extraClass ? " " + extraClass : ""}" title="${escapeAttr(title)}">
    <div class="score-bars">
      <div class="score-bar score-bar-c" style="width:${pct(m)}"></div>
      <div class="score-bar score-bar-a" style="width:${pct(b)}"></div>
      <div class="score-bar score-bar-x" style="width:${pct(c)}"></div>
    </div>
    <span class="score-text">M ${fmt(m)} · B ${fmt(b)} · C ${fmt(c)}</span>
  </div>`;
}

function formatAverageCell(row) {
  return scoreBars(row.avgMemoryFit, row.avgBandwidthFit, row.avgComputeFit, "score-bars-avg");
}

function formatPerfBars(record) {
  const bars = [
    { key: "inputTps", value: record.inputTps, hue: 212 },
    { key: "outputTps", value: record.outputTps, hue: 152 },
    { key: "concurrency", value: record.concurrency, hue: 32 },
  ];
  // 三根竖条作为单元格背景横向并排，柱高按全表全局最大值归一，颜色随比例加深
  const columns = bars.map(bar => {
    const max = state.perfMax[bar.key] || 0;
    const ratio = max > 0 && bar.value != null ? Math.min(1, bar.value / max) : 0;
    if (bar.value == null) return `<div class="perf-bar perf-bar-empty"></div>`;
    const lightness = 74 - Math.round(ratio * 36);
    return `<div class="perf-bar" style="height:${Math.max(4, Math.round(ratio * 100))}%;background:hsl(${bar.hue}, 68%, ${lightness}%)"></div>`;
  }).join("");
  return `<div class="perf-bars" aria-hidden="true">${columns}</div>`;
}

function formatPerfText(record) {
  const inTps = record.inputTps != null ? `↑${formatCompact(record.inputTps)}` : "↑—";
  const outTps = record.outputTps != null ? `↓${formatCompact(record.outputTps)}` : "↓—";
  const concurrency = record.concurrency != null ? `${formatCompact(record.concurrency)} 并发` : "并发—";
  return `<div class="perf-text">
    <span class="perf-seg perf-seg-left">${escapeHtml(inTps)}</span>
    <span class="perf-seg perf-seg-center">${escapeHtml(outTps)}</span>
    <span class="perf-seg perf-seg-right">${escapeHtml(concurrency)}</span>
  </div>`;
}

function formatCompact(value) {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) return `${formatNumber(Math.round(value / 100) / 10)}k`;
  return formatNumber(value);
}

function formatMatrixCell(record) {
  if (!record) {
    return `<span class="matrix-empty" title="暂无该模型在此硬件上的部署记录">—</span>`;
  }

  const modeClass = getToneClass(record.deployMode, "status");
  const precisionClass = getToneClass(record.precision, "route");
  const vramText = record.minVramGB != null ? `${formatNumber(record.minVramGB)}GB` : "—";
  const sourceLinks = (record.sources || []).slice(0, 2).map(source =>
    `<a class="source-link matrix-source-link" href="${escapeAttr(source.url)}" target="_blank">${escapeHtml(source.label || "来源")}</a>`
  ).join("");
  const title = [
    record.inputTps != null || record.outputTps != null
      ? `速度：↑${record.inputTps != null ? formatNumber(record.inputTps) : "—"} / ↓${record.outputTps != null ? formatNumber(record.outputTps) : "—"} tok/s @ ${record.concurrency != null ? formatNumber(record.concurrency) : "—"} 并发（背景柱高按全局最大值归一，左入/中出/右并发）`
      : "",
    record.perfSource ? `速度口径：${record.perfSource}` : "",
    record.throughputNote,
    record.costNote,
    record.notes,
  ].filter(Boolean).join("\n");

  return `
    <div class="matrix-cell matrix-cell-hw" title="${escapeAttr(title)}">
      ${formatPerfBars(record)}
      <div class="matrix-cell-top matrix-tags-row">
        <span class="tag group-status ${modeClass} verified-cell">${escapeHtml(record.deployMode)}</span>
        <span class="tag group-route ${precisionClass} verified-cell">${escapeHtml(record.precision)}</span>
        <span class="tag group-route ${getToneClass("gpuCount", "route")} verified-cell">×${record.gpuCount ?? "—"} · 需 ${vramText}</span>
      </div>
      ${scoreBars(record.memoryFit, record.bandwidthFit, record.computeFit)}
      ${sourceLinks ? `<div class="matrix-sources">${sourceLinks}</div>` : ""}
      ${formatPerfText(record)}
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
  const gpus = getVisibleGpus(records);
  const rows = buildMatrixRows(records, gpus);
  const header = ["模型", "厂商", "覆盖硬件数", "平均硬件适配", "平均显存适配", "平均带宽适配", ...gpus];
  const body = rows.map(row => [
    row.modelName,
    row.modelVendor,
    `${row.coverage}/${gpus.length}`,
    formatNullable(row.avgFitScore),
    formatNullable(row.avgMemoryFit),
    formatNullable(row.avgBandwidthFit),
    ...gpus.map(gpuName => getCellCsvText(row.cells.get(gpuName))),
  ]);
  const csv = [header, ...body]
    .map(line => line.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "model-hardware-matrix.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function getCellCsvText(record) {
  if (!record) return "";
  return [
    record.deployMode,
    record.precision,
    `×${record.gpuCount}`,
    record.minVramGB != null ? `需 ${record.minVramGB}GB` : "",
    record.inputTps != null || record.outputTps != null
      ? `↑${record.inputTps ?? "—"}/↓${record.outputTps ?? "—"} tok/s @ ${record.concurrency ?? "—"} 并发（${record.perfSource || "口径未记录"}）`
      : "",
    `适配 ${record.fitScore}/5`,
    record.throughputNote,
    record.notes,
  ].filter(Boolean).join(" | ");
}

init();
