/**
 * Column picker DOM component.
 * Replaces the duplicated renderColumnPicker / syncColumnPickerState
 * from 4 JS files (~50 lines × 4).
 */
import { escapeHtml, escapeAttr } from "./escape";

export interface ColumnPickerItem {
  key: string;
  label: string;
  /** Optional data-coverage bar (models page shows fill %). */
  coveragePercent?: number;
  coverageColor?: string;
  countLabel?: string;
}

export interface ColumnPickerHooks {
  onSelectionChanged: (selected: Set<string>) => void;
}

interface PickerRuntime {
  items: ColumnPickerItem[];
  selected: Set<string>;
  hooks: ColumnPickerHooks;
}

const runtimeByContainer = new WeakMap<HTMLElement, PickerRuntime>();
const boundContainers = new WeakSet<HTMLElement>();

export function renderColumnPicker(
  container: HTMLElement,
  items: ColumnPickerItem[],
  selected: Set<string>,
  hooks: ColumnPickerHooks,
): void {
  runtimeByContainer.set(container, { items, selected, hooks });
  const allSelected = selected.size === items.length;
  container.innerHTML = `
    <div class="column-picker-head">
      <div>
        <span class="column-picker-title">显示列</span>
        <span class="column-picker-meta">已选 ${selected.size} / ${items.length}</span>
      </div>
      <div class="column-picker-tools">
        <button class="ghost-button" type="button" data-column-action="select-all" ${allSelected ? "disabled" : ""}>全选</button>
        <button class="text-button" type="button" data-column-action="reset-default">恢复默认</button>
      </div>
    </div>
    <div class="column-picker-grid">
      ${items
        .map((item) => {
          const bar =
            item.coveragePercent != null
              ? `<div class="cp-bar" style="width:${item.coveragePercent}%;background:${item.coverageColor ?? ""}"></div>`
              : "";
          const count = item.countLabel
            ? `<span class="column-count">${escapeHtml(item.countLabel)}</span>`
            : "";
          return `
          <label class="column-option">
            ${bar}
            <input type="checkbox" value="${escapeAttr(item.key)}" ${selected.has(item.key) ? "checked" : ""}>
            <span>${escapeHtml(item.label)}</span>
            ${count}
          </label>`;
        })
        .join("")}
    </div>`;

  if (boundContainers.has(container)) return;
  boundContainers.add(container);

  container.addEventListener("click", (e) => {
    const runtime = runtimeByContainer.get(container);
    if (!runtime) return;
    const action = (e.target as HTMLElement).closest("[data-column-action]")
      ?.getAttribute("data-column-action");
    if (action === "select-all") {
      runtime.hooks.onSelectionChanged(new Set(runtime.items.map((i) => i.key)));
    }
    if (action === "reset-default") {
      runtime.hooks.onSelectionChanged(new Set());
    }
  });

  container.addEventListener("change", (e) => {
    const runtime = runtimeByContainer.get(container);
    if (!runtime) return;
    const input = (e.target as HTMLElement).closest(
      "input[type='checkbox']",
    ) as HTMLInputElement | null;
    if (!input) return;
    const next = new Set(runtime.selected);
    if (input.checked) next.add(input.value);
    else next.delete(input.value);
    runtime.hooks.onSelectionChanged(next);
  });
}

/** Update the toggle button text. */
export function syncColumnPickerState(
  button: HTMLElement,
  selectedCount: number,
  total: number,
  label?: string,
): void {
  const hiddenCount = Math.max(0, total - selectedCount);
  const prefix = label ?? "列设置";
  button.textContent = `${prefix} (已选 ${selectedCount} / 未选 ${hiddenCount})`;
}
