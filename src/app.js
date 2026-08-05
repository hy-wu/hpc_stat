const sortCollator = new Intl.Collator("zh-Hans-CN", { numeric: true, sensitivity: "base" });

// 每次修改 data/gpus.json 种子数据后递增，用于丢弃过期的 localStorage 快照
const SEED_VERSION = 3;
const STORAGE_KEY = "unified-gpu-table-data";
const STORAGE_VERSION_KEY = "unified-gpu-table-seed-version";

let fieldDefs = [];
let fieldOrder = [];
let defaultVisibleKeys = new Set();
let seedGpus = [];
let specDetailsById = {};
let xianyuCnyById = {};
let defaultVisibleColumns = new Set();

const state = {
  gpus: [],
  visibleColumns: new Set(),
  sortField: "vramGB",
  sortDirection: "desc",
  globalSearch: "",
  vendor: "all",
  segment: "all",
  accelType: "all",
  rules: [],
  compact: false,
};

const elements = {
  globalSearch: document.querySelector("#globalSearch"),
  segmentFilter: document.querySelector("#segmentFilter"),
  typeFilter: document.querySelector("#typeFilter"),
  vendorFilter: document.querySelector("#vendorFilter"),
  sortField: document.querySelector("#sortField"),
  sortDirectionButton: document.querySelector("#sortDirectionButton"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  addRuleButton: document.querySelector("#addRuleButton"),
  filterRules: document.querySelector("#filterRules"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  gpuTable: document.querySelector("#gpuTable"),
  columnPicker: document.querySelector("#columnPicker"),
  toggleColumnsButton: document.querySelector("#toggleColumnsButton"),
  compactToggleButton: document.querySelector("#compactToggleButton"),
  visibleCount: document.querySelector("#visibleCount"),
  maxMemory: document.querySelector("#maxMemory"),
  bestPricePerGb: document.querySelector("#bestPricePerGb"),
  latestPriceDate: document.querySelector("#latestPriceDate"),
  priceDialog: document.querySelector("#priceDialog"),
  refreshPriceButton: document.querySelector("#refreshPriceButton"),
  pricePayload: document.querySelector("#pricePayload"),
  applyPriceButton: document.querySelector("#applyPriceButton"),
  loadLocalPriceButton: document.querySelector("#loadLocalPriceButton"),
  priceResult: document.querySelector("#priceResult"),
  importDialog: document.querySelector("#importDialog"),
  importDataButton: document.querySelector("#importDataButton"),
  importPayload: document.querySelector("#importPayload"),
  applyImportButton: document.querySelector("#applyImportButton"),
  importResult: document.querySelector("#importResult"),
  exportDataButton: document.querySelector("#exportDataButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
};

const VENDOR_LOGOS = {
  nvidia: "https://www.nvidia.com/favicon.ico",
  amd: "https://www.amd.com/favicon.ico",
  intel: "https://www.intel.com/favicon.ico",
  apple: "https://www.apple.com/favicon.ico",
  google: "https://www.google.com/favicon.ico",
  huawei: "https://consumer.huawei.com/favicon.ico",
  cambricon: "https://www.cambricon.com/favicon.ico",
  moorethreads: "https://www.mthreads.com/favicon.ico",
  bitmain: "https://www.bitmain.com/favicon.ico",
  xilinx: "https://www.xilinx.com/favicon.ico",
};

const SEGMENT_CLASS = {
  "Data Center": "seg-data-center",
  "Cloud Accelerator": "seg-cloud-accelerator",
  "Workstation": "seg-workstation",
  "Desktop": "seg-desktop",
  "Integrated": "seg-integrated",
  "Inference": "seg-inference",
  "FPGA": "seg-fpga",
  "Mining": "seg-mining",
  "Many-core CPU": "seg-many-core-cpu",
};

const ACCEL_TYPE_CLASS = {
  "GPU": "type-gpu",
  "TPU": "type-tpu",
  "NPU": "type-npu",
  "FPGA": "type-fpga",
  "ASIC": "type-asic",
  "Many-core CPU": "type-many-core-cpu",
};

function init() {
  loadData();
}

async function loadData() {
  try {
    const [fieldsRes, gpusRes, specsRes, xianyuRes] = await Promise.all([
      fetch("data/gpu-fields.json"),
      fetch("data/gpus.json"),
      fetch("data/spec-details.json"),
      fetch("data/xianyu-prices.json"),
    ]);
    if (!fieldsRes.ok || !gpusRes.ok || !specsRes.ok || !xianyuRes.ok) {
      throw new Error("Failed to fetch data files");
    }
    const fieldsData = await fieldsRes.json();
    fieldDefs = fieldsData.fieldDefs;
    fieldOrder = fieldsData.fieldOrder;
    defaultVisibleKeys = new Set(fieldsData.defaultVisibleKeys);
    seedGpus = await gpusRes.json();
    specDetailsById = await specsRes.json();
    xianyuCnyById = await xianyuRes.json();
    defaultVisibleColumns = new Set(fieldDefs.filter(f => f.visible).map(f => f.key));

    state.gpus = loadStoredGpus();
    state.visibleColumns = new Set(fieldDefs.filter(f => f.visible).map(f => f.key));

    renderSelectOptions();
    renderColumnPicker();
    syncColumnPickerState();
    bindEvents();
    render();
  } catch (err) {
    console.error("Failed to load GPU data:", err);
    elements.tableBody.innerHTML = `<tr><td colspan="99" class="muted" style="text-align:center;padding:24px">GPU 数据加载失败：请确认通过静态服务器访问且 data/ 目录下文件完整。</td></tr>`;
  }
}

init();

function loadStoredGpus() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  if (!stored || storedVersion !== String(SEED_VERSION)) return seedGpus.map(normalizeGpu);
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return seedGpus.map(normalizeGpu);
    // Merge new seed GPUs that aren't already in stored data
    const storedIds = new Set(parsed.map(g => g.id));
    const newSeeds = seedGpus.filter(g => !storedIds.has(g.id)).map(normalizeGpu);
    return [...parsed.map(normalizeGpu), ...newSeeds];
  } catch {
    return seedGpus.map(normalizeGpu);
  }
}

function saveGpus() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.gpus));
  localStorage.setItem(STORAGE_VERSION_KEY, String(SEED_VERSION));
}

function normalizeGpu(gpu) {
  const normalized = { ...(specDetailsById[gpu.id] || {}), ...gpu };
  if (!normalized.acceleratorType) {
    normalized.acceleratorType = "GPU";
  }
  if (normalized.xianyu_cny == null && xianyuCnyById[gpu.id] != null) {
    normalized.xianyu_cny = xianyuCnyById[gpu.id];
  }
  for (const field of fieldDefs) {
    if (!(field.key in normalized) && !field.derived) {
      normalized[field.key] = null;
    }
  }
  normalized.id = normalized.id || slugify(normalized.model || crypto.randomUUID());
  return normalized;
}

function renderSelectOptions() {
  fillSelect(elements.segmentFilter, ["all", ...uniqueValues("segment")], "全部场景");
  fillSelect(elements.typeFilter, ["all", ...uniqueValues("acceleratorType")], "全部类型");
  fillSelect(elements.vendorFilter, ["all", ...uniqueValues("vendor")], "全部厂商");
  elements.sortField.innerHTML = fieldDefs
    .map(
      (field) =>
        `<option value="${field.key}" title="${escapeAttr(field.description || field.label)}">${field.label}</option>`,
    )
    .join("");
  elements.sortField.value = state.sortField;
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = values
    .map((value) => `<option value="${escapeAttr(value)}">${value === "all" ? allLabel : value}</option>`)
    .join("");
}

function uniqueValues(key) {
  return [...new Set(state.gpus.map((gpu) => gpu[key]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b)),
  );
}

function bindEvents() {
  elements.globalSearch.addEventListener("input", () => {
    state.globalSearch = elements.globalSearch.value.trim().toLowerCase();
    render();
  });

  elements.segmentFilter.addEventListener("change", () => {
    state.segment = elements.segmentFilter.value;
    render();
  });

  elements.typeFilter.addEventListener("change", () => {
    state.accelType = elements.typeFilter.value;
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
    state.segment = "all";
    state.accelType = "all";
    state.rules = [];
    elements.globalSearch.value = "";
    elements.vendorFilter.value = "all";
    elements.segmentFilter.value = "all";
    elements.typeFilter.value = "all";
    renderRules();
    render();
  });

  elements.addRuleButton.addEventListener("click", () => {
    state.rules.push({ field: "vramGB", op: ">=", value: "24" });
    renderRules();
    render();
  });

  elements.toggleColumnsButton.addEventListener("click", () => {
    elements.columnPicker.hidden = !elements.columnPicker.hidden;
    syncColumnPickerState();
  });

  elements.columnPicker.addEventListener("click", (event) => {
    const action = event.target.closest("[data-column-action]")?.dataset.columnAction;
    if (!action) return;
    if (action === "select-all") {
      state.visibleColumns = new Set(fieldDefs.map((field) => field.key));
    }
    if (action === "reset-default") {
      state.visibleColumns = new Set(defaultVisibleColumns);
    }
    renderColumnPicker();
    render();
  });

  elements.columnPicker.addEventListener("change", (event) => {
    const input = event.target.closest("input[type='checkbox'][value]");
    if (!input) return;
    if (input.checked) {
      state.visibleColumns.add(input.value);
    } else {
      state.visibleColumns.delete(input.value);
    }
    renderColumnPicker();
    render();
  });

  elements.compactToggleButton.addEventListener("click", () => {
    state.compact = !state.compact;
    elements.gpuTable.classList.toggle("compact", state.compact);
  });

  elements.refreshPriceButton.addEventListener("click", () => {
    elements.pricePayload.value = JSON.stringify(samplePricePayload(), null, 2);
    elements.priceResult.textContent = "";
    elements.priceDialog.showModal();
  });

  elements.applyPriceButton.addEventListener("click", () => {
    applyPriceUpdatesFromTextarea();
  });

  elements.loadLocalPriceButton.addEventListener("click", async () => {
    await loadLocalPrices();
  });

  elements.importDataButton.addEventListener("click", () => {
    elements.importPayload.value = JSON.stringify(state.gpus.slice(0, 2), null, 2);
    elements.importResult.textContent = "";
    elements.importDialog.showModal();
  });

  elements.applyImportButton.addEventListener("click", () => {
    importGpuData();
  });

  elements.exportDataButton.addEventListener("click", () => {
    exportCurrentData();
  });

  elements.exportCsvButton.addEventListener("click", () => {
    exportCsv();
  });
}

function render() {
  const rows = getFilteredRows();
  renderSummary(rows);
  renderTable(rows);
}

function getFilteredRows() {
  const filtered = state.gpus
    .map(enrichGpuRow)
    .filter(matchesGlobalSearch)
    .filter((gpu) => state.vendor === "all" || gpu.vendor === state.vendor)
    .filter((gpu) => state.segment === "all" || gpu.segment === state.segment)
    .filter((gpu) => state.accelType === "all" || gpu.acceleratorType === state.accelType)
    .filter(matchesRules);

  const field = fieldDefs.find((item) => item.key === state.sortField);
  return filtered.sort((a, b) => compareValues(a[state.sortField], b[state.sortField], field?.type));
}

function enrichGpuRow(gpu) {
  const fp16 = isUsableNumber(gpu.fp16TFLOPS) ? Number(gpu.fp16TFLOPS) : null;
  const fp32 = isUsableNumber(gpu.fp32TFLOPS) ? Number(gpu.fp32TFLOPS) : null;
  const int8 = isUsableNumber(gpu.int8TOPS) ? Number(gpu.int8TOPS) : null;
  const power = isUsableNumber(gpu.powerW) ? Number(gpu.powerW) : null;
  const price = isUsableNumber(gpu.priceUSD) ? Number(gpu.priceUSD) : null;
  const cny = isUsableNumber(gpu.xianyu_cny) ? Number(gpu.xianyu_cny) : null;
  const bw = isUsableNumber(gpu.bandwidthGBs) ? Number(gpu.bandwidthGBs) : null;
  const vram = isUsableNumber(gpu.vramGB) ? Number(gpu.vramGB) : null;
  return {
    ...gpu,
    pricePerGb: computePricePerGb(gpu),
    cnyPerGb: cny && vram ? Number((cny / vram).toFixed(2)) : null,
    fp16PerWatt: fp16 && power ? Number((fp16 / power).toFixed(3)) : null,
    fp32PerWatt: fp32 && power ? Number((fp32 / power).toFixed(3)) : null,
    fp16PerDollar: fp16 && price ? Number((fp16 / price).toFixed(4)) : null,
    fp16PerCny: fp16 && cny ? Number((fp16 / cny).toFixed(5)) : null,
    fp32PerCny: fp32 && cny ? Number((fp32 / cny).toFixed(5)) : null,
    int8PerCny: int8 && cny ? Number((int8 / cny).toFixed(5)) : null,
    bwPerDollar: bw && price ? Number((bw / price).toFixed(4)) : null,
    bwPerCny: bw && cny ? Number((bw / cny).toFixed(4)) : null,
    fp32PerDollar: fp32 && price ? Number((fp32 / price).toFixed(4)) : null,
    vramPerDollar: vram && price ? Number((vram / price).toFixed(4)) : null,
    bwPerWatt: bw && power ? Number((bw / power).toFixed(3)) : null,
    // pJ/op = TDP(W) / TFLOPS — standard chip-design energy-efficiency metric (ISSCC)
    // derivation: 1 W / 1 TFLOPS = 1 J/s / 10^12 op/s = 10^-12 J/op = 1 pJ/op
    fp16PjPerFlop: fp16 && power ? Number((power / fp16).toFixed(3)) : null,
    fp32PjPerFlop: fp32 && power ? Number((power / fp32).toFixed(3)) : null,
    int8PjPerOp: int8 && power ? Number((power / int8).toFixed(3)) : null,
  };
}

function computeColumnStats(rows, columns) {
  const stats = {};
  for (const field of columns) {
    if (field.heatmap) {
      let values;
      if (field.type === "date") {
        values = rows.map(r => r[field.key]).filter(v => v && !isNaN(new Date(v).getTime())).map(v => new Date(v).getTime());
      } else {
        values = rows.map(r => r[field.key]).filter(isUsableNumber).map(Number);
      }
      stats[field.key] = values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
    }
  }
  return stats;
}

function getHeatmapColor(percent) {
  if (percent < 50) return `rgba(255, ${Math.floor(255 * (percent / 50))}, 0, 0.2)`;
  return `rgba(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.2)`;
}

function compareValues(a, b, type) {
  const emptyA = a === null || a === undefined || a === "";
  const emptyB = b === null || b === undefined || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  let result;
  if (type === "number") {
    result = Number(a) - Number(b);
  } else if (type === "date") {
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      result = sortCollator.compare(String(a), String(b));
    } else {
      result = timeA - timeB;
    }
  } else {
    result = String(a).localeCompare(String(b), "zh-CN", { numeric: true });
  }
  return state.sortDirection === "asc" ? result : -result;
}

function matchesGlobalSearch(gpu) {
  if (!state.globalSearch) return true;
  return fieldDefs.some((field) => String(gpu[field.key] ?? "").toLowerCase().includes(state.globalSearch));
}

function matchesRules(gpu) {
  return state.rules.every((rule) => {
    const field = fieldDefs.find((item) => item.key === rule.field);
    const actual = gpu[rule.field];
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
    }
    const left = String(actual ?? "").toLowerCase();
    const right = String(expected).toLowerCase();
    if (rule.op === "=") return left === right;
    if (rule.op === "!=") return left !== right;
    return left.includes(right);
  });
}

function renderSummary(rows) {
  elements.visibleCount.textContent = rows.length.toLocaleString("zh-CN");
  const maxMemory = max(rows.map((gpu) => gpu.vramGB));
  elements.maxMemory.textContent = maxMemory ? `${formatNumber(maxMemory)} GB` : "-";
  const bestPrice = min(rows.map((gpu) => gpu.pricePerGb));
  elements.bestPricePerGb.textContent = bestPrice ? `$${formatNumber(bestPrice)}` : "-";
  const latest = rows
    .map((gpu) => gpu.priceUpdated)
    .filter(Boolean)
    .sort()
    .at(-1);
  elements.latestPriceDate.textContent = latest || "-";
}

function renderTable(rows) {
  const columns = fieldDefs.filter((field) => state.visibleColumns.has(field.key));
  const stats = computeColumnStats(rows, columns);
  elements.tableHead.innerHTML = `<tr>${columns
    .map(
      (field) =>
        `<th><button type="button" data-sort="${field.key}" title="${escapeAttr(field.description || field.label)}">${formatHeaderLabel(field.label)}${sortMark(field.key)}</button></th>`,
    )
    .join("")}</tr>`;

  if (!rows.length) {
    elements.tableBody.innerHTML = `<tr><td colspan="${columns.length || 1}" class="muted" style="text-align:center;padding:24px">没有匹配的设备；请调整搜索或筛选条件。</td></tr>`;
    return;
  }

  elements.tableBody.innerHTML = rows
    .map(
      (gpu) =>
        `<tr>${columns
          .map((field) => `<td>${formatCell(gpu, field, stats[field.key])}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  elements.tableHead.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.getAttribute("data-sort");
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

function renderRules() {
  elements.filterRules.innerHTML = state.rules
    .map(
      (rule, index) => `
        <div class="rule">
          <div>
            <label>字段</label>
            <select data-rule-field="${index}">
              ${fieldDefs.map((field) => `<option value="${field.key}" ${field.key === rule.field ? "selected" : ""}>${field.label}</option>`).join("")}
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
      `,
    )
    .join("");

  elements.filterRules.querySelectorAll("[data-rule-field]").forEach((select) => {
    select.addEventListener("change", () => {
      state.rules[Number(select.dataset.ruleField)].field = select.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-op]").forEach((select) => {
    select.addEventListener("change", () => {
      state.rules[Number(select.dataset.ruleOp)].op = select.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-value]").forEach((input) => {
    input.addEventListener("input", () => {
      state.rules[Number(input.dataset.ruleValue)].value = input.value;
      render();
    });
  });

  elements.filterRules.querySelectorAll("[data-rule-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rules.splice(Number(button.dataset.ruleRemove), 1);
      renderRules();
      render();
    });
  });
}

function renderColumnPicker() {
  const selectedCount = state.visibleColumns.size;
  const allSelected = selectedCount === fieldDefs.length;
  elements.columnPicker.innerHTML = `
    <div class="column-picker-head">
      <div>
        <p class="column-picker-title">显示列</p>
        <p class="column-picker-meta">已选 ${selectedCount} / ${fieldDefs.length}</p>
      </div>
      <div class="column-picker-tools">
        <button class="ghost-button" type="button" data-column-action="select-all" ${allSelected ? "disabled" : ""}>
          全选
        </button>
        <button class="text-button" type="button" data-column-action="reset-default">恢复默认</button>
      </div>
    </div>
    <div class="column-picker-grid">
      ${fieldDefs
        .map(
          (field) => `
            <label class="column-option" title="${escapeAttr(field.description || field.label)}">
              <input type="checkbox" value="${field.key}" ${state.visibleColumns.has(field.key) ? "checked" : ""} />
              <span>${field.label}</span>
            </label>
          `,
        )
        .join("")}
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
  return ops.map((op) => `<option value="${op}" ${op === selected ? "selected" : ""}>${labels[op]}</option>`).join("");
}


function vendorSlug(v) {
  return (v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function renderVendorTag(vendor) {
  if (!vendor) return "-";
  const slug = vendorSlug(vendor);
  const logoUrl = VENDOR_LOGOS[slug];
  const img = logoUrl
    ? `<img class="vendor-logo" src="${escapeAttr(logoUrl)}" alt="" onerror="this.style.display='none'">`
    : "";
  return `<span class="tag vendor-tag vendor-${escapeAttr(slug)}">${img}${escapeHtml(vendor)}</span>`;
}


function archClass(arch) {
  if (!arch) return "";
  const a = arch.toLowerCase();
  if (a.includes("blackwell")) return "arch-blackwell";
  if (a.includes("ada")) return "arch-ada";
  if (a.includes("hopper")) return "arch-hopper";
  if (a.includes("ampere")) return "arch-ampere";
  if (a.includes("turing")) return "arch-turing";
  if (a.includes("volta")) return "arch-volta";
  if (a.includes("pascal")) return "arch-pascal";
  if (a.includes("rdna 4") || a.includes("rdna4")) return "arch-rdna4";
  if (a.includes("rdna 3") || a.includes("rdna3")) return "arch-rdna3";
  if (a.includes("rdna 2") || a.includes("rdna2")) return "arch-rdna2";
  if (a.includes("cdna")) return "arch-cdna";
  if (a.includes("gcn")) return "arch-gcn";
  if (a.includes("tpu")) return "arch-tpu-chip";
  if (a.includes("da vinci") || a.includes("ascend")) return "arch-ascend";
  if (a.includes("knights")) return "arch-kni";
  if (a.includes("xe2") || a.includes("battlemage")) return "arch-xe2";
  if (a.includes("xe-hpg") || a.includes("alchemist") || a.startsWith("xe")) return "arch-xe";
  if (a.includes("versal") || a.includes("ultrascale")) return "arch-versal";
  if (a.includes("stratix")) return "arch-stratix";
  if (a.includes("apple gpu")) return "arch-apple-gpu";
  return "";
}

function formatCell(gpu, field, stat) {
  const value = gpu[field.key];
  // Determine numeric value for heatmap (supports both numbers and dates)
  let heatmapNum = null;
  if (field.heatmap && stat) {
    if (field.type === "date" && value && !isNaN(new Date(value).getTime())) {
      heatmapNum = new Date(value).getTime();
    } else if (isUsableNumber(value)) {
      heatmapNum = Number(value);
    }
  }
  if (heatmapNum !== null) {
    const lengthPercent = ((heatmapNum - stat.min) / (stat.max - stat.min || 1)) * 100;
    const colorPercent = field.inverseHeatmap ? 100 - lengthPercent : lengthPercent;
    const color = getHeatmapColor(colorPercent);
    let displayStr;
    if (field.type === "date") displayStr = String(value);
    else if (field.key === "priceUSD" || field.key === "msrpUSD") displayStr = `$${formatNumber(heatmapNum)}`;
    else if (field.key === "xianyu_cny") displayStr = `¥${formatNumber(heatmapNum)}`;
    else if (field.key === "pricePerGb") displayStr = `$${heatmapNum.toFixed(2)}`;
    else if (field.key === "cnyPerGb") displayStr = `¥${heatmapNum.toFixed(1)}`;
    else if (field.derived) displayStr = heatmapNum < 1 ? heatmapNum.toFixed(4) : heatmapNum.toFixed(3);
    else displayStr = formatNumber(heatmapNum);
    return `<div class="heatmap-container mini" title="${displayStr}"><div class="heatmap-bar" style="width:${Math.max(0, Math.min(100, lengthPercent)).toFixed(1)}%;background:${color}"></div><span class="heatmap-value">${escapeHtml(displayStr)}</span></div>`;
  }
  if (field.key === "model") return `<span class="model-cell">${escapeHtml(value)}</span>`;
  if (field.key === "vendor") return renderVendorTag(value);
  if (field.key === "segment") {
    const cls = SEGMENT_CLASS[value] || "";
    return value ? `<span class="tag ${cls}">${escapeHtml(value)}</span>` : "-";
  }
  if (field.key === "acceleratorType") {
    const cls = ACCEL_TYPE_CLASS[value] || "";
    return value ? `<span class="tag ${cls}">${escapeHtml(value)}</span>` : "-";
  }
  if (field.key === "architecture") {
    const cls = archClass(value);
    return value ? `<span class="tag ${cls}">${escapeHtml(value)}</span>` : "-";
  }
  if (field.key === "priceUSD") return value ? `$${formatNumber(value)}` : "-";
  if (field.key === "xianyu_cny") return value ? `¥${formatNumber(value)}` : "-";
  if (field.key === "pricePerGb") return value ? `$${formatNumber(value)}` : "-";
  if (field.key === "cnyPerGb") return value ? `¥${formatNumber(value)}` : "-";
  if (field.key === "priceUpdated") return formatPriceDate(value);
  if (field.type === "url" && value) {
    const safeUrl = sanitizeUrl(value);
    if (!safeUrl) return "-";
    return `<a class="source-link" href="${escapeAttr(safeUrl)}" target="_blank" rel="noreferrer">打开</a>`;
  }
  if (field.type === "number") return value === null || value === undefined ? "-" : formatNumber(value);
  return escapeHtml(value ?? "-");
}

function formatPriceDate(date) {
  if (!date) return "-";
  const ageDays = (Date.now() - new Date(date).getTime()) / 86400000;
  const className = ageDays > 30 ? "stale" : "fresh";
  return `<span class="${className}">${escapeHtml(date)}</span>`;
}

function sortMark(field) {
  if (field !== state.sortField) return "";
  return state.sortDirection === "asc" ? " ↑" : " ↓";
}

function formatHeaderLabel(label) {
  const parts = String(label).split(" ");
  if (parts.length < 2) return escapeHtml(label);
  return `${escapeHtml(parts.slice(0, -1).join(" "))}<span class="header-unit">${escapeHtml(parts.at(-1))}</span>`;
}

function computePricePerGb(gpu) {
  if (!gpu.priceUSD || !gpu.vramGB) return null;
  return Number((gpu.priceUSD / gpu.vramGB).toFixed(2));
}

function samplePricePayload() {
  return [
    {
      model: "NVIDIA GeForce RTX 4090",
      priceUSD: 1799,
      merchant: "manual quote",
      source: "local",
      available: true,
    },
    {
      id: "amd-rx-7900-xtx",
      priceUSD: 879,
      merchant: "manual quote",
      source: "local",
      available: true,
    },
  ];
}

async function loadLocalPrices() {
  try {
    const response = await fetch(`data/prices.json?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    elements.pricePayload.value = JSON.stringify(payload, null, 2);
    elements.priceResult.textContent = "已读取 data/prices.json，可点击应用更新。";
  } catch (error) {
    elements.priceResult.textContent = `读取失败：${error.message}\n如果通过 file:// 打开，浏览器可能阻止 fetch；可直接粘贴 JSON。`;
  }
}

function applyPriceUpdatesFromTextarea() {
  try {
    const updates = JSON.parse(elements.pricePayload.value);
    if (!Array.isArray(updates)) throw new Error("价格数据必须是数组。");
    const today = new Date().toISOString().slice(0, 10);
    let matched = 0;
    const missing = [];

    updates.forEach((update) => {
      const gpu = state.gpus.find(
        (item) => (update.id && item.id === update.id) || (update.model && item.model === update.model),
      );
      if (!gpu) {
        missing.push(update.id || update.model || "(unknown)");
        return;
      }
      matched += 1;
      gpu.priceUSD = normalizeNumber(update.priceUSD, gpu.priceUSD);
      gpu.priceUpdated = update.priceUpdated || today;
      gpu.merchant = update.merchant ?? gpu.merchant;
      gpu.priceSource = update.source ?? gpu.priceSource;
      gpu.source = update.url ?? gpu.source;
      gpu.available = update.available ?? gpu.available;
    });

    saveGpus();
    renderSelectOptions();
    render();
    elements.priceResult.textContent = `已更新 ${matched} 条价格。${missing.length ? `\n未匹配：${missing.join(", ")}` : ""}`;
  } catch (error) {
    elements.priceResult.textContent = `解析失败：${error.message}`;
  }
}

function importGpuData() {
  try {
    const incoming = JSON.parse(elements.importPayload.value);
    if (!Array.isArray(incoming)) throw new Error("导入数据必须是数组。");
    let changed = 0;
    incoming.map(normalizeGpu).forEach((gpu) => {
      const index = state.gpus.findIndex((item) => item.id === gpu.id);
      if (index >= 0) {
        state.gpus[index] = { ...state.gpus[index], ...gpu };
      } else {
        state.gpus.push(gpu);
      }
      changed += 1;
    });
    saveGpus();
    renderSelectOptions();
    render();
    elements.importResult.textContent = `已导入或更新 ${changed} 条 GPU 数据。`;
  } catch (error) {
    elements.importResult.textContent = `导入失败：${error.message}`;
  }
}

function exportCurrentData() {
  const payload = JSON.stringify(getFilteredRows(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `gpu-table-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const activeFields = fieldDefs.filter(f => state.visibleColumns.has(f.key));
  const rows = getFilteredRows();
  const escape = v => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = activeFields.map(f => escape(f.label)).join(",");
  const body = rows.map(r => activeFields.map(f => escape(r[f.key])).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gpu-table-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function min(values) {
  const clean = values.filter(isUsableNumber).map(Number);
  return clean.length ? Math.min(...clean) : null;
}

function max(values) {
  const clean = values.filter(isUsableNumber).map(Number);
  return clean.length ? Math.max(...clean) : null;
}

function isUsableNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function formatNumber(value) {
  return Number(value).toLocaleString("zh-CN", {
    maximumFractionDigits: Number(value) >= 100 ? 0 : 2,
  });
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
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
