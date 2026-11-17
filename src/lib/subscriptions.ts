export interface Subscription {
  id: string;
  category: string;
  vendor: string;
  product: string;
  tier: string;
  priceText: string;
  monthlyCny?: number | null;
  quotaText?: string;
  q5h?: number | null;
  qWeek?: number | null;
  qMonth?: number | null;
  quotaUnit?: string;
  families?: string[];
  familiesGuess?: string[];
  models?: string;
  verified?: string;
  asOf?: string;
}

export interface SubscriptionSelection {
  rows: Subscription[];
  allRows: Subscription[];
}

export const SUBSCRIPTION_FAMILIES = [
  ["doubao", "豆包·Seed"], ["qwen", "千问 Qwen"], ["glm", "GLM 智谱"],
  ["kimi", "Kimi"], ["deepseek", "DeepSeek"], ["minimax", "MiniMax"],
  ["ernie", "文心 ERNIE"], ["hunyuan", "混元"], ["spark", "星火"],
  ["skywork", "天工"], ["mimo", "MiMo"], ["claude", "Claude"],
  ["gpt", "GPT"], ["gemini", "Gemini"], ["thirdparty", "第三方聚合"], ["auto", "Auto 路由"],
];

export function productKey(row: Subscription): string {
  return JSON.stringify([row.category, row.vendor, row.product]);
}

export function coverageKey(row: Subscription): string {
  const confirmed = new Set(row.families ?? []);
  const guessed = new Set((row.familiesGuess ?? []).filter((key) => !confirmed.has(key)));
  return JSON.stringify([[...confirmed].sort(), [...guessed].sort()]);
}

export function groupCoverage(rows: Subscription[]): Subscription[][] {
  const groups = new Map<string, Subscription[]>();
  for (const row of rows) {
    const key = JSON.stringify([productKey(row), coverageKey(row)]);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}
