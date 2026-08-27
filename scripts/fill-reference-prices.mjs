#!/usr/bin/env node
/**
 * Fill remaining empty prices with MSRP or known market reference prices.
 * Only for models where goofish search genuinely can't find data:
 * - Cloud-only (TPUs): not on second-hand market → use MSRP
 * - Apple Silicon: not sold as standalone → use Mac pricing
 * - Very new DC cards: not on second-hand market → use MSRP
 * - Domestic Chinese cards: not commonly on goofish → leave null
 * - FPGA: not commonly on goofish → leave null
 */
import { readFileSync, writeFileSync } from "node:fs";

const gpus = JSON.parse(readFileSync("data/gpus.json", "utf8"));
const CNY = 7.15;
const TODAY = "2026-08-22";

// Known reference prices for models that can't be found on goofish
// These are MSRP or well-known market prices, converted to CNY
const REFERENCE = {
  // NVIDIA DC cards — use MSRP
  "nvidia-b200-sxm":            { usd: 30000, note: "MSRP参考$30000，未上市二手" },
  "nvidia-h200-sxm":            { usd: 25000, note: "MSRP参考$25000，未上市二手" },
  "nvidia-b300-sxm":            { usd: 35000, note: "MSRP参考$35000，新品未上市" },
  "nvidia-b100-sxm":            { usd: 30000, note: "MSRP参考$30000" },
  "nvidia-gh200-141gb":         { usd: 40000, note: "MSRP参考$40000+" },
  "nvidia-h100-nvl-94gb":       { usd: 30000, note: "MSRP参考$30000" },
  "nvidia-h200-nvl-141gb":      { usd: 40000, note: "MSRP参考$40000+" },
  // NVIDIA DC — known market price (not on goofish)
  "nvidia-h100-pcie-80gb":     { cny: 120000, note: "市场参考价¥120000(PCIe版)" },
  "nvidia-h800-sxm-80gb":      { cny: 100000, note: "市场参考价¥100000(中国特供版)" },
  "nvidia-h20-96gb":           { cny: 90000, note: "市场参考价¥90000(中国特供版)" },
  "nvidia-a800-sxm-80gb":      { cny: 65000, note: "市场参考价¥65000(中国特供版)" },
  "nvidia-a100-pcie-40gb":     { cny: 35000, note: "市场参考价¥35000" },
  "nvidia-a100-pcie-80gb":     { cny: 55000, note: "市场参考价¥55000" },
  "nvidia-a100-sxm4-40gb":     { cny: 30000, note: "市场参考价¥30000" },
  "nvidia-a100-sxm4-80gb":     { cny: 60000, note: "市场参考价¥60000(SXM版)" },
  "nvidia-l40s":               { cny: 45000, note: "市场参考价¥45000" },
  "nvidia-l40":                { cny: 35000, note: "市场参考价¥35000" },
  "nvidia-l20":                { cny: 40000, note: "市场参考价¥40000(中国版)" },
  "nvidia-l4":                 { cny: 8000, note: "市场参考价¥8000" },
  "nvidia-t4":                 { cny: 2500, note: "市场参考价¥2500" },
  "nvidia-a10":                { cny: 6000, note: "市场参考价¥6000(24G版)" },
  "nvidia-a2":                 { cny: 2000, note: "市场参考价¥2000" },
  "nvidia-a30":                { cny: 12000, note: "市场参考价¥12000" },
  "nvidia-a16":                { cny: 15000, note: "市场参考价¥15000" },
  // AMD DC
  "amd-instinct-mi300x":       { cny: 120000, note: "市场参考价¥120000" },
  "amd-instinct-mi325x":       { cny: 130000, note: "市场参考价¥130000" },
  "amd-instinct-mi300a":       { cny: 100000, note: "市场参考价¥100000" },
  "amd-instinct-mi250":        { cny: 30000, note: "市场参考价¥30000" },
  "amd-instinct-mi210":        { cny: 15000, note: "市场参考价¥15000(64G)" },
  "amd-instinct-mi50":         { cny: 2000, note: "市场参考价¥2000" },
  "amd-instinct-mi60":         { cny: 3000, note: "市场参考价¥3000" },
  // V100 32GB SXM2 — rare, use market price
  "nvidia-v100-sxm2-32gb":     { cny: 5000, note: "市场参考价¥5000(32G SXM2稀有)" },
  // Intel
  "intel-gaudi-3":             { cny: 25000, note: "市场参考价¥25000" },
  // Domestic — leave null (not publicly priced)
  // Apple — use Mac pricing (GPU portion estimated)
  "apple-m3-max-40gpu":        { usd: 2199, note: "Mac参考价$2199(整机)" },
  "apple-m4-max-40gpu":        { usd: 2799, note: "Mac参考价$2799(整机)" },
  "apple-m2-ultra-76gpu":     { usd: 3999, note: "Mac参考价$3999(整机)" },
  "apple-m4-ultra-76gpu":     { usd: 3999, note: "Mac参考价$3999+(预估)" },
  "apple-m1-ultra-64gpu":     { usd: 2999, note: "Mac参考价$2999(整机)" },
  "apple-m4-pro-20gpu":       { usd: 1599, note: "Mac参考价$1599(整机)" },
  "apple-m4-10gpu":            { usd: 799, note: "Mac参考价$799(整机)" },
  // Workstation — use MSRP
  "amd-radeon-pro-w7900":      { usd: 3999, note: "MSRP $3999" },
  "amd-radeon-pro-w7500":      { usd: 999, note: "MSRP $999" },
  "nvidia-rtx-pro-6000-blackwell": { usd: 10000, note: "MSRP参考$10000+" },
  "nvidia-rtx-a6000":          { usd: 4500, note: "MSRP $4500" },
  "nvidia-titan-rtx":          { usd: 2499, note: "MSRP $2499(已停产)" },
  // FPGA — leave null (specialized market)
  // Cloud TPU — leave null (cloud-only)
};

let filled = 0;
let left = 0;

for (const gpu of gpus) {
  if (gpu.priceUSD != null || gpu.priceCNY != null) continue;
  const ref = REFERENCE[gpu.id];
  if (ref) {
    if (ref.cny) {
      gpu.priceCNY = ref.cny;
      gpu.priceUSD = Math.round(ref.cny / CNY);
    } else if (ref.usd) {
      gpu.priceUSD = ref.usd;
      gpu.priceCNY = Math.round(ref.usd * CNY);
    }
    gpu.priceUpdated = TODAY;
    gpu.merchant = "reference";
    // Remove old goofish tag, add reference note
    gpu.notes = (gpu.notes || "").replace(/闲鱼2026-08-22(?:中位价|前列聚簇价|核验修正)[^)]*\)\s*/g, "").trim();
    gpu.notes = (gpu.notes + " " + ref.note).trim();
    filled++;
  } else {
    left++;
  }
}

writeFileSync("data/gpus.json", JSON.stringify(gpus, null, 1) + "\n");
console.log(`Filled: ${filled} with reference prices, ${left} still empty (no market data)`);
