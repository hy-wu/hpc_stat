/**
 * sync-benchmarks.mjs
 * Ensures every model/tool referenced by data/benchmarks.json exists as a stub
 * in data/models.json / data/agent-tools.json. Idempotent; safe to re-run
 * after adding new leaderboard records.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const save = (p, data) => {
  const prev = readFileSync(join(root, p), "utf8");
  const nl = prev.includes("\r\n") ? "\r\n" : "\n";
  writeFileSync(join(root, p), JSON.stringify(data, null, 2).replace(/\n/g, nl) + nl);
};

const bench = load("data/benchmarks.json");
const models = load("data/models.json");
const tools = load("data/agent-tools.json");

const norm = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const slug = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const modelKeys = new Set();
for (const m of models) {
  for (const v of [m.id, m.name]) if (v) modelKeys.add(norm(v));
  for (const a of m.aliases ?? []) modelKeys.add(norm(a));
}
const toolIds = new Set(tools.map((t) => t.id));

const benchUrl = (id) => bench.benchmarks[id]?.url ?? "";

let modelsAdded = 0;
for (const id of new Set(bench.records.map((r) => r.model))) {
  if (modelKeys.has(norm(id))) continue;
  const vendor = bench.records.find((r) => r.model === id)?.vendor ?? "";
  const stub = {
    id: slug(id) || "unknown-model",
    name: id,
    vendor,
    notes: `榜单评测收录模型（stub，待补数据）`,
    verification: {
      status: "unverified",
      checkedAt: bench.updated,
      verifiedFields: [],
      sources: [{ label: "benchmark leaderboards", url: benchUrl(bench.records.find((r) => r.model === id)?.bench ?? "") }],
    },
  };
  models.push(stub);
  modelKeys.add(norm(id));
  modelKeys.add(norm(stub.id));
  modelsAdded++;
}

let toolsAdded = 0;
for (const tid of new Set(bench.records.map((r) => r.tool).filter(Boolean))) {
  if (toolIds.has(tid)) continue;
  const meta = bench.tools[tid] ?? {};
  tools.push({
    id: tid,
    name: meta.name ?? tid,
    vendor: meta.vendor ?? "",
    categoryTags: meta.type === "eval-harness" ? ["评测框架"] : ["Vibe Coding CLI"],
    notes: `榜单评测使用的 agent/harness（stub，待补数据）`,
    verification: { status: "unverified", checkedAt: bench.updated, verifiedFields: [], sources: [] },
  });
  toolIds.add(tid);
  toolsAdded++;
}

save("data/models.json", models);
save("data/agent-tools.json", tools);
console.log(`benchmarks: ${bench.records.length} records; +${modelsAdded} model stubs, +${toolsAdded} tool stubs`);
