import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { newGpus, extraGpus } from "./new-gpus.mjs";

const GPU_FILE = new URL("../data/gpus.json", import.meta.url);
const gpus = JSON.parse(readFileSync(GPU_FILE, "utf8"));
const byId = new Map(gpus.map((g) => [g.id, g]));

const SCHEMA_KEYS = [
  "id", "model", "vendor", "segment", "acceleratorType", "architecture", "gpuDie",
  "releaseDate", "processNode", "cudaCores", "tensorCores", "rtCores", "computeUnits",
  "vramGB", "memoryType", "memoryBusBit", "memoryClockGbps", "bandwidthGBs",
  "fp32TFLOPS", "fp16TFLOPS", "bf16TFLOPS", "fp8TFLOPS", "int8TOPS",
  "powerW", "pcie", "nvlinkGBs", "msrpUSD", "priceUSD", "priceCNY", "priceUpdated",
  "availability", "softwareStack", "merchant", "source", "notes",
];

let added = 0, skipped = 0;
for (const entry of [...newGpus, ...extraGpus]) {
  if (byId.has(entry.id)) { skipped++; continue; }
  const full = {};
  for (const key of SCHEMA_KEYS) full[key] = entry[key] ?? null;
  if (full.merchant === null) full.merchant = "";
  gpus.push(full);
  byId.set(entry.id, full);
  added++;
}

writeFileSync(GPU_FILE, JSON.stringify(gpus, null, 2) + "\n");
mkdirSync(new URL("../data/goofish/", import.meta.url), { recursive: true });
console.log(`total=${gpus.length} added=${added} skippedDup=${skipped}`);
