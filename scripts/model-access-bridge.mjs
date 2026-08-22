#!/usr/bin/env node
/**
 * Local-only bridge for the model access page.
 *
 * The browser supplies a bridge token. This process reads one dotenv file,
 * probes each configured key, and never returns API keys to the browser.
 */
import { createServer } from "node:http";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || !value) continue;
  args.set(key.slice(2), value);
}

const port = Number(args.get("port") ?? process.env.MODEL_ACCESS_BRIDGE_PORT ?? 4388);
const origins = new Set((args.get("origin") ?? process.env.MODEL_ACCESS_BRIDGE_ORIGIN ?? "http://127.0.0.1:4321,http://localhost:4321")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean));
const token = args.get("token") ?? process.env.MODEL_ACCESS_BRIDGE_TOKEN;
const envPath = resolve(args.get("env") ?? process.env.MODEL_ACCESS_ENV_FILE ?? `${homedir()}/.secret/meet2ai.env`);

if (!token) {
  console.error("MODEL_ACCESS_BRIDGE_TOKEN is required. Pass --token <value> or set the environment variable.");
  process.exit(1);
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("--port must be a valid TCP port.");
  process.exit(1);
}

function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const quoted = rawValue.match(/^(["'])(.*)\1$/);
    values[key] = quoted ? quoted[2] : rawValue.replace(/\s+#.*$/, "").trim();
  }
  return values;
}

function firstDefined(values, keys) {
  return keys.map((key) => values[key]).find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}

function profileId(value, fallback) {
  const normalized = String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function addProfile(profiles, apiKey, id, name) {
  const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!trimmedKey || profiles.some((profile) => profile.apiKey === trimmedKey)) return;
  const baseId = profileId(id, `key-${profiles.length + 1}`);
  let uniqueId = baseId;
  let suffix = 2;
  while (profiles.some((profile) => profile.id === uniqueId)) uniqueId = `${baseId}-${suffix++}`;
  profiles.push({ id: uniqueId, name: String(name || `本机 Key ${profiles.length + 1}`).trim(), apiKey: trimmedKey });
}

function configuredKeys(values) {
  const profiles = [];
  const collection = firstDefined(values, ["MEET2AI_API_KEYS", "OPENAI_API_KEYS", "API_KEYS"]);
  if (collection) {
    try {
      const parsed = JSON.parse(collection);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      parsed.forEach((entry, index) => {
        if (typeof entry === "string") addProfile(profiles, entry, `key-${index + 1}`, `本机 Key ${index + 1}`);
        else if (entry && typeof entry === "object") {
          addProfile(profiles, entry.key ?? entry.apiKey ?? entry.token, entry.id ?? `key-${index + 1}`, entry.name ?? `本机 Key ${index + 1}`);
        }
      });
    } catch {
      throw new Error("MEET2AI_API_KEYS 必须是 JSON 数组。");
    }
  }
  for (const [key, value] of Object.entries(values)) {
    const match = key.match(/^(?:MEET2AI_API|OPENAI_API|API)_KEY_(.+)$/);
    if (match) addProfile(profiles, value, match[1], `本机 Key ${match[1]}`);
  }
  if (!profiles.length) addProfile(profiles, firstDefined(values, ["MEET2AI_API_KEY", "OPENAI_API_KEY", "API_KEY"]), "default", "本机 Key");
  return profiles;
}

async function loadConfig() {
  let text;
  try {
    text = await readFile(envPath, "utf8");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "unknown";
    throw new Error(`无法读取授权文件（${code}）。`);
  }
  const values = parseEnv(text);
  const endpoint = firstDefined(values, [
    "MEET2AI_BASE_URL", "MEET2AI_API_BASE", "MEET2AI_API_URL",
    "OPENAI_BASE_URL", "OPENAI_API_BASE", "API_BASE_URL", "BASE_URL",
  ]).replace(/\/+$/, "");
  return { endpoint, profiles: configuredKeys(values) };
}

function modelsUrl(endpoint) {
  if (/\/models$/i.test(endpoint)) return endpoint;
  return /\/v\d+$/i.test(endpoint) ? `${endpoint}/models` : `${endpoint}/v1/models`;
}

function modelList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) return payload.data;
  return [];
}

function detectedGroups(payload) {
  const collect = (value, groups) => {
    if (typeof value === "string" && value.trim()) groups.add(value.trim());
    if (Array.isArray(value)) value.forEach((item) => collect(item, groups));
  };
  const groups = new Set();
  const root = payload && typeof payload === "object" ? payload : {};
  collect(root.group, groups);
  collect(root.groups, groups);
  collect(root.model_group, groups);
  collect(root.model_groups, groups);
  collect(root.metadata?.group, groups);
  for (const model of modelList(payload)) {
    if (!model || typeof model !== "object") continue;
    collect(model.group, groups);
    collect(model.groups, groups);
    collect(model.model_group, groups);
    collect(model.metadata?.group, groups);
  }
  return [...groups];
}

async function requestModels(endpoint, apiKey) {
  if (!endpoint || !apiKey) throw new Error("授权文件缺少 API 端点或 API Key。");
  const upstream = await fetch(modelsUrl(endpoint), {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const body = await upstream.text();
  let payload = null;
  try { payload = JSON.parse(body); } catch { /* Models may be non-JSON on an upstream error. */ }
  return { upstream, body, payload };
}

async function probeProfile(config, profile) {
  try {
    const { upstream, payload } = await requestModels(config.endpoint, profile.apiKey);
    if (!upstream.ok) return { ...profile, endpoint: config.endpoint, available: false, group: "未探测到", groupSource: `HTTP ${upstream.status}`, modelCount: 0 };
    const groups = detectedGroups(payload);
    return {
      ...profile,
      endpoint: config.endpoint,
      available: true,
      group: groups.join(" · ") || "模型 API 未提供分组",
      groupSource: groups.length ? "模型 API 响应" : "模型 API 未提供分组字段",
      modelCount: modelList(payload).length,
    };
  } catch {
    return { ...profile, endpoint: config.endpoint, available: false, group: "未探测到", groupSource: "请求失败", modelCount: 0 };
  }
}

function publicProfile(profile) {
  const { apiKey, ...safeProfile } = profile;
  return safeProfile;
}

function sameToken(candidate) {
  if (typeof candidate !== "string") return false;
  const actual = Buffer.from(token);
  const supplied = Buffer.from(candidate);
  return actual.length === supplied.length && timingSafeEqual(actual, supplied);
}

function isAllowedOrigin(requestOrigin) {
  return typeof requestOrigin === "string" && origins.has(requestOrigin);
}

function sendJson(response, status, body, requestOrigin) {
  if (isAllowedOrigin(requestOrigin)) response.setHeader("Access-Control-Allow-Origin", requestOrigin);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.statusCode = status;
  response.end(JSON.stringify(body));
}

function sendUpstream(response, upstream, body, requestOrigin) {
  response.statusCode = upstream.status;
  if (isAllowedOrigin(requestOrigin)) response.setHeader("Access-Control-Allow-Origin", requestOrigin);
  response.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(body);
}

const server = createServer(async (request, response) => {
  const requestOrigin = request.headers.origin;
  if (requestOrigin && !isAllowedOrigin(requestOrigin)) {
    sendJson(response, 403, { error: "Origin is not allowed." }, requestOrigin);
    return;
  }
  if (request.method === "OPTIONS") {
    if (isAllowedOrigin(requestOrigin)) {
      response.setHeader("Access-Control-Allow-Origin", requestOrigin);
      response.setHeader("Access-Control-Allow-Headers", "X-Model-Access-Token, Content-Type");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    response.statusCode = 204;
    response.end();
    return;
  }
  if (!sameToken(request.headers["x-model-access-token"])) {
    sendJson(response, 401, { error: "Bridge authorization failed." }, requestOrigin);
    return;
  }

  try {
    const config = await loadConfig();
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/profiles") {
      const profiles = [];
      for (const profile of config.profiles) profiles.push(publicProfile(await probeProfile(config, profile)));
      sendJson(response, 200, { profiles, source: "本机授权文件" }, requestOrigin);
      return;
    }
    if (request.method === "GET" && url.pathname === "/config") {
      const profile = config.profiles[0];
      sendJson(response, 200, {
        id: profile?.id ?? "default",
        name: profile?.name ?? "本机 Key",
        group: "授权后由模型 API 探测",
        endpoint: config.endpoint,
        keyConfigured: Boolean(profile?.apiKey),
        source: "本机授权文件",
      }, requestOrigin);
      return;
    }
    const routeMatch = url.pathname.match(/^\/profiles\/([^/]+)\/models$/);
    const requestedId = routeMatch ? decodeURIComponent(routeMatch[1]) : config.profiles[0]?.id;
    if (request.method === "POST" && (url.pathname === "/models" || routeMatch)) {
      const profile = config.profiles.find((item) => item.id === requestedId);
      if (!profile) {
        sendJson(response, 404, { error: "找不到该本机 API Key 配置。" }, requestOrigin);
        return;
      }
      const { upstream, body } = await requestModels(config.endpoint, profile.apiKey);
      sendUpstream(response, upstream, body, requestOrigin);
      return;
    }
    sendJson(response, 404, { error: "Not found." }, requestOrigin);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Bridge failure." }, requestOrigin);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Model access bridge: http://127.0.0.1:${port}`);
  console.log(`Allowed origins: ${[...origins].join(", ")}`);
  console.log(`Authorized file: ${envPath}`);
  console.log("The bridge never returns API keys to the browser.");
});
