import { dataUrl } from "../lib/data-url";
import { escapeHtml } from "../lib/escape";

interface AccessProfile {
  id: string;
  name: string;
  endpoint: string;
  group: string;
  notes: string;
  rememberKey: boolean;
  lastRefreshed?: string;
  connection?: "direct" | "bridge";
  bridgeUrl?: string;
  bridgeConfigId?: string;
}

interface BridgeConfig {
  id: string;
  name: string;
  group: string;
  endpoint: string;
  source: string;
  available: boolean;
  groupSource: string;
  modelCount: number;
}

interface BridgeProfilesPayload {
  profiles: BridgeConfig[];
  source: string;
}

interface CatalogModel {
  id: string;
  name?: string;
  vendor?: string;
  contextWindow?: string;
  multimodal?: string;
}

interface RemoteModel {
  id: string;
  created?: number;
  owned_by?: string;
  object?: string;
  [key: string]: unknown;
}

interface ViewModel {
  id: string;
  name: string;
  vendor: string;
  contextWindow: string;
  multimodal: string;
  group: string;
  source: string;
  searchText: string;
}

const PROFILES_KEY = "hpc-stat-model-access-profiles-v1";
const ACTIVE_PROFILE_KEY = "hpc-stat-model-access-active-profile-v1";
const MODELS_KEY_PREFIX = "hpc-stat-model-access-models-v1:";
const SESSION_KEY_PREFIX = "hpc-stat-model-access-session-key-v1:";
const PERSISTENT_KEY_PREFIX = "hpc-stat-model-access-persistent-key-v1:";
const BRIDGE_URL_KEY = "hpc-stat-model-access-bridge-url-v1";
const BRIDGE_TOKEN_PREFIX = "hpc-stat-model-access-bridge-token-v1:";

const state = {
  profiles: [] as AccessProfile[],
  activeProfileId: "",
  catalog: [] as CatalogModel[],
  models: [] as ViewModel[],
  isLoading: false,
};

function q<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

function getInputValue(id: string): string {
  return q<HTMLInputElement>(id)?.value.trim() ?? "";
}

function getActiveProfile(): AccessProfile | undefined {
  return state.profiles.find((profile) => profile.id === state.activeProfileId);
}

function isBridgeProfile(profile: AccessProfile | undefined): profile is AccessProfile & { connection: "bridge"; bridgeUrl: string } {
  return profile?.connection === "bridge" && Boolean(profile.bridgeUrl);
}

function makeId(): string {
  return crypto.randomUUID?.() ?? `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}

function getModelsUrl(endpoint: string): string {
  const normalized = normalizeEndpoint(endpoint);
  return /\/models$/i.test(normalized)
    ? normalized
    : /\/v\d+$/i.test(normalized)
      ? `${normalized}/models`
      : `${normalized}/v1/models`;
}

function loadProfiles(): AccessProfile[] {
  try {
    const value = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter(isProfile) : [];
  } catch {
    return [];
  }
}

function isProfile(value: unknown): value is AccessProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<AccessProfile>;
  return typeof profile.id === "string" && typeof profile.name === "string" && typeof profile.endpoint === "string";
}

function persistProfiles(): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(state.profiles));
  localStorage.setItem(ACTIVE_PROFILE_KEY, state.activeProfileId);
}

function getKey(profile: AccessProfile): string {
  try {
    return sessionStorage.getItem(`${SESSION_KEY_PREFIX}${profile.id}`)
      ?? localStorage.getItem(`${PERSISTENT_KEY_PREFIX}${profile.id}`)
      ?? "";
  } catch {
    return "";
  }
}

function saveKey(profile: AccessProfile, key: string): void {
  const sessionKey = `${SESSION_KEY_PREFIX}${profile.id}`;
  const persistentKey = `${PERSISTENT_KEY_PREFIX}${profile.id}`;
  sessionStorage.removeItem(sessionKey);
  localStorage.removeItem(persistentKey);
  if (!key) return;
  if (profile.rememberKey) localStorage.setItem(persistentKey, key);
  else sessionStorage.setItem(sessionKey, key);
}

function clearKey(profile: AccessProfile): void {
  sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${profile.id}`);
  localStorage.removeItem(`${PERSISTENT_KEY_PREFIX}${profile.id}`);
}

function bridgeTokenKey(bridgeUrl: string): string {
  return `${BRIDGE_TOKEN_PREFIX}${normalizeEndpoint(bridgeUrl)}`;
}

function getBridgeToken(bridgeUrl: string): string {
  try {
    return sessionStorage.getItem(bridgeTokenKey(bridgeUrl)) ?? "";
  } catch {
    return "";
  }
}

function loadCachedModels(profile: AccessProfile): ViewModel[] {
  try {
    const cached = JSON.parse(sessionStorage.getItem(`${MODELS_KEY_PREFIX}${profile.id}`) ?? "[]");
    return Array.isArray(cached) ? cached.filter(isViewModel) : [];
  } catch {
    return [];
  }
}

function isViewModel(value: unknown): value is ViewModel {
  return Boolean(value && typeof value === "object" && typeof (value as ViewModel).id === "string");
}

function saveCachedModels(profile: AccessProfile, models: ViewModel[]): void {
  try {
    sessionStorage.setItem(`${MODELS_KEY_PREFIX}${profile.id}`, JSON.stringify(models));
  } catch {
    // A model list is disposable cache; a full storage quota should not block the UI.
  }
}

function showMessage(message: string, tone: "error" | "info" = "info"): void {
  const box = q("accessMessage");
  if (!box) return;
  box.textContent = message;
  box.className = `access-message ${tone}`;
  box.hidden = false;
}

function hideMessage(): void {
  const box = q("accessMessage");
  if (box) box.hidden = true;
}

function renderProfiles(): void {
  const list = q("profileList");
  const select = q<HTMLSelectElement>("activeProfileSelect");
  if (!list || !select) return;

  if (!state.profiles.length) {
    list.innerHTML = `<p class="empty-profiles">尚无配置。添加端点和 Key 后即可查询。</p>`;
    select.innerHTML = `<option value="">未选择</option>`;
    return;
  }

  list.innerHTML = state.profiles.map((profile) => {
    const active = profile.id === state.activeProfileId;
    const keyState = isBridgeProfile(profile)
      ? "本机文件"
      : getKey(profile) ? (profile.rememberKey ? "已保存密钥" : "会话密钥") : "未设置密钥";
    return `<button class="profile-row${active ? " active" : ""}" type="button" data-profile-id="${escapeHtml(profile.id)}" aria-pressed="${active}">
      <span class="profile-row-name">${escapeHtml(profile.name)}</span>
      <span class="profile-row-meta">${escapeHtml(profile.group || "未分组")} · ${keyState}</span>
    </button>`;
  }).join("");

  select.innerHTML = state.profiles.map((profile) => (
    `<option value="${escapeHtml(profile.id)}"${profile.id === state.activeProfileId ? " selected" : ""}>${escapeHtml(profile.name)}</option>`
  )).join("");
}

function fillForm(profile?: AccessProfile): void {
  const form = q<HTMLFormElement>("profileForm");
  if (!form) return;
  form.reset();
  q<HTMLInputElement>("profileId")!.value = profile?.id ?? "";
  q<HTMLInputElement>("profileName")!.value = profile?.name ?? "";
  q<HTMLInputElement>("profileEndpoint")!.value = profile?.endpoint ?? "";
  const groupInput = q<HTMLInputElement>("profileGroup")!;
  groupInput.value = profile?.group ?? "";
  groupInput.disabled = isBridgeProfile(profile);
  q<HTMLInputElement>("profileNotes")!.value = profile?.notes ?? "";
  q<HTMLInputElement>("profileKey")!.value = profile && !isBridgeProfile(profile) ? getKey(profile) : "";
  q<HTMLInputElement>("rememberKey")!.checked = profile?.rememberKey ?? false;
  q("deleteProfileButton")!.hidden = !profile;
}

function renderActiveMeta(): void {
  const profile = getActiveProfile();
  const meta = q("activeProfileMeta");
  const status = q("accessStatus");
  if (!meta || !status) return;

  if (!profile) {
    meta.textContent = "选择左侧配置后查询。";
    status.textContent = "尚未选择配置";
    return;
  }
  const keyState = isBridgeProfile(profile)
    ? "密钥由本机文件保管"
    : getKey(profile) ? (profile.rememberKey ? "密钥已在本机保存" : "密钥仅在当前会话") : "尚未填入密钥";
  meta.textContent = `${profile.group || "未分组"} · ${profile.endpoint}`;
  status.textContent = `${profile.name} · ${keyState}`;
}

function renderSummary(): void {
  const profile = getActiveProfile();
  const remoteCount = q("remoteModelCount");
  const matchCount = q("catalogMatchCount");
  const refreshed = q("lastRefreshed");
  if (!remoteCount || !matchCount || !refreshed) return;
  remoteCount.textContent = String(state.models.length || "-");
  matchCount.textContent = state.models.length ? String(state.models.filter((model) => model.source.includes("目录补全")).length) : "-";
  refreshed.textContent = profile?.lastRefreshed ? new Date(profile.lastRefreshed).toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "-";
}

function renderModels(): void {
  const tbody = q("accessTableBody");
  const search = getInputValue("modelAccessSearch").toLocaleLowerCase();
  if (!tbody) return;
  const models = state.models.filter((model) => !search || model.searchText.includes(search));
  if (!getActiveProfile()) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">选择或新建一个 API 配置。</td></tr>`;
    return;
  }
  if (!models.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">${state.models.length ? "没有匹配的模型。" : "尚未查询到模型。"}</td></tr>`;
    return;
  }
  tbody.innerHTML = models.map((model) => `<tr>
    <td><strong>${escapeHtml(model.name)}</strong><small>${escapeHtml(model.id)}</small></td>
    <td>${escapeHtml(model.vendor || "-")}</td>
    <td>${escapeHtml(model.contextWindow || "-")}</td>
    <td>${escapeHtml(model.multimodal || "-")}</td>
    <td>${escapeHtml(model.group || "未分组")}</td>
    <td>${escapeHtml(model.source)}</td>
  </tr>`).join("");
}

function renderAll(): void {
  renderProfiles();
  renderActiveMeta();
  renderSummary();
  renderModels();
}

function selectProfile(profileId: string): void {
  state.activeProfileId = profileId;
  const profile = getActiveProfile();
  state.models = profile ? loadCachedModels(profile) : [];
  persistProfiles();
  fillForm(profile);
  hideMessage();
  renderAll();
}

function normalizedId(value: string): string {
  return value.toLocaleLowerCase().replace(/[._:-]/g, "-").replace(/\/+/, "/");
}

function findCatalogModel(id: string): CatalogModel | undefined {
  const normalized = normalizedId(id);
  return state.catalog.find((model) => normalizedId(model.id) === normalized)
    ?? state.catalog.find((model) => normalized.endsWith(normalizedId(model.id)) || normalizedId(model.id).endsWith(normalized));
}

function toViewModels(remoteModels: RemoteModel[], profile: AccessProfile): ViewModel[] {
  return remoteModels
    .filter((model) => typeof model.id === "string" && model.id.trim())
    .map((model) => {
      const catalog = findCatalogModel(model.id);
      const origin = isBridgeProfile(profile) ? "本机桥接" : "远端 API";
      const source = catalog ? `${origin} · 目录补全` : origin;
      const name = catalog?.name || model.id.split("/").at(-1) || model.id;
      const vendor = catalog?.vendor || (typeof model.owned_by === "string" ? model.owned_by : "");
      return {
        id: model.id,
        name,
        vendor,
        contextWindow: catalog?.contextWindow || "",
        multimodal: catalog?.multimodal || "",
        group: profile.group,
        source,
        searchText: `${model.id} ${name} ${vendor} ${catalog?.multimodal || ""}`.toLocaleLowerCase(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

function extractModels(payload: unknown): RemoteModel[] {
  if (Array.isArray(payload)) return payload as RemoteModel[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: RemoteModel[] }).data;
  }
  throw new Error("响应中没有可识别的模型数组（预期是 { data: [...] }）。");
}

async function refreshModels(): Promise<void> {
  const profile = getActiveProfile();
  if (!profile || state.isLoading) return;
  const key = getKey(profile);
  const bridgeToken = isBridgeProfile(profile) ? getBridgeToken(profile.bridgeUrl) : "";
  if (!isBridgeProfile(profile) && !key) {
    showMessage("请先在左侧填入 API Key 并保存，再查询模型。", "error");
    return;
  }
  if (isBridgeProfile(profile) && !bridgeToken) {
    showMessage("请先在“本机密钥文件”区域授权桥接服务。", "error");
    return;
  }
  state.isLoading = true;
  const button = q<HTMLButtonElement>("refreshModelsButton");
  if (button) {
    button.disabled = true;
    button.textContent = "查询中...";
  }
  hideMessage();
  try {
    const response = isBridgeProfile(profile)
      ? await fetch(`${normalizeEndpoint(profile.bridgeUrl)}/profiles/${encodeURIComponent(profile.bridgeConfigId ?? "default")}/models`, {
          method: "POST",
          headers: { "X-Model-Access-Token": bridgeToken, Accept: "application/json" },
        })
      : await fetch(getModelsUrl(profile.endpoint), {
          headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
        });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`接口返回的不是 JSON（HTTP ${response.status}）。`);
    }
    if (!response.ok) {
      const detail = payload && typeof payload === "object" && "error" in payload
        ? JSON.stringify((payload as { error: unknown }).error).slice(0, 180)
        : "";
      throw new Error(`HTTP ${response.status}${detail ? `：${detail}` : ""}`);
    }
    state.models = toViewModels(extractModels(payload), profile);
    profile.lastRefreshed = new Date().toISOString();
    saveCachedModels(profile, state.models);
    persistProfiles();
    showMessage(`已读取 ${state.models.length} 个模型。模型列来自当前 API 配置返回的 /models 接口。`);
    renderAll();
  } catch (error) {
    const detail = error instanceof TypeError
      ? "浏览器无法连接该端点。请检查地址、网络与 CORS；不支持跨域的服务需要本地代理。"
      : (error as Error).message;
    showMessage(`查询失败：${detail}`, "error");
  } finally {
    state.isLoading = false;
    if (button) {
      button.disabled = false;
      button.textContent = "查询模型";
    }
  }
}

async function connectBridge(): Promise<void> {
  const bridgeUrl = normalizeEndpoint(getInputValue("bridgeUrl"));
  const token = getInputValue("bridgeToken");
  const status = q("bridgeStatus");
  const button = q<HTMLButtonElement>("connectBridgeButton");
  if (!bridgeUrl || !token) {
    if (status) status.textContent = "请输入桥接地址与桥接令牌。";
    return;
  }
  if (button) {
    button.disabled = true;
    button.textContent = "连接中...";
  }
  try {
    const response = await fetch(`${bridgeUrl}/profiles`, {
      headers: { "X-Model-Access-Token": token, Accept: "application/json" },
    });
    const payload = await response.json() as BridgeProfilesPayload | { error?: string };
    if (!response.ok || !("profiles" in payload) || !Array.isArray(payload.profiles) || !payload.profiles.length) {
      throw new Error("error" in payload ? payload.error || "授权文件没有可用的 API Key。" : "授权文件没有可用的 API Key。");
    }
    const configs = (payload as BridgeProfilesPayload).profiles;
    const profiles: AccessProfile[] = configs.map((config) => ({
      id: `bridge:${bridgeUrl}:${config.id}`,
      name: config.name,
      endpoint: config.endpoint,
      group: config.group,
      notes: `${config.groupSource} · ${config.available ? `可访问 ${config.modelCount} 个模型` : "该 Key 无法访问模型接口"}`,
      rememberKey: false,
      connection: "bridge",
      bridgeUrl,
      bridgeConfigId: config.id,
    }));
    sessionStorage.setItem(bridgeTokenKey(bridgeUrl), token);
    localStorage.setItem(BRIDGE_URL_KEY, bridgeUrl);
    const bridgePrefix = `bridge:${bridgeUrl}:`;
    state.profiles = [...state.profiles.filter((item) => !item.id.startsWith(bridgePrefix)), ...profiles];
    const active = profiles.find((profile) => configs.find((config) => config.id === profile.bridgeConfigId)?.available) ?? profiles[0];
    state.activeProfileId = active.id;
    state.models = loadCachedModels(active);
    persistProfiles();
    if (status) status.textContent = `已逐把探测 ${profiles.length} 个本机 Key；API Key 未离开本机文件。`;
    q<HTMLInputElement>("bridgeToken")!.value = "";
    hideMessage();
    fillForm(active);
    renderAll();
  } catch (error) {
    const detail = error instanceof TypeError
      ? `浏览器无法连接桥接服务。当前页面来源是 ${window.location.origin}；请确认桥接正在运行，并使用 MODEL_ACCESS_BRIDGE_ORIGIN='${window.location.origin}' 重启它。`
      : (error instanceof Error ? error.message : "无法授权桥接服务。");
    if (status) status.textContent = `连接失败：${detail}`;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "授权";
    }
  }
}

function saveProfile(event: SubmitEvent): void {
  event.preventDefault();
  const id = getInputValue("profileId") || makeId();
  const current = state.profiles.find((profile) => profile.id === id);
  const profile: AccessProfile = {
    id,
    name: getInputValue("profileName"),
    endpoint: normalizeEndpoint(getInputValue("profileEndpoint")),
    group: getInputValue("profileGroup"),
    notes: getInputValue("profileNotes"),
    rememberKey: q<HTMLInputElement>("rememberKey")?.checked ?? false,
    lastRefreshed: current?.lastRefreshed,
    connection: current?.connection ?? "direct",
    bridgeUrl: current?.bridgeUrl,
    bridgeConfigId: current?.bridgeConfigId,
  };
  const key = getInputValue("profileKey");
  if (current) state.profiles = state.profiles.map((item) => item.id === id ? profile : item);
  else state.profiles = [...state.profiles, profile];
  saveKey(profile, key);
  state.activeProfileId = id;
  state.models = loadCachedModels(profile);
  persistProfiles();
  showMessage(`已保存“${profile.name}”。`);
  fillForm(profile);
  renderAll();
}

function deleteProfile(): void {
  const profile = getActiveProfile();
  if (!profile || !confirm(`删除配置“${profile.name}”？本机保存的密钥和会话缓存也会移除。`)) return;
  clearKey(profile);
  sessionStorage.removeItem(`${MODELS_KEY_PREFIX}${profile.id}`);
  state.profiles = state.profiles.filter((item) => item.id !== profile.id);
  state.activeProfileId = state.profiles[0]?.id ?? "";
  state.models = state.profiles[0] ? loadCachedModels(state.profiles[0]) : [];
  persistProfiles();
  fillForm(getActiveProfile());
  showMessage("配置已删除。");
  renderAll();
}

function bindEvents(): void {
  q("profileForm")?.addEventListener("submit", saveProfile);
  q("newProfileButton")?.addEventListener("click", () => {
    state.activeProfileId = "";
    state.models = [];
    fillForm();
    hideMessage();
    renderAll();
    q<HTMLInputElement>("profileName")?.focus();
  });
  q("deleteProfileButton")?.addEventListener("click", deleteProfile);
  q("clearSessionKeyButton")?.addEventListener("click", () => {
    const profile = getActiveProfile();
    if (!profile) return;
    clearKey(profile);
    q<HTMLInputElement>("profileKey")!.value = "";
    showMessage("当前配置的 API Key 已从本机清除。");
    renderAll();
  });
  q("toggleKeyButton")?.addEventListener("click", () => {
    const input = q<HTMLInputElement>("profileKey");
    const button = q<HTMLButtonElement>("toggleKeyButton");
    if (!input || !button) return;
    input.type = input.type === "password" ? "text" : "password";
    button.textContent = input.type === "password" ? "显示" : "隐藏";
  });
  q("refreshModelsButton")?.addEventListener("click", refreshModels);
  q("connectBridgeButton")?.addEventListener("click", connectBridge);
  q<HTMLSelectElement>("activeProfileSelect")?.addEventListener("change", (event) => selectProfile((event.target as HTMLSelectElement).value));
  q("modelAccessSearch")?.addEventListener("input", renderModels);
  q("profileList")?.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-profile-id]");
    if (target) selectProfile(target.dataset.profileId ?? "");
  });
}

async function init(): Promise<void> {
  state.profiles = loadProfiles();
  state.activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY) ?? state.profiles[0]?.id ?? "";
  if (!getActiveProfile()) state.activeProfileId = state.profiles[0]?.id ?? "";
  q<HTMLInputElement>("bridgeUrl")!.value = localStorage.getItem(BRIDGE_URL_KEY) ?? "http://127.0.0.1:4388";
  try {
    const response = await fetch(dataUrl("models.json"));
    state.catalog = response.ok ? await response.json() as CatalogModel[] : [];
  } catch {
    state.catalog = [];
  }
  const profile = getActiveProfile();
  state.models = profile ? loadCachedModels(profile) : [];
  fillForm(profile);
  bindEvents();
  renderAll();
}

init();
