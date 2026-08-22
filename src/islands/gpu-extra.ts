/**
 * GPU page extra functionality: localStorage seed merging,
 * price update dialog, data import/export.
 * This island runs alongside FlatTable on the GPU page only.
 */
export {};

import { dataUrl } from "../lib/data-url";

function q<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

async function init(): Promise<void> {
  // Wait for FlatTable to potentially finish loading
  // We hook into existing DOM elements
  await waitForData();
  bindDialogEvents();
}

function waitForData(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const tbody = q("tableBody");
      if (tbody && tbody.innerHTML.trim().length > 0) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

function bindDialogEvents() {
  // Price dialog
  q("refreshPriceButton")?.addEventListener("click", () => {
    q<HTMLDialogElement>("priceDialog")?.showModal();
  });

  q("loadLocalPriceButton")?.addEventListener("click", loadLocalPrices);
  q("applyPriceButton")?.addEventListener("click", applyPriceUpdates);

  // Import dialog
  q("importDataButton")?.addEventListener("click", () => {
    q<HTMLDialogElement>("importDialog")?.showModal();
  });

  q("applyImportButton")?.addEventListener("click", importGpuData);

  // Export data
  q("exportDataButton")?.addEventListener("click", exportGpuData);
}

async function loadLocalPrices() {
  const payload = q<HTMLTextAreaElement>("pricePayload");
  const result = q("priceResult");
  if (!payload || !result) return;
  try {
    const response = await fetch(`${dataUrl("prices.json")}?ts=${Date.now()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    payload.value = JSON.stringify(data, null, 2);
    result.textContent = "已读取 data/prices.json，可点击应用更新。";
  } catch (error) {
    result.textContent = `读取失败：${(error as Error).message}\n如果通过 file:// 打开，浏览器可能阻止 fetch；可直接粘贴 JSON。`;
  }
}

function applyPriceUpdates() {
  const payload = q<HTMLTextAreaElement>("pricePayload");
  const result = q("priceResult");
  if (!payload || !result) return;
  try {
    const updates = JSON.parse(payload.value);
    if (!Array.isArray(updates)) throw new Error("价格数据必须是数组。");
    const today = new Date().toISOString().slice(0, 10);

    // We need to find and update the data in the FlatTable's state
    // Since FlatTable loads data from fetch, we dispatch custom events
    // to communicate between islands
    const event = new CustomEvent("gpu-price-update", {
      detail: { updates, today, matched: 0, missing: [] as string[] },
    });
    document.dispatchEvent(event);

    // Listen for response
    document.addEventListener("gpu-price-update-result", ((e: CustomEvent) => {
      result.textContent = `已更新 ${e.detail.matched} 条价格。${e.detail.missing.length ? `\n未匹配：${e.detail.missing.join(", ")}` : ""}`;
    }) as EventListener, { once: true });

    result.textContent = "正在应用更新...";
  } catch (error) {
    result.textContent = `解析失败：${(error as Error).message}`;
  }
}

function importGpuData() {
  const payload = q<HTMLTextAreaElement>("importPayload");
  const result = q("importResult");
  if (!payload || !result) return;
  try {
    const incoming = JSON.parse(payload.value);
    if (!Array.isArray(incoming)) throw new Error("导入数据必须是数组。");

    const event = new CustomEvent("gpu-data-import", {
      detail: { data: incoming },
    });
    document.dispatchEvent(event);

    document.addEventListener("gpu-data-import-result", ((e: CustomEvent) => {
      result.textContent = `已导入 ${e.detail.count} 条记录。`;
    }) as EventListener, { once: true });

    result.textContent = "正在导入...";
  } catch (error) {
    result.textContent = `解析失败：${(error as Error).message}`;
  }
}

function exportGpuData() {
  document.dispatchEvent(new CustomEvent("gpu-data-export"));
}

// Boot
init();
