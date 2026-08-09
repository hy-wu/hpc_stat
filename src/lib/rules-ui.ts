/**
 * DOM-based rule editor UI.
 * Replaces the duplicated renderRules() from 4 JS files (~55 lines × 4).
 */
import type { FieldDef } from "../types/fields";
import type { FilterRule } from "../types/common";
import { operatorOptions, opsForType } from "../types/common";
import { escapeHtml, escapeAttr } from "./escape";

export interface RulesUiHooks {
  onRulesChanged: (rules: FilterRule[]) => void;
}

/** Render the rule editor into the given container. */
export function renderRules(
  container: HTMLElement,
  rules: FilterRule[],
  fields: FieldDef[],
  hooks: RulesUiHooks,
): void {
  container.innerHTML = rules
    .map(
      (rule, index) => {
        const fieldType =
          fields.find((f) => f.key === rule.field)?.type ?? "text";
        return `
      <div class="rule">
        <div>
          <label>字段</label>
          <select data-rule-field="${index}">
            ${fields.map((f) => `<option value="${escapeAttr(f.key)}" ${f.key === rule.field ? "selected" : ""}>${escapeHtml(f.label)}</option>`).join("")}
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
      </div>`;
      },
    )
    .join("");

  container
    .querySelectorAll<HTMLSelectElement>("[data-rule-field]")
    .forEach((select) => {
      select.addEventListener("change", () => {
        const rule = rules[Number(select.dataset.ruleField)];
        rule.field = select.value;
        // Reset op if it doesn't fit the new field type
        const newType =
          fields.find((f) => f.key === rule.field)?.type ?? "text";
        if (!opsForType(newType).includes(rule.op)) {
          rule.op = newType === "number" ? ">=" : "contains";
        }
        hooks.onRulesChanged(rules);
      });
    });

  container
    .querySelectorAll<HTMLSelectElement>("[data-rule-op]")
    .forEach((select) => {
      select.addEventListener("change", () => {
        rules[Number(select.dataset.ruleOp)].op = select.value as FilterRule["op"];
        hooks.onRulesChanged(rules);
      });
    });

  container
    .querySelectorAll<HTMLInputElement>("[data-rule-value]")
    .forEach((input) => {
      input.addEventListener("input", () => {
        rules[Number(input.dataset.ruleValue)].value = input.value;
        hooks.onRulesChanged(rules);
      });
    });

  container
    .querySelectorAll<HTMLButtonElement>("[data-rule-remove]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        rules.splice(Number(button.dataset.ruleRemove), 1);
        hooks.onRulesChanged(rules);
      });
    });
}
