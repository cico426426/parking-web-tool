import { buildAuthHeaders, clearRememberedAccess, handleUnauthorized, rememberAccess, tokenFromPin } from "../auth/access.js";
import { getCityName } from "../parking/city.js";
import { rankRecommendations } from "../parking/rank.js";
import { searchDestinations } from "../search/geocode.js";
import { destinationFromUrl, isGoogleMapsUrl, parseGoogleMapsCoordinates } from "../search/google-maps-link.js";
import { parseSharedDestination } from "../search/share-target.js";

const DEFAULT_DESTINATION = {
  id: "manual-destination",
  name: "中壢火車站",
  lat: 24.9536,
  lng: 121.2251,
};

const state = {
  data: globalThis.PARKING_APP_DATA ?? null,
  destination: globalThis.PARKING_APP_DATA?.destination ?? DEFAULT_DESTINATION,
  apiBaseUrl: globalThis.PARKING_API_BASE_URL ?? "",
};

const elements = {};

function queryElements() {
  elements.status = document.querySelector("[data-status]");
  elements.recommendations = document.querySelector("[data-recommendations]");
  elements.searchInput = document.querySelector("[data-search-input]");
  elements.searchButton = document.querySelector("[data-search-button]");
  elements.pasteButton = document.querySelector("[data-paste-button]");
  elements.suggestions = document.querySelector("[data-suggestions]");
  elements.attribution = document.querySelector("[data-attribution]");
  elements.authPanel = document.querySelector("[data-auth-panel]");
  elements.authForm = document.querySelector("[data-auth-form]");
  elements.lockButton = document.querySelector("[data-lock-button]");
}

function formatAvailability(availability) {
  if (!availability || availability.status === "unknown") return "空位未知";
  if (availability.status === "full") return "已滿";
  if (availability.status === "closed") return "未開放";
  return `剩 ${availability.availableSpaces} 位`;
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "距離未知";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function setStatus(message, type = "info") {
  elements.status.textContent = message;
  elements.status.classList.toggle("warn", type === "warn");
}

export function recommendationHtml(recommendation) {
  const lot = recommendation.parkingLot;
  const availability = formatAvailability(recommendation.availability);
  const distance = formatDistance(recommendation.distanceMeters);
  const minutes = recommendation.timeEstimateMinutes
    ? `${recommendation.timeEstimateMinutes} 分鐘估計`
    : "時間未知";
  const reasons = recommendation.reasons
    .map((reason) => `<span class="reason">${escapeHtml(reason)}</span>`)
    .join("");

  return `
    <article class="recommendation">
      <div class="rec-header">
        <span class="rank">${recommendation.rank}</span>
        <div>
          <h2 class="rec-title">${escapeHtml(lot.name)}</h2>
          <p class="meta">${availability} · ${distance} · ${minutes}</p>
        </div>
      </div>
      <div class="reason-row">${reasons}</div>
      <div class="nav-row">
        <a class="nav-button" href="${recommendation.navigationUrl}" target="_blank" rel="noreferrer">導航過去</a>
        <span class="coords">${Number(lot.lat).toFixed(5)}, ${Number(lot.lng).toFixed(5)}</span>
      </div>
    </article>
  `;
}

function renderRecommendations(payload) {
  const recommendations = payload?.recommendations ?? [];
  if (!recommendations.length) {
    elements.recommendations.innerHTML = "";
    setStatus("找不到可用的停車推薦，請換一個目的地或稍後再試。", "warn");
    return;
  }

  elements.recommendations.innerHTML = recommendations.map(recommendationHtml).join("");
  const warning = warningText(payload.warnings ?? []);
  setStatus(warning || `${payload.destination?.name ?? "目的地"} 附近建議停這 ${recommendations.length} 個。`, warning ? "warn" : "info");
}

function warningText(warnings) {
  const cityMismatch = warnings.find((warning) => warning?.startsWith?.("SNAPSHOT_CITY_MISMATCH:"));
  if (cityMismatch) {
    const [, snapshotCity, destinationCity] = cityMismatch.split(":");
    return `目前使用${getCityName(snapshotCity)}快照資料試算，你選的是${getCityName(destinationCity)}。部署 Worker 後會改用目的地城市的即時資料。`;
  }
  if (warnings.includes("UNKNOWN_AVAILABILITY")) return "部分停車場沒有即時空位，請出發前再確認。";
  if (warnings.includes("ALL_FULL")) return "附近停車場都顯示已滿，以下只作備案參考。";
  if (warnings.includes("NO_USABLE_PARKING")) return "目前沒有可用停車資料。";
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function searchDestination() {
  const query = elements.searchInput.value.trim();
  if (!query) return;

  if (isGoogleMapsUrl(query)) {
    await loadGoogleMapsDestination(query);
    return;
  }

  if (!state.apiBaseUrl) {
    await searchSnapshotDestination(query);
    return;
  }

  const response = await fetch(`${state.apiBaseUrl}/api/search?q=${encodeURIComponent(query)}`, {
    headers: buildAuthHeaders(),
  });

  if (handleUnauthorized(response)) {
    showAuthPanel();
    return;
  }

  const payload = await response.json();
  if (!response.ok || !payload.results?.length) {
    setStatus(payload.error?.message ?? "找不到目的地，請換個關鍵字。", "warn");
    return;
  }

  renderSuggestions(payload.results, payload.attribution);
}

async function loadGoogleMapsDestination(query) {
  const direct = destinationFromUrl(query);
  if (direct) {
    await loadRecommendationsForDestination(direct);
    return;
  }

  if (!state.apiBaseUrl) {
    setStatus("Google Maps 短網址需要部署 Worker 才能展開。你可以改貼展開後的完整網址，或先用文字搜尋地點。", "warn");
    return;
  }

  const params = new URLSearchParams({ url: query });
  const response = await fetch(`${state.apiBaseUrl}/api/resolve-map-url?${params}`, {
    headers: buildAuthHeaders(),
  });

  if (handleUnauthorized(response)) {
    showAuthPanel();
    return;
  }

  const payload = await response.json();
  if (!response.ok || !payload.destination) {
    setStatus(payload.error?.message ?? "無法解析這個 Google Maps 連結。", "warn");
    return;
  }

  await loadRecommendationsForDestination(payload.destination);
}

async function searchSnapshotDestination(query) {
  try {
    setStatus("搜尋目的地...");
    const payload = await searchDestinations(query, { limit: 5 });
    if (!payload.results.length) {
      setStatus("找不到目的地，請換個關鍵字。", "warn");
      return;
    }
    renderSuggestions(payload.results, payload.attribution);
  } catch {
    const preset = findPresetDestination(query);
    if (!preset) {
      setStatus("目的地搜尋暫時無法使用。你可以試試「中原大學」或「中壢火車站」。", "warn");
      return;
    }
    renderSuggestions([preset], "內建常用地點");
  }
}

function renderSuggestions(results, attribution = "") {
  elements.suggestions.hidden = false;
  elements.suggestions.innerHTML = results
    .map(
      (result, index) => `
        <button class="suggestion" type="button" data-suggestion-index="${index}">
          ${escapeHtml(result.label)}
          <small>${escapeHtml(result.secondaryLabel ?? "")}</small>
        </button>
      `,
    )
    .join("");
  elements.attribution.textContent = attribution;

  elements.suggestions.querySelectorAll("[data-suggestion-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const result = results[Number(button.dataset.suggestionIndex)];
      loadRecommendationsForDestination({
        name: result.label,
        lat: result.lat,
        lng: result.lng,
        cityKey: result.cityKey,
        source: "search",
      });
    });
  });
}

async function loadRecommendationsForDestination(destination) {
  if (!state.apiBaseUrl) {
    loadSnapshotRecommendations(destination);
    return;
  }

  const params = new URLSearchParams({
    lat: destination.lat,
    lng: destination.lng,
    limit: "3",
  });
  if (destination.cityKey) params.set("city", destination.cityKey);
  const response = await fetch(`${state.apiBaseUrl}/api/recommendations?${params}`, {
    headers: buildAuthHeaders(),
  });

  if (handleUnauthorized(response)) {
    showAuthPanel();
    return;
  }

  const payload = await response.json();
  if (!response.ok) {
    setStatus(payload.error?.message ?? "停車資料暫時無法載入。", "warn");
    return;
  }

  renderRecommendations(payload);
}

function loadSnapshotRecommendations(destination) {
  if (!state.data?.parkingLots?.length) {
    setStatus("目前的 data.json 沒有完整停車場資料，請重新執行 npm run dev。", "warn");
    return;
  }

  const recommendations = rankRecommendations(
    { id: destination.name, ...destination },
    state.data.parkingLots,
    state.data.availability ?? {},
    { limit: 3 },
  );
  renderRecommendations({
    ...state.data,
    destination,
    recommendations,
    warnings: buildWarnings(recommendations, destination),
  });
  elements.suggestions.hidden = true;
}

function buildWarnings(recommendations, destination = {}) {
  const warnings = [];
  if (destination.cityKey && destination.cityKey !== state.data?.city) {
    warnings.push(`SNAPSHOT_CITY_MISMATCH:${state.data.city}:${destination.cityKey}`);
  }
  if (!recommendations.length) warnings.push("NO_USABLE_PARKING");
  if (recommendations.some((item) => item.availability.status === "unknown")) {
    warnings.push("UNKNOWN_AVAILABILITY");
  }
  if (recommendations.length > 0 && recommendations.every((item) => item.availability.status === "full")) {
    warnings.push("ALL_FULL");
  }
  return warnings;
}

function findPresetDestination(query) {
  const normalized = query.trim().toLowerCase();
  const presets = [
    { label: "中壢火車站", secondaryLabel: "桃園市中壢區", lat: 24.9536, lng: 121.2251, cityKey: "Taoyuan" },
    { label: "中原大學", secondaryLabel: "桃園市中壢區", lat: 24.9575, lng: 121.2408, cityKey: "Taoyuan" },
    { label: "桃園高鐵站", secondaryLabel: "桃園市中壢區", lat: 25.0137, lng: 121.2149, cityKey: "Taoyuan" },
  ];
  return presets.find((item) => item.label.toLowerCase().includes(normalized) || normalized.includes(item.label.toLowerCase()));
}

function showAuthPanel() {
  elements.authPanel.hidden = false;
  elements.lockButton.hidden = true;
}

function hideAuthPanel() {
  elements.authPanel.hidden = true;
  elements.lockButton.hidden = false;
}

function bindEvents() {
  elements.searchButton.addEventListener("click", searchDestination);
  elements.pasteButton.addEventListener("click", pasteDestination);
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchDestination();
  });
  elements.authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const pin = new FormData(elements.authForm).get("pin");
    rememberAccess(tokenFromPin(pin));
    hideAuthPanel();
  });
  elements.lockButton.addEventListener("click", () => {
    clearRememberedAccess();
    showAuthPanel();
  });
}

async function pasteDestination() {
  if (!navigator.clipboard?.readText) {
    setStatus("這個瀏覽器不能直接讀剪貼簿，請手動貼到目的地欄位。", "warn");
    elements.searchInput.focus();
    return;
  }

  const text = (await navigator.clipboard.readText()).trim();
  if (!text) {
    setStatus("剪貼簿沒有可用內容。", "warn");
    return;
  }

  elements.searchInput.value = text;
  await searchDestination();
}

function applySharedInput() {
  const shared = parseSharedDestination(globalThis.location?.search ?? "");
  if (!shared) return;

  if (shared.coordinates) {
    const cityKey = parseGoogleMapsCoordinates(shared.query)
      ? destinationFromUrl(shared.query)?.cityKey
      : null;
    loadRecommendationsForDestination({
      name: "分享的位置",
      lat: shared.coordinates.lat,
      lng: shared.coordinates.lng,
      cityKey,
      source: "share",
    });
    return;
  }

  elements.searchInput.value = shared.query;
  setStatus("已帶入分享內容，請確認目的地後搜尋。");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      // The app works without PWA support.
    });
  }
}

async function loadSnapshotData() {
  if (state.data) return true;

  try {
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) return false;
    state.data = await response.json();
    state.destination = state.data.destination ?? state.destination;
    return true;
  } catch {
    return false;
  }
}

async function init() {
  queryElements();
  bindEvents();
  registerServiceWorker();
  const hasSnapshot = await loadSnapshotData();

  if (state.apiBaseUrl && !buildAuthHeaders().Authorization) {
    showAuthPanel();
  } else {
    hideAuthPanel();
  }

  if (hasSnapshot) {
    renderRecommendations(state.data);
  } else if (state.apiBaseUrl) {
    setStatus("已連線即時模式。解鎖後貼上 Google Maps 連結、地址或店名開始查詢。");
  } else {
    setStatus("尚未載入 data.json。請先執行 node --env-file=.env fetch-parking.mjs。", "warn");
  }

  applySharedInput();
}

if (typeof document !== "undefined") {
  init();
}
