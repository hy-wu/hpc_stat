let fieldDefs = [];
let vendorLinks = {};
let defaultVisibleColumns = new Set();
const sortCollator = new Intl.Collator("zh-Hans-CN", { numeric: true, sensitivity: "base" });

const state = {
  tools: [],
  visibleColumns: new Set(),
  sortField: "name",
  sortDirection: "asc",
  globalSearch: "",
  category: "all",
  deployment: "all",
  access: "all",
  vendor: "all",
  verificationStatus: "all",
  rules: [],
  compact: false,
};

const accessFilters = [
  { value: "all", label: "全部接入" },
  { value: "byok", label: "BYOK" },
  { value: "openai-compatible", label: "OpenAI-compatible" },
  { value: "local-model", label: "本地模型" },
  { value: "mcp", label: "MCP" },
  { value: "background-agent", label: "后台 Agent" },
];

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  typeFilter: document.querySelector("#typeFilter"),
  deploymentFilter: document.querySelector("#deploymentFilter"),
  accessFilter: document.querySelector("#accessFilter"),
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
  sourcedCount: document.querySelector("#sourcedCount"),
  freeCount: document.querySelector("#freeCount"),
  openSourceCount: document.querySelector("#openSourceCount"),
};

async function init() {
  try {
    const [toolsResponse, fieldsResponse] = await Promise.all([
      fetch("data/agent-tools.json"),
      fetch("data/agent-tool-fields.json"),
    ]);
    const rawData = await toolsResponse.json();
    const fieldConfig = await fieldsResponse.json();

    fieldDefs = fieldConfig.fields || [];
    vendorLinks = fieldConfig.vendorLinks || {};
    defaultVisibleColumns = new Set(fieldDefs.filter(field => field.visible).map(field => field.key));
    state.visibleColumns = new Set(defaultVisibleColumns);
    state.tools = rawData;

    renderSelectOptions();
    renderColumnPicker();
    syncColumnPickerState();
    renderRules();
    bindEvents();
    render();
  } catch (err) {
    console.error("Failed to load agent tools:", err);
  }
}

function bindEvents() {
  elements.globalSearch.addEventListener("input", () => {
    state.globalSearch = elements.globalSearch.value.trim().toLowerCase();
    render();
  });

  elements.typeFilter.addEventListener("change", () => {
    state.category = elements.typeFilter.value;
    render();
  });

  elements.deploymentFilter.addEventListener("change", () => {
    state.deployment = elements.deploymentFilter.value;
    render();
  });

  elements.accessFilter.addEventListener("change", () => {
    state.access = elements.accessFilter.value;
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
    state.category = "all";
    state.deployment = "all";
    state.access = "all";
    state.vendor = "all";
    state.verificationStatus = "all";
    state.rules = [];
    elements.globalSearch.value = "";
    elements.typeFilter.value = "all";
    elements.deploymentFilter.value = "all";
    elements.accessFilter.value = "all";
    elements.vendorFilter.value = "all";
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

  elements.exportCsvButton.addEventListener("click", exportCsv);

  elements.columnPicker.addEventListener("click", (e) => {
    const action = e.target.closest("[data-column-action]")?.dataset.columnAction;
    if (!action) return;
    if (action === "select-all") state.visibleColumns = new Set(fieldDefs.map(field => field.key));
    if (action === "reset-default") state.visibleColumns = new Set(defaultVisibleColumns);
    renderColumnPicker();
    render();
  });

  elements.columnPicker.addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    const key = e.target.value;
    if (e.target.checked) state.visibleColumns.add(key);
    else state.visibleColumns.delete(key);
    renderColumnPicker();
    render();
  });
}

function render() {
  const filtered = getFilteredRows();
  renderSummary(filtered);
  renderTable(filtered);
}

function getFilteredRows() {
  const sortFieldDef = fieldDefs.find(field => field.key === state.sortField);
  return state.tools
    .filter(matchesGlobalSearch)
    .filter(tool => matchesTagFilter(tool.categoryTags, state.category))
    .filter(tool => matchesTagFilter(tool.deploymentTags, state.deployment))
    .filter(tool => state.vendor === "all" || tool.vendor === state.vendor)
    .filter(tool => state.verificationStatus === "all" || String(tool.verification?.status || "unknown") === state.verificationStatus)
    .filter(matchesAccessFilter)
    .filter(matchesRules)
    .sort((a, b) => compareRows(a, b, state.sortField, state.sortDirection, sortFieldDef));
}

function matchesTagFilter(values, selected) {
  if (selected === "all") return true;
  return Array.isArray(values) && values.includes(selected);
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, part) => acc == null ? undefined : acc[part], obj);
}

function matchesAccessFilter(tool) {
  if (state.access === "all") return true;
  if (state.access === "byok") return Boolean(getNestedValue(tool, "access.byok"));
  if (state.access === "openai-compatible") return Boolean(getNestedValue(tool, "access.openAICompatible"));
  if (state.access === "local-model") return Boolean(getNestedValue(tool, "access.localModel"));
  if (state.access === "mcp") return Boolean(getNestedValue(tool, "integrations.mcp"));
  if (state.access === "background-agent") return Boolean(getNestedValue(tool, "capabilities.backgroundAgent"));
  return true;
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

  if (typeof value === "boolean") {
    return { missing: false, kind: "number", value: Number(value) };
  }

  if (typeof value === "number") {
    return { missing: false, kind: "number", value };
  }

  return { missing: false, kind: "text", value: getValueAsText(value) };
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
  fillSelect(elements.typeFilter, ["all", ...uniqueValues("categoryTags")], "全部类型");
  fillSelect(elements.deploymentFilter, ["all", ...uniqueValues("deploymentTags")], "全部形态");
  fillSelect(elements.accessFilter, accessFilters.map(item => item.value), "全部接入", value => {
    const option = accessFilters.find(item => item.value === value);
    return option?.label || value;
  });
  fillSelect(elements.statusFilter, ["all", ...uniqueVerificationStatuses()], "全部状态", verificationStatusLabel);
  fillSelect(elements.vendorFilter, ["all", ...uniqueValues("vendor")], "全部厂商");
  elements.sortField.innerHTML = fieldDefs
    .map(field => `<option value="${escapeAttr(field.key)}">${escapeHtml(field.label)}</option>`)
    .join("");
  elements.sortField.value = state.sortField;
  elements.sortDirectionButton.textContent = state.sortDirection === "asc" ? "升序" : "降序";
}

function fillSelect(select, values, allLabel, labelFormatter = value => value) {
  select.innerHTML = values
    .map(value => `<option value="${escapeAttr(value)}">${value === "all" ? allLabel : escapeHtml(labelFormatter(value))}</option>`)
    .join("");
}

function uniqueValues(key) {
  const values = state.tools.flatMap(tool => getFieldValues(tool, key));
  return [...new Set(values)]
    .sort((a, b) => sortCollator.compare(String(a), String(b)));
}

function getFieldValues(row, key) {
  const value = getNestedValue(row, key);
  if (Array.isArray(value)) return value.filter(Boolean);
  return value === null || value === undefined || value === "" ? [] : [value];
}

function uniqueVerificationStatuses() {
  return [...new Set(state.tools.map(tool => tool.verification?.status || "unknown"))]
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

function matchesGlobalSearch(tool) {
  if (!state.globalSearch) return true;
  return fieldDefs.some(field => getValueAsText(getNestedValue(tool, field.key)).toLowerCase().includes(state.globalSearch))
    || getValueAsText(tool.id).toLowerCase().includes(state.globalSearch)
    || getValueAsText(tool.verification?.status).toLowerCase().includes(state.globalSearch)
    || (tool.verification?.sources || []).some(source => getValueAsText([source.label, source.url]).toLowerCase().includes(state.globalSearch));
}

function matchesRules(tool) {
  return state.rules.every(rule => {
    const field = fieldDefs.find(item => item.key === rule.field);
    const actual = getNestedValue(tool, rule.field);
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

    if (field?.type === "boolean") {
      const left = Boolean(actual);
      const normalized = String(expected).trim().toLowerCase();
      const right = ["true", "1", "yes", "y", "是", "支持"].includes(normalized);
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

function renderSummary(rows) {
  elements.visibleCount.textContent = rows.length;
  const sourcedCount = rows.filter(row => ["verified", "partial"].includes(row.verification?.status)).length;
  const freeCount = rows.filter(row => row.pricing?.freeTier === true).length;
  const openSourceCount = rows.filter(row => row.pricing?.openSource === true).length;
  elements.sourcedCount.textContent = `${sourcedCount}/${rows.length}`;
  elements.freeCount.textContent = `${freeCount}/${rows.length}`;
  elements.openSourceCount.textContent = `${openSourceCount}/${rows.length}`;
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
      ${fieldDefs.map(field => `
        <label class="column-option">
          <input type="checkbox" value="${escapeAttr(field.key)}" ${state.visibleColumns.has(field.key) ? "checked" : ""}>
          <span>${escapeHtml(field.label)}</span>
        </label>
      `).join("")}
    </div>
  `;
  syncColumnPickerState();
}

function syncColumnPickerState() {
  const selectedCount = state.visibleColumns.size;
  const hiddenCount = Math.max(0, fieldDefs.length - selectedCount);
  const expanded = !elements.columnPicker.hidden;
  elements.toggleColumnsButton.setAttribute("aria-expanded", String(expanded));
  elements.toggleColumnsButton.textContent = `列设置 (已选 ${selectedCount} / 未选 ${hiddenCount})`;
}

function renderRules() {
  elements.filterRules.innerHTML = state.rules
    .map((rule, index) => `
      <div class="rule">
        <div>
          <label>字段</label>
          <select data-rule-field="${index}">
            ${fieldDefs.map(field => `<option value="${escapeAttr(field.key)}" ${field.key === rule.field ? "selected" : ""}>${escapeHtml(field.label)}</option>`).join("")}
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

function renderTable(rows) {
  const stats = {};
  fieldDefs.forEach(field => {
    if (field.heatmap) {
      const values = rows.map(tool => getNestedValue(tool, field.key)).filter(value => typeof value === "number");
      stats[field.key] = values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
    }
  });

  const activeFields = fieldDefs.filter(field => state.visibleColumns.has(field.key));
  elements.tableHead.innerHTML = `<tr>${activeFields
    .map(field => `<th>
      <button data-sort="${escapeAttr(field.key)}">${escapeHtml(field.label)}${state.sortField === field.key ? (state.sortDirection === "asc" ? " ↑" : " ↓") : ""}</button>
      ${field.source ? `<a href="${escapeAttr(field.source)}" target="_blank" class="source-icon" title="查看字段来源">🔗</a>` : ""}
    </th>`)
    .join("")}</tr>`;

  elements.tableBody.innerHTML = rows
    .map(row => `<tr>${activeFields
      .map(field => `<td>${formatCell(row, field, stats[field.key])}</td>`)
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

  if (val === null || val === undefined || val === "") {
    return `<span class="unverified-cell" title="未核验或暂无数据">-</span>`;
  }

  if (field.key === "name") {
    const logoUrl = getNestedValue(row, "logoUrl");
    const officialUrl = getNestedValue(row, "officialUrl");
    const imgSrc = logoUrl || (officialUrl ? getFaviconUrl(officialUrl) : "");
    const logoHtml = imgSrc ? `<img class="tool-logo" src="${escapeAttr(imgSrc)}" alt="" loading="lazy" onerror="this.style.display='none'">` : "";
    return `<span class="tool-name-cell ${className}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">${logoHtml}${escapeHtml(getValueAsText(val))}</span>`;
  }

  if (field.key === "vendor") {
    const link = vendorLinks[val];
    return link
      ? `<a href="${escapeAttr(link)}" target="_blank" class="vendor-link ${className}" title="${escapeAttr(sourceTitle || "前往官网")}">${escapeHtml(val)}</a>`
      : `<span class="${className}" title="${escapeAttr(sourceTitle)}">${escapeHtml(val)}</span>`;
  }

  if (field.type === "url") {
    return `<a href="${escapeAttr(val)}" target="_blank" class="source-link ${className}" title="${escapeAttr(sourceTitle)}">官网</a>`;
  }

  if (field.type === "boolean") {
    return renderBooleanTag(val, className, sourceTitle);
  }

  if (field.type === "tag-list") {
    return renderTagList(Array.isArray(val) ? val : [val], field.tagGroup || "generic", className, sourceTitle);
  }

  if (field.type === "pricing-plans") {
    return renderPlanStack(Array.isArray(val) ? val : [], className, sourceTitle);
  }

  if (field.heatmap && stat && typeof val === "number") {
    const lengthPercent = (val - stat.min) / (stat.max - stat.min || 1) * 100;
    const colorPercent = field.inverseHeatmap ? 100 - lengthPercent : lengthPercent;
    const color = getHeatmapColor(colorPercent);
    const prefix = field.key.includes("USD") ? "$" : (field.displayPrefix || "");
    const displayValue = `${prefix}${formatNumber(val)}`;
    return `
      <div class="heatmap-container mini ${className}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">
        <div class="heatmap-bar" style="width: ${lengthPercent}%; background: ${color}"></div>
        <span class="heatmap-value">${displayValue}</span>
      </div>
    `;
  }

  return `<span class="${className}" title="${verified ? escapeAttr(sourceTitle) : "未核验"}">${escapeHtml(getValueAsText(val))}</span>`;
}

function renderBooleanTag(value, className, sourceTitle) {
  const boolClass = value ? "bool-yes" : "bool-no";
  const text = value ? "是" : "否";
  return `<span class="tag group-boolean ${boolClass} ${className}" title="${escapeAttr(sourceTitle)}">${text}</span>`;
}

function renderTagList(values, group, className, sourceTitle) {
  const cleanValues = values.filter(Boolean);
  if (!cleanValues.length) {
    return `<span class="unverified-cell" title="未核验或暂无数据">-</span>`;
  }
  return `<div class="tag-list">${cleanValues.map(value => {
    const toneClass = getToneClass(value, group);
    return `<span class="tag group-${group} ${toneClass} ${className}" title="${escapeAttr(sourceTitle)}">${escapeHtml(String(value))}</span>`;
  }).join("")}</div>`;
}

function renderPlanStack(plans, className, sourceTitle) {
  if (!plans.length) {
    return `<span class="unverified-cell" title="未核验或暂无数据">-</span>`;
  }

  return `<div class="plan-stack ${className}" title="${escapeAttr(sourceTitle)}">${plans.map(plan => {
    const label = escapeHtml(plan.name || "Plan");
    const price = getPlanPrice(plan);
    const note = plan.note ? `<span class="plan-note">${escapeHtml(plan.note)}</span>` : "";
    return `
      <div class="plan-row">
        <span class="plan-name">${label}</span>
        <span class="plan-price">${price}</span>
      </div>
      ${note}
    `;
  }).join("")}</div>`;
}

function getPlanPriceText(plan) {
  if (plan.pricingUrl) return plan.pricingUrl;
  if (plan.priceLabel) return plan.priceLabel;
  if (typeof plan.priceUSD === "number") {
    const period = plan.period ? ` / ${plan.period}` : "";
    return `$${formatNumber(plan.priceUSD)}${period}`;
  }
  return "Custom";
}

function getPlanPrice(plan) {
  if (plan.pricingUrl) {
    return `<a href="${escapeAttr(plan.pricingUrl)}" target="_blank" class="source-link">价格页 ↗</a>`;
  }
  if (plan.priceLabel) return escapeHtml(plan.priceLabel);
  if (typeof plan.priceUSD === "number") {
    const period = plan.period ? ` / ${plan.period}` : "";
    return `$${formatNumber(plan.priceUSD)}${period}`;
  }
  return "Custom";
}

function getValueAsText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map(item => {
      if (item && typeof item === "object") {
        return [item.name, getPlanPriceText(item), item.note].filter(Boolean).join(" ");
      }
      return String(item);
    }).join(" / ");
  }
  if (value && typeof value === "object") {
    return Object.values(value).map(getValueAsText).filter(Boolean).join(" / ");
  }
  return String(value);
}

function getToneClass(value, group) {
  const paletteSize = 8;
  const seed = `${group}:${String(value)}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }
  const tone = Math.abs(hash) % paletteSize;
  return `tone-${tone}`;
}

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  } catch {
    return "";
  }
}

function formatNumber(value) {
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toFixed(2).replace(/\.00$/, "");
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
  const activeFields = fieldDefs.filter(field => state.visibleColumns.has(field.key));
  const rows = getFilteredRows();
  const escape = value => {
    const text = getValueAsText(value);
    return text.includes(",") || text.includes('"') || text.includes("\n")
      ? `"${text.replace(/"/g, '""')}"`
      : text;
  };

  const header = activeFields.map(field => escape(field.label)).join(",");
  const body = rows.map(row =>
    activeFields.map(field => escape(getNestedValue(row, field.key))).join(",")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agent-tools-${new Date().toISOString().slice(0, 10)}.csv`;
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
