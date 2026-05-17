import { readFile } from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const modelsPath = path.join(rootDir, "data", "models.json");
const args = new Set(process.argv.slice(2));

const removedModelIds = new Set([
  "gpt-5.3-codex",
  "gpt-5.2-codex",
  "gpt-5.2",
  "gpt-5-mini",
  "gpt-4.1",
  "gemini-2.5-ultra",
  "qwen-3.0-ultra",
  "llama-4-500b",
  "llama-4-100b",
  "mistral-large-3",
  "yi-2.0-lightning",
  "glm-5-9b",
]);

const sourceChecks = {
  "claude-opus-4.7": {
    url: "https://platform.claude.com/docs/en/about-claude/models/overview",
    required: ["Claude Opus 4.7", "claude-opus-4-7", "$5 / input MTok", "$25 / output MTok", "Context window 1M tokens"],
  },
  "claude-sonnet-4.6": {
    url: "https://platform.claude.com/docs/en/about-claude/models/overview",
    required: ["Claude Sonnet 4.6", "claude-sonnet-4-6", "$3 / input MTok", "$15 / output MTok", "Context window 1M tokens"],
  },
  "claude-haiku-4.5": {
    url: "https://platform.claude.com/docs/en/about-claude/models/overview",
    required: ["Claude Haiku 4.5", "claude-haiku-4-5", "$1 / input MTok", "$5 / output MTok", "200k tokens"],
  },
  "gpt-5.5": {
    url: "https://developers.openai.com/api/docs/models",
    required: ["GPT-5.5", "Model ID gpt-5.5", "$5 / Input MTok", "$30 / Output MTok", "Context window"],
  },
  "gpt-5.4": {
    url: "https://developers.openai.com/api/docs/models",
    required: ["GPT-5.4", "Model ID gpt-5.4", "$2.50 / Input MTok", "$15 / Output MTok", "Context window"],
  },
  "gpt-5.4-mini": {
    url: "https://developers.openai.com/api/docs/models",
    required: ["GPT-5.4 mini", "Model ID gpt-5.4-mini", "$0.75 / Input MTok", "$4.50 / Output MTok", "400K"],
  },
  "deepseek-v4-pro": {
    url: "https://api-docs.deepseek.com/quick_start/pricing",
    required: ["deepseek-v4-pro", "$0.435", "$0.003625", "$0.87", "1M"],
  },
  "deepseek-v4-flash": {
    url: "https://api-docs.deepseek.com/quick_start/pricing",
    required: ["deepseek-v4-flash", "$0.14", "$0.0028", "$0.28", "1M"],
  },
  "gemini-2.5-pro": {
    url: "https://ai.google.dev/gemini-api/docs/pricing",
    required: ["Gemini 2.5 Pro", "gemini-2.5-pro", "$1.25", "$10.00", "$0.125"],
  },
  "gemini-2.5-flash": {
    url: "https://ai.google.dev/gemini-api/docs/pricing",
    required: ["Gemini 2.5 Flash", "gemini-2.5-flash", "$0.30", "$2.50", "$0.03"],
  },
  "llama-4-maverick": {
    url: "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
    required: ["Llama 4 Maverick", "17 billion active parameter model with 128 experts", "400 billion total parameters"],
  },
  "llama-4-scout": {
    url: "https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
    required: ["Llama 4 Scout", "17 billion active parameter model with 16 experts", "10 million tokens"],
  },
};

const deepseekPrompt = `你是严格的数据核验器。只允许根据 SOURCE_TEXT 中逐字出现或可直接定位的内容判断。
任务：给定 model_id、model_name、字段和值，返回 JSON。
规则：
1. 只有 source_text 明确包含模型名/ID，并明确包含对应字段值，verified 才能为 true。
2. 不要用常识、记忆、推断或“看起来合理”补全。
3. 如果找不到，返回 verified:false，并在 reason 中写“source text does not state it”或具体缺失字段。
4. 输出必须是 JSON，不要 Markdown。`;

const raw = await readFile(modelsPath, "utf8");
const models = JSON.parse(raw);

const report = {
  modelCount: models.length,
  blockedIdsPresent: models.map((model) => model.id).filter((id) => removedModelIds.has(id)),
  missingVerification: models.filter((model) => model.verification?.status !== "verified").map((model) => model.id),
  missingCatalogChecks: models.filter((model) => !sourceChecks[model.id]).map((model) => model.id),
  online: [],
};

if (args.has("--online") || args.has("--deepseek")) {
  for (const model of models) {
    const check = sourceChecks[model.id];
    if (!check) continue;
    const result = await verifyAgainstSource(model, check, args.has("--deepseek"));
    report.online.push(result);
  }
}

console.log(JSON.stringify(report, null, 2));

if (report.blockedIdsPresent.length || report.missingVerification.length || report.missingCatalogChecks.length) {
  process.exitCode = 1;
}

async function verifyAgainstSource(model, check, useDeepSeek) {
  try {
    const response = await fetch(check.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = normalize(await response.text());
    const missing = check.required.filter((needle) => !text.includes(normalize(needle)));
    if (!missing.length) return { id: model.id, status: "verified", url: check.url };
    if (!useDeepSeek) return { id: model.id, status: "unverified", url: check.url, missing };
    return verifyWithDeepSeek(model, text.slice(0, 18000), missing, check.url);
  } catch (error) {
    return { id: model.id, status: "error", url: check.url, error: error.message };
  }
}

async function verifyWithDeepSeek(model, sourceText, missing, url) {
  const env = await readEnvFile();
  const apiKey = env.DEEPSEEK_API_KEY;
  const baseUrl = env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  if (!apiKey) {
    return { id: model.id, status: "error", url, error: "DEEPSEEK_API_KEY is not set" };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: deepseekPrompt },
        {
          role: "user",
          content: JSON.stringify({
            model_id: model.id,
            model_name: model.name,
            expected_missing_terms: missing,
            source_url: url,
            source_text: sourceText,
          }),
        },
      ],
    }),
  });

  if (!response.ok) return { id: model.id, status: "error", url, error: `DeepSeek HTTP ${response.status}` };
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  try {
    return { id: model.id, status: "llm-reviewed", url, result: JSON.parse(content) };
  } catch {
    return { id: model.id, status: "error", url, error: "DeepSeek returned non-JSON content" };
  }
}

async function readEnvFile() {
  try {
    const envText = await readFile(path.join(rootDir, ".env"), "utf8");
    return Object.fromEntries(
      envText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
}

function normalize(value) {
  return String(value).replace(/\s+/g, " ").trim();
}
