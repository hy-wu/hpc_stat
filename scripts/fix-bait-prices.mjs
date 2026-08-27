#!/usr/bin/env node
/**
 * Fix bait prices and adjust slightly-off cluster medians in data/gpus.json.
 * - Null out 询价/桥接器/坏卡/服务器出租 prices that the analyzer mistakenly picked up
 * - Adjust M60 and K80 to more accurate cluster medians based on raw data review
 */
import { readFileSync, writeFileSync } from "node:fs";

const gpus = JSON.parse(readFileSync("data/gpus.json", "utf8"));
const TODAY = "2026-08-22";
const CNY = 7.15;

// id → action: "null" | { cny, note }
const fixes = {
  "nvidia-b200-sxm":             { action: "null", reason: "询价/排单钓饵价已清除" },
  "nvidia-h200-sxm":             { action: "null", reason: "询价/整机钓饵价已清除" },
  "nvidia-b300-sxm":            { action: "null", reason: "询价/排单钓饵价已清除" },
  "nvidia-v100-sxm2-32gb":      { action: "null", reason: "匹配到V100 16G结果，32GB真实价无法获取" },
  "nvidia-a10":                 { action: "null", reason: "¥2480为坏卡摆设件价，真实A10价¥4000+" },
  "amd-instinct-mi210":        { action: "null", reason: "¥3999为桥接器价，非显卡本体" },
  "metax-c500-pcie":           { action: "null", reason: "搜索结果均为钓饵/无关 listings" },
  "huawei-ascend-910b2":       { action: "null", reason: "¥500为服务器出租价，非单卡" },
  "moore-threads-mtt-s3000":   { action: "null", reason: "询价/预售钓饵价已清除" },
  "moore-threads-mtt-s4000":   { action: "null", reason: "询价钓饵价已清除" },
  "cambricon-mlu370-x8":       { action: "null", reason: "¥999为桥接器价，非加速卡本体" },
  "intel-xeon-e5-2666-v3":    { action: "null", reason: "单样本待核验价已清除" },
  "nvidia-cmp-90hx":           { action: "null", reason: "无有效搜索结果" },
  "amd-radeon-bc-160":         { action: "null", reason: "无有效搜索结果" },
  "amd-radeon-bc-250":         { action: "null", reason: "无有效搜索结果" },
  "amd-threadripper-pro-3995wx": { action: "null", reason: "无 goofish 数据" },
  // Price adjustments based on raw data review
  "nvidia-tesla-m60":          { action: "set", cny: 390, note: "闲鱼2026-08-22核验修正¥390(样本5:320-409)" },
  "nvidia-tesla-k80":          { action: "set", cny: 400, note: "闲鱼2026-08-22核验修正¥400(样本6:300-500)" },
};

let nulled = 0, adjusted = 0;

for (const gpu of gpus) {
  const fix = fixes[gpu.id];
  if (!fix) continue;

  // Remove old goofish tag from notes
  gpu.notes = (gpu.notes || "").replace(/闲鱼2026-08-22(?:中位价|前列聚簇价)[^)]*\)\s*/g, "").trim();

  if (fix.action === "null") {
    gpu.priceCNY = null;
    gpu.priceUSD = null;
    gpu.priceUpdated = null;
    gpu.merchant = "";
    gpu.notes = (gpu.notes + " " + fix.reason).trim();
    nulled++;
  } else if (fix.action === "set") {
    gpu.priceCNY = fix.cny;
    gpu.priceUSD = Math.round(fix.cny / CNY);
    gpu.priceUpdated = TODAY;
    gpu.merchant = "goofish";
    gpu.notes = (gpu.notes + " " + fix.note).trim();
    adjusted++;
  }
}

writeFileSync("data/gpus.json", JSON.stringify(gpus, null, 1) + "\n");
console.log(`Fixed: ${nulled} nulled, ${adjusted} adjusted, total ${gpus.length} models`);
