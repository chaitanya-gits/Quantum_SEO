const historyKey = "ai-search-history";
const profilePrefsKey = "quair-profile-preferences";
const settingsPrefsKey = "quair-settings";
const defaultSearchPlaceholder = "Search anything";
const translationBatchSize = 60;

const topLanguageOptions = [
  "en-US", "en-GB", "en-IN", "hi", "bn", "te", "mr", "ta", "ur", "gu", "kn",
  "ml", "pa", "or", "as", "es", "fr", "de", "it", "pt", "ru",
  "zh", "ja", "ko", "ar", "tr", "nl", "pl", "sv", "no", "da",
  "fi", "el", "he", "th", "vi", "id", "ms", "tl", "uk", "ro",
  "hu", "cs", "sk", "sl", "hr", "sr", "bg", "lt", "lv", "et",
  "fa", "sw", "am", "so", "zu", "xh", "af", "is", "ga", "cy",
  "mt", "sq", "mk", "bs", "kk", "uz", "ky", "tg", "mn", "ne",
  "si", "my", "km", "lo", "ka", "hy", "az", "be", "eu", "gl",
  "ca", "eo", "la", "yo", "ig", "ha", "ceb", "jv", "su", "ps",
  "sd", "sa", "mi", "haw", "sm", "st", "sn", "ny", "lb", "fo",
];

const topRegionOptions = [
  "IN", "US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "NL",
  "BR", "MX", "AR", "CO", "CL", "PE", "VE", "ZA", "NG", "EG",
  "KE", "ET", "MA", "DZ", "TN", "GH", "UG", "TZ", "CM", "SN",
  "SA", "AE", "QA", "KW", "OM", "BH", "JO", "LB", "IL", "TR",
  "IR", "IQ", "PK", "BD", "NP", "LK", "MM", "TH", "VN", "MY",
  "SG", "ID", "PH", "KR", "JP", "CN", "TW", "HK", "NZ", "RU",
  "UA", "PL", "SE", "NO", "DK", "FI", "IE", "PT", "BE", "CH",
  "AT", "CZ", "HU", "RO", "GR", "BG", "HR", "RS", "SK", "SI",
  "LT", "LV", "EE", "IS", "LU", "MT", "CY", "GE", "KZ", "UZ",
  "AZ", "MN", "KH", "LA", "BT", "AF", "BY", "MD", "AL", "ME",
];

const textNodeOriginalMap = new WeakMap();
const attrOriginalMap = new WeakMap();
const translationCache = new Map();
const translatableTextNodes = [];
const translatableAttrTargets = [];

const elements = {
  answerText: document.getElementById("answerText"),
  answerWrap: document.getElementById("aiAnswer"),
  authBackdrop: document.getElementById("authBackdrop"),
  authCloseButton: document.getElementById("authCloseButton"),
  authDescription: document.getElementById("authDescription"),
  authEmailInput: document.getElementById("authEmailInput"),
  authEyebrow: document.getElementById("authEyebrow"),
  authForm: document.getElementById("authForm"),
  authModal: document.getElementById("authModal"),
  authSubmitButton: document.getElementById("authSubmitButton"),
  authTitle: document.getElementById("authTitle"),
  avatarButton: document.getElementById("avatarButton"),
  avatarFallback: document.getElementById("avatarFallback"),
  avatarImage: document.getElementById("avatarImage"),
  logoutButton: document.getElementById("logoutButton"),
  profileAvatarInput: document.getElementById("profileAvatarInput"),
  profileBackdrop: document.getElementById("profileBackdrop"),
  profileCloseButton: document.getElementById("profileCloseButton"),
  profileDropdown: document.getElementById("profileDropdown"),
  profileEmail: document.getElementById("profileEmail"),
  profileForm: document.getElementById("profileForm"),
  profileHandleInput: document.getElementById("profileHandleInput"),
  profileModal: document.getElementById("profileModal"),
  profileNameInput: document.getElementById("profileNameInput"),
  profileName: document.getElementById("profileName"),
  profileOverviewSection: document.getElementById("profileOverviewSection"),
  profilePanelDescription: document.getElementById("profilePanelDescription"),
  profilePanelTitle: document.getElementById("profilePanelTitle"),
  profileSummaryAvatar: document.getElementById("profileSummaryAvatar"),
  profileSummaryEmail: document.getElementById("profileSummaryEmail"),
  profileSummaryFallback: document.getElementById("profileSummaryFallback"),
  profileSummaryName: document.getElementById("profileSummaryName"),
  profileSummaryProvider: document.getElementById("profileSummaryProvider"),
  settingDisplayLanguage: document.getElementById("settingDisplayLanguage"),
  settingRegion: document.getElementById("settingRegion"),
  settingTheme: document.getElementById("settingTheme"),
  settingSafeSearch: document.getElementById("settingSafeSearch"),
  settingsForm: document.getElementById("settingsForm"),
  userProfile: document.getElementById("userProfile"),
  attachButton: document.getElementById("attachButton"),
  attachMenu: document.getElementById("attachMenu"),
  citations: document.getElementById("citations"),
  emptyState: document.getElementById("emptyState"),
  filePicker: document.getElementById("filePicker"),
  imagePicker: document.getElementById("imagePicker"),
  locationMeta: document.getElementById("locationMeta"),
  locationText: document.getElementById("locationText"),
  queryInput: document.getElementById("query"),
  relatedLabel: document.getElementById("relatedLabel"),
  relatedRow: document.getElementById("relatedRow"),
  results: document.getElementById("results"),
  resultsHead: document.getElementById("resultsHead"),
  searchTabs: Array.from(document.querySelectorAll("[data-search-tab]")),
  searchButton: document.getElementById("searchButton"),
  searchShell: document.querySelector(".search-shell"),
  statusPill: document.getElementById("statusPill"),
  suggestPanel: document.getElementById("suggestPanel"),
  uploadFileButton: document.getElementById("uploadFileButton"),
  uploadImageButton: document.getElementById("uploadImageButton"),
  voiceButton: document.getElementById("voiceButton"),
  voiceFeedback: document.getElementById("voiceFeedback"),
  voiceStopButton: document.getElementById("voiceStopButton"),
};

const state = {
  activeItems: [],
  activeIndex: -1,
  activeSearchToken: 0,
  answerTypingTimer: null,
  answerTypingToken: 0,
  bestLocationAccuracy: Number.POSITIVE_INFINITY,
  lastSubmittedQuery: "",
  liveSuggestions: [],
  locationSettled: false,
  locationWatchId: null,
  profileUser: null,
  recognition: null,
  searchController: null,
  languageApplyToken: 0,
  voiceDraft: "",
  voicePreviousValue: "",
};

const devRefreshState = {
  currentVersion: null,
  isEnabled: ["localhost", "127.0.0.1"].includes(window.location.hostname),
  timerId: null,
};

function readHistory() {
  try {
    const rawValue = localStorage.getItem(historyKey) || "[]";
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

function writeHistory(items) {
  localStorage.setItem(historyKey, JSON.stringify(items.slice(0, 8)));
}

function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);

    if (!rawValue) {
      return fallbackValue;
    }

    return { ...fallbackValue, ...JSON.parse(rawValue) };
  } catch {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUserProfileStorageKey(user) {
  const provider = String(user?.provider || "").trim().toLowerCase() || "unknown";
  const stableId = String(user?.id || user?.email || user?.username || "").trim().toLowerCase();
  return stableId ? `${provider}:${stableId}` : "anonymous";
}

function removeHistoryItem(value) {
  const nextItems = readHistory().filter(
    (item) => item.toLowerCase() !== value.toLowerCase(),
  );

  writeHistory(nextItems);
  openDropdown(elements.queryInput.value);
}

function saveHistory(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return;
  }

  const nextItems = [
    trimmedQuery,
    ...readHistory().filter(
      (item) => item.toLowerCase() !== trimmedQuery.toLowerCase(),
    ),
  ];

  writeHistory(nextItems);
}

function setSearchStatus(message) {
  const text = (message || "").trim();

  elements.statusPill.textContent = text;
  elements.statusPill.classList.toggle("is-visible", Boolean(text));
  elements.resultsHead.style.display = text ? "flex" : "none";
}

function setSearchLoading(isLoading, message) {
  elements.searchShell.classList.toggle("is-loading", isLoading);
  elements.searchButton.disabled = isLoading;
  elements.queryInput.disabled = false;
  setSearchStatus(isLoading ? message || "Searching live web..." : message || "");
}

function getEffectiveQuery() {
  return elements.queryInput.value.trim() || state.lastSubmittedQuery.trim();
}

function setActiveSearchTab(tabName) {
  elements.searchTabs.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.getAttribute("data-search-tab") === tabName,
    );
  });
}

function openSearchVertical(tabName) {
  const query = getEffectiveQuery();
  const settings = getStoredSettings();
  const safeSearchMode = settings.safeSearch === "off" ? "off" : "active";

  if (tabName === "maps") {
    const mapsUrl = new URL(`https://www.google.com/maps/search/${encodeURIComponent(query || "maps")}`);
    mapsUrl.searchParams.set("hl", settings.displayLanguage);
    mapsUrl.searchParams.set("gl", settings.region);
    window.open(mapsUrl.toString(), "_blank", "noopener,noreferrer");
    return;
  }

  const url = new URL("https://www.google.com/search");

  if (query) {
    url.searchParams.set("q", query);
  }

  url.searchParams.set("hl", settings.displayLanguage);
  url.searchParams.set("gl", settings.region);
  url.searchParams.set("safe", safeSearchMode);

  if (tabName === "images") {
    url.searchParams.set("tbm", "isch");
  } else if (tabName === "videos") {
    url.searchParams.set("tbm", "vid");
  } else if (tabName === "news") {
    url.searchParams.set("tbm", "nws");
  }

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function setVoiceUiState(mode) {
  const isRecording = mode === "recording";

  elements.searchShell.classList.toggle("is-recording", isRecording);
  elements.voiceButton.classList.toggle("is-recording", isRecording);
  elements.voiceFeedback.classList.remove("is-visible");
  elements.voiceStopButton.classList.remove("is-visible");
  elements.voiceButton.style.opacity = "1";
  elements.queryInput.placeholder =
    mode === "recording" ? "Listening..." : defaultSearchPlaceholder;
  elements.queryInput.classList.toggle("is-listening", isRecording);
}

function clearVoiceDraft() {
  state.voiceDraft = "";
  setVoiceUiState("idle");

}

function clearAnswerTyping() {
  if (state.answerTypingTimer) {
    clearTimeout(state.answerTypingTimer);
    state.answerTypingTimer = null;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitIntoSentences(text) {
  return (text || "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .map((sentence) => sentence.replace(/^#{1,6}\s*/g, ""))
    .map((sentence) => sentence.replace(/\s+#\s+/g, " "))
    .map((sentence) => sentence.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);
}

function formatOverviewHtml(query, message, sources) {
  const cleanedMessage = (message || "").trim();

  if (!cleanedMessage) {
    return "";
  }

  const sentences = splitIntoSentences(cleanedMessage);
  const summaryText = sentences.slice(0, 2).join(" ") || cleanedMessage;

  const pointItems = (sentences.length > 1 ? sentences : [cleanedMessage])
    .slice(0, 4)
    .map((sentence) => `<li>${escapeHtml(sentence)}</li>`)
    .join("");

  const tableRows = (sources || [])
    .slice(0, 10)
    .map((source, index) => {
      let host = source.url;

      try {
        host = new URL(source.url).hostname.replace(/^www\./, "");
      } catch {
        host = source.url;
      }

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <a href="${escapeHtml(source.url)}" rel="noreferrer noopener">
              ${escapeHtml(source.title || "Untitled source")}
            </a>
          </td>
          <td>${escapeHtml(host)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="overview-section">
      <h3 class="overview-heading">Summary</h3>
      <p class="overview-text">${escapeHtml(summaryText)}</p>
    </section>
    <section class="overview-section">
      <h3 class="overview-heading">Key Points</h3>
      <ol class="overview-list">${pointItems}</ol>
    </section>
    ${
      tableRows
        ? `
          <section class="overview-section">
            <h3 class="overview-heading">Top Sources</h3>
            <table class="overview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Source</th>
                  <th>Domain</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </section>
        `
        : ""
    }
    <section class="overview-section">
      <h3 class="overview-heading">Query</h3>
      <p class="overview-text"><strong>${escapeHtml(query)}</strong></p>
    </section>
  `;
}

function renderOverview(query, message, sources = []) {
  clearAnswerTyping();
  state.answerTypingToken += 1;
  elements.answerText.innerHTML = formatOverviewHtml(query, message, sources);
}

function setSuggestedQuestions(items, currentQuery) {
  const suggestions = [...new Set(
    (items || [])
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .filter((item) => item.toLowerCase() !== currentQuery.toLowerCase()),
  )].slice(0, 4);

  elements.relatedRow.innerHTML = "";

  if (!suggestions.length) {
    elements.relatedLabel.classList.remove("is-visible");
    elements.relatedRow.classList.remove("is-visible");
    return;
  }

  suggestions.forEach((item) => {
    const button = document.createElement("button");
    button.className = "related-chip";
    button.type = "button";
    button.textContent = item;
    button.addEventListener("click", () => {
      elements.queryInput.value = item;
      elements.queryInput.focus();
      void executeSearch(item);
    });
    elements.relatedRow.appendChild(button);
  });

  elements.relatedLabel.classList.add("is-visible");
  elements.relatedRow.classList.add("is-visible");
}

function buildFollowUpQuestions(query, sources) {
  const cleanedQuery = query.trim();
  const sourceTitle = sources[0]?.title || "";
  const shortTopic = sourceTitle || cleanedQuery;

  return [
    `Can you explain ${cleanedQuery} in simple words with a step-by-step example?`,
    `What are the most important facts, benefits, and practical uses related to ${shortTopic}?`,
    `Can you compare different ways to understand or apply ${cleanedQuery} in real life?`,
    `What common mistakes should someone avoid when learning about ${cleanedQuery}?`,
  ];
}

function getCurrentPositionAsync(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function stopLocationWatch() {
  if (state.locationWatchId !== null) {
    navigator.geolocation.clearWatch(state.locationWatchId);
    state.locationWatchId = null;
  }
}

async function reverseLookupLocation(latitude, longitude) {
  try {
    const response = await fetch(
      `/api/location/reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
    );

    if (!response.ok) {
      throw new Error(`Reverse geocode failed with status ${response.status}`);
    }

    const payload = await response.json();
    const topResult = payload.results?.[0];

    if (!topResult) {
      return false;
    }

    const locality = [
      topResult.areaName,
      topResult.cityName,
      topResult.stateName,
      topResult.countryName,
      topResult.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    const locationLabel = locality || topResult.formattedAddress || "";

    if (!locationLabel) {
      return false;
    }

    elements.locationText.textContent = locationLabel;
    elements.locationMeta.textContent = `Latitude ${latitude.toFixed(5)}, Longitude ${longitude.toFixed(5)}`;
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

async function applyLocationFix(position, options = {}) {
  const { latitude, longitude, accuracy } = position.coords;
  const shouldUseFix =
    options.force === true
    || accuracy < state.bestLocationAccuracy - 5
    || !Number.isFinite(state.bestLocationAccuracy);

  if (!shouldUseFix) {
    return;
  }

  state.bestLocationAccuracy = accuracy;
  elements.locationText.textContent = "Refining your location...";
  elements.locationMeta.textContent = `Latitude ${latitude.toFixed(5)}, Longitude ${longitude.toFixed(5)}`;

  const resolved = await reverseLookupLocation(latitude, longitude);

  if (!resolved) {
    elements.locationText.textContent = `Latitude ${latitude.toFixed(5)}, Longitude ${longitude.toFixed(5)}`;
  }

  if (accuracy <= 40) {
    state.locationSettled = true;
    stopLocationWatch();
  }
}

async function updateUserLocation() {
  if (!("geolocation" in navigator)) {
    elements.locationText.textContent = "This browser does not support live location.";
    elements.locationMeta.textContent = "";
    return;
  }

  elements.locationText.textContent = "Requesting your current location...";
  elements.locationMeta.textContent = "";
  state.bestLocationAccuracy = Number.POSITIVE_INFINITY;
  state.locationSettled = false;
  stopLocationWatch();

  try {
    let position;

    try {
      position = await getCurrentPositionAsync({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000,
      });
    } catch (error) {
      if (error.code !== 3) {
        throw error;
      }

      position = await getCurrentPositionAsync({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 600000,
      });
    }

    await applyLocationFix(position, { force: true });

    state.locationWatchId = navigator.geolocation.watchPosition(
      (watchPosition) => {
        if (state.locationSettled) {
          stopLocationWatch();
          return;
        }

        void applyLocationFix(watchPosition);
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );

    setTimeout(() => {
      stopLocationWatch();
    }, 30000);
  } catch (error) {
    const messages = {
      1: "Location access was denied in the browser.",
      2: "Your location could not be determined.",
      3: "Location request timed out.",
    };

    elements.locationText.textContent =
      messages[error.code] || "Unable to read your current location.";
    elements.locationMeta.textContent = "";
  }
}

function renderResults(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    clearAnswerTyping();
    elements.answerWrap.classList.remove("is-visible");
    elements.results.innerHTML = "";
    elements.citations.innerHTML = "";
    setSuggestedQuestions([], "");
    elements.emptyState.style.display = "block";
    elements.emptyState.textContent = "";
    setSearchStatus("");
    return;
  }

  elements.answerWrap.classList.add("is-visible");
  renderOverview(trimmedQuery, "Searching...", []);
  elements.citations.innerHTML = "";
  elements.results.innerHTML = "";
  setSuggestedQuestions(buildFollowUpQuestions(trimmedQuery, []), trimmedQuery);
  elements.emptyState.style.display = "none";
  elements.emptyState.textContent = "";
}

function renderErrorState(query, message) {
  const trimmedQuery = query.trim();

  elements.answerWrap.classList.add("is-visible");
  renderOverview(trimmedQuery, message || "Search is temporarily unavailable.", []);
  elements.citations.innerHTML = "";
  elements.results.innerHTML = "";
  setSuggestedQuestions(buildFollowUpQuestions(trimmedQuery, []), trimmedQuery);
  setSearchStatus("Showing fallback response");
  elements.emptyState.style.display = "block";
  elements.emptyState.textContent = trimmedQuery
    ? `No live results returned for "${trimmedQuery}".`
    : "Search is temporarily unavailable.";
}

function renderLiveResults(query, payload) {
  const sources = Array.isArray(payload.sources) ? payload.sources : [];

  renderOverview(query, payload.final_answer || "insufficient data", sources);
  elements.citations.innerHTML = "";
  elements.results.innerHTML = "";

  sources.forEach((source) => {
    const link = document.createElement("a");
    link.className = "citation";
    link.href = source.url;
    link.textContent = new URL(source.url).hostname;
    link.rel = "noreferrer noopener";
    elements.citations.appendChild(link);

    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-url">${escapeHtml(source.url)}</div>
      <h3 class="result-title">
        <a href="${escapeHtml(source.url)}" rel="noreferrer noopener">${escapeHtml(source.title)}</a>
      </h3>
      <p class="result-snippet">${escapeHtml(source.summary)}</p>
    `;
    elements.results.appendChild(card);
  });

  setSuggestedQuestions(buildFollowUpQuestions(query, sources), query);
  elements.answerWrap.classList.add("is-visible");
  setSearchStatus(sources.length ? `Live results for "${query}"` : "No strong live sources found");
  elements.emptyState.style.display = sources.length === 0 ? "block" : "none";
  elements.emptyState.textContent = sources.length === 0 ? "No matching results found." : "";
}

function getDropdownItems(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const history = readHistory();

  const historyMatches = history
    .filter((item) => !normalizedQuery || item.toLowerCase().includes(normalizedQuery))
    .slice(0, 5)
    .map((item) => ({ type: "history", text: item }));

  const historyTextsLower = new Set(historyMatches.map((h) => h.text.toLowerCase()));

  const suggestionMatches = state.liveSuggestions
    .filter((item) => {
      const lower = item.toLowerCase();
      return !historyTextsLower.has(lower) && (!normalizedQuery || lower.includes(normalizedQuery));
    })
    .slice(0, normalizedQuery ? 5 : 0)
    .map((item) => ({ type: "suggestion", text: item }));

  const trendingMatches = !normalizedQuery
    ? state.liveSuggestions
        .filter((item) => !historyTextsLower.has(item.toLowerCase()))
        .slice(0, 8)
        .map((item) => ({ type: "trending", text: item }))
    : [];

  return {
    history: historyMatches,
    suggestions: suggestionMatches,
    trending: trendingMatches,
  };
}

function closeDropdown() {
  elements.suggestPanel.classList.remove("is-open");
  elements.suggestPanel.innerHTML = "";
  elements.queryInput.setAttribute("aria-expanded", "false");
  state.activeItems = [];
  state.activeIndex = -1;
}

function closeAttachMenu() {
  elements.attachMenu.classList.remove("is-open");
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}

function renderGroup(label, items, offset) {
  if (!items.length) {
    return "";
  }

  const renderedItems = items
    .map((item, index) => `
      <button
        class="suggest-item"
        type="button"
        data-index="${offset + index}"
        data-value="${escapeAttribute(item.text)}"
      >
        <span class="item-icon">
          ${item.type === "history" ? "↻" : item.type === "trending" ? "↗" : "⌕"}
        </span>
        <span class="item-text">${escapeHtml(item.text)}</span>
        ${
          item.type === "history"
            ? `
              <span class="item-type">
                <span
                  class="history-delete"
                  data-delete="${escapeAttribute(item.text)}"
                  aria-label="Delete history item"
                >
                  ×
                </span>
              </span>
            `
            : `<span class="item-type">${item.type === "trending" ? "" : item.type}</span>`
        }
      </button>
    `)
    .join("");

  return `
    <div class="suggest-group">
      <span class="suggest-label${label === "Trending searches" ? " trending-label" : ""}">
        ${label}
      </span>
      ${renderedItems}
    </div>
  `;
}

function openDropdown(query) {
  const groups = getDropdownItems(query);
  const hasQuery = Boolean(query.trim());

  state.activeItems = [...groups.history, ...(hasQuery ? groups.suggestions : groups.trending)];

  if (!state.activeItems.length) {
    closeDropdown();
    return;
  }

  let offset = 0;
  let html = "";

  if (groups.history.length) {
    html += renderGroup(hasQuery ? "Recent" : "Recent searches", groups.history, offset);
    offset += groups.history.length;
  }

  if (hasQuery && groups.suggestions.length) {
    html += renderGroup("Suggestions", groups.suggestions, offset);
    offset += groups.suggestions.length;
  }

  if (!hasQuery && groups.trending.length) {
    html += renderGroup("Trending searches", groups.trending, offset);
  }

  elements.suggestPanel.innerHTML = html;
  elements.suggestPanel.classList.add("is-open");
  elements.queryInput.setAttribute("aria-expanded", "true");
  state.activeIndex = -1;

  Array.from(elements.suggestPanel.querySelectorAll(".suggest-item")).forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-value") || "";
      elements.queryInput.value = value;
      void executeSearch(value);
    });
  });

  Array.from(elements.suggestPanel.querySelectorAll(".history-delete")).forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const value = button.getAttribute("data-delete") || "";
      removeHistoryItem(value);
    });
  });
}

function updateActiveItem() {
  Array.from(elements.suggestPanel.querySelectorAll(".suggest-item")).forEach((item) => {
    const index = Number(item.getAttribute("data-index"));
    item.classList.toggle("is-active", index === state.activeIndex);
  });
}

async function executeSearch(query, attachmentContext = "") {
  const trimmedQuery = query.trim();
  setActiveSearchTab("all");

  if (!trimmedQuery) {
    renderResults("");
    closeDropdown();

    return;
  }

  if (state.searchController) {
    state.searchController.abort();
  }

  const searchToken = ++state.activeSearchToken;
  state.searchController = new AbortController();
  const settings = getStoredSettings();
  elements.queryInput.value = trimmedQuery;

  saveHistory(trimmedQuery);
  closeDropdown();
  setSearchLoading(true);
  state.lastSubmittedQuery = trimmedQuery;

  try {
    const translatedQuery = await translateQueryForSearch(trimmedQuery, settings.displayLanguage);
    const response = await fetch(
      `/api/search?q=${encodeURIComponent(translatedQuery)}&region=${encodeURIComponent(settings.region)}&hl=${encodeURIComponent(settings.displayLanguage)}&safe_search=${encodeURIComponent(settings.safeSearch)}&context=${encodeURIComponent(attachmentContext)}`,
      {
      signal: state.searchController.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const payload = await response.json();

    if (searchToken !== state.activeSearchToken) {
      return;
    }

    renderLiveResults(trimmedQuery, payload);
    void applyPageLanguage(settings.displayLanguage);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error(error);
    renderErrorState(trimmedQuery, "Live search could not complete.");
    void applyPageLanguage(settings.displayLanguage);
  } finally {
    if (searchToken === state.activeSearchToken) {
      state.searchController = null;
      setSearchLoading(false, elements.statusPill.textContent);
    }
  }
}

async function loadTrendingTopics() {
  try {
    const response = await fetch("/api/trending");

    if (!response.ok) {
      throw new Error(`Trending request failed with status ${response.status}`);
    }

    const payload = await response.json();
    state.liveSuggestions = Array.isArray(payload.topics) ? payload.topics : [];
  } catch (error) {
    console.error(error);
    state.liveSuggestions = [];
  }
}

function handlePickedFiles(files) {
  if (!files.length) {
    return;
  }

  void analyzePickedFiles(files);
}

async function fileToPayload(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const [, contentBase64 = ""] = dataUrl.split(",", 2);

  return {
    name: file.name,
    mime_type: file.type || "application/octet-stream",
    content_base64: contentBase64,
  };
}

async function analyzePickedFiles(files) {
  try {
    setSearchLoading(true, "Analyzing upload...");
    const payloadFiles = await Promise.all(files.slice(0, 3).map((file) => fileToPayload(file)));
    const response = await fetch("/api/attachments/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: payloadFiles }),
    });

    if (!response.ok) {
      throw new Error(`Attachment analysis failed with status ${response.status}`);
    }

    const payload = await response.json();
    const searchQuery = String(payload.search_query || "").trim();
    const attachmentSummary = String(payload.summary || "").trim();
    const nextQuery = searchQuery || files.map((file) => file.name).join(" ");

    elements.queryInput.value = nextQuery;
    await executeSearch(nextQuery, attachmentSummary);
  } catch (error) {
    console.error(error);
    const fallbackQuery = files.map((file) => file.name).join(" ");
    elements.queryInput.value = fallbackQuery;
    await executeSearch(fallbackQuery, "Uploaded file analysis unavailable.");
  }
}

function setAuthMode(mode) {
  const isSignup = mode === "signup";

  elements.authEyebrow.textContent = "QuAir account";
  elements.authTitle.textContent = isSignup ? "Create your account" : "Log in or sign up";
  elements.authDescription.textContent = "";
  elements.authSubmitButton.textContent = isSignup ? "Sign up with email" : "Continue";

  const googleLabel = document.getElementById("googleLabel");
  const xLabel = document.getElementById("xLabel");
  if (googleLabel) googleLabel.textContent = isSignup ? "Sign up with Google" : "Continue with Google";
  if (xLabel) xLabel.textContent = isSignup ? "Sign up with X" : "Continue with X";

  void applyPageLanguage(getStoredSettings().displayLanguage);
}

function openAuthModal(mode) {
  setAuthMode(mode);
  elements.authModal.classList.add("is-open");
  elements.authModal.setAttribute("aria-hidden", "false");
  elements.authEmailInput.focus();
}

function closeAuthModal() {
  elements.authModal.classList.remove("is-open");
  elements.authModal.setAttribute("aria-hidden", "true");
}

function buildDisplayNames() {
  try {
    return {
      language: new Intl.DisplayNames(["en"], { type: "language" }),
      region: new Intl.DisplayNames(["en"], { type: "region" }),
    };
  } catch {
    return {
      language: null,
      region: null,
    };
  }
}

const displayNames = buildDisplayNames();

function formatLanguageLabel(code) {
  if (code === "en-US") {
    return "English (United States)";
  }

  if (code === "en-GB") {
    return "English (United Kingdom)";
  }

  if (code === "en-IN") {
    return "English (India)";
  }

  const [baseCode, regionCode] = code.split("-");
  const languageLabel = displayNames.language?.of(baseCode) || baseCode;

  if (regionCode) {
    const regionLabel = displayNames.region?.of(regionCode) || regionCode;
    return `${languageLabel} (${regionLabel})`;
  }

  return languageLabel;
}

function formatRegionLabel(code) {
  return displayNames.region?.of(code) || code;
}

function populateSelectOptions(selectElement, options, labelFormatter) {
  const optionMarkup = options
    .map((optionValue) => {
      const optionLabel = labelFormatter(optionValue);
      return `<option value="${escapeAttribute(optionValue)}">${escapeHtml(optionLabel)}</option>`;
    })
    .join("");

  selectElement.innerHTML = optionMarkup;
}

function populateSettingsOptions() {
  if (!elements.settingDisplayLanguage || !elements.settingRegion) {
    return;
  }

  if (!elements.settingDisplayLanguage.options.length) {
    populateSelectOptions(elements.settingDisplayLanguage, topLanguageOptions, formatLanguageLabel);
  }

  if (!elements.settingRegion.options.length) {
    populateSelectOptions(elements.settingRegion, topRegionOptions, formatRegionLabel);
  }
}

function getLanguageCodeForTranslation(displayLanguage) {
  return String(displayLanguage || "en").split("-")[0].toLowerCase();
}

function collectTranslatableTargets() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    const parentElement = currentNode.parentElement;
    const currentText = currentNode.nodeValue || "";

    if (
      parentElement
      && currentText.trim()
      && !parentElement.closest("script, style, noscript, code, pre, svg")
      && !["INPUT", "TEXTAREA", "SELECT", "OPTION"].includes(parentElement.tagName)
      && !textNodeOriginalMap.has(currentNode)
    ) {
      textNodeOriginalMap.set(currentNode, currentText);
      translatableTextNodes.push(currentNode);
    }

    currentNode = walker.nextNode();
  }

  document.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
    if (!attrOriginalMap.has(element)) {
      attrOriginalMap.set(element, {
        placeholder: element.getAttribute("placeholder"),
        ariaLabel: element.getAttribute("aria-label"),
        title: element.getAttribute("title"),
      });
      translatableAttrTargets.push(element);
    }
  });
}

function restoreOriginalLanguage() {
  translatableTextNodes.forEach((node) => {
    const originalText = textNodeOriginalMap.get(node);
    if (typeof originalText === "string") {
      node.nodeValue = originalText;
    }
  });

  translatableAttrTargets.forEach((element) => {
    const originalAttrs = attrOriginalMap.get(element);
    if (!originalAttrs) {
      return;
    }

    [
      ["placeholder", originalAttrs.placeholder],
      ["aria-label", originalAttrs.ariaLabel],
      ["title", originalAttrs.title],
    ].forEach(([attrName, attrValue]) => {
      if (typeof attrValue === "string") {
        element.setAttribute(attrName, attrValue);
      } else {
        element.removeAttribute(attrName);
      }
    });
  });
}

async function translateBatch(texts, targetLanguage, sourceLanguage = "auto") {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      texts,
      target_language: targetLanguage,
      source_language: sourceLanguage,
    }),
  });

  if (!response.ok) {
    throw new Error(`Translate request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.translations) ? payload.translations : texts;
}

async function translateTextsWithCache(texts, targetLanguage, sourceLanguage = "auto") {
  const output = new Array(texts.length);
  const uncached = [];
  const uncachedIndices = [];

  texts.forEach((text, index) => {
    const cacheKey = `${targetLanguage}|${sourceLanguage}|${text}`;
    if (translationCache.has(cacheKey)) {
      output[index] = translationCache.get(cacheKey);
    } else {
      uncached.push(text);
      uncachedIndices.push(index);
    }
  });

  for (let start = 0; start < uncached.length; start += translationBatchSize) {
    const batchTexts = uncached.slice(start, start + translationBatchSize);
    const batchTranslations = await translateBatch(batchTexts, targetLanguage, sourceLanguage);

    batchTexts.forEach((batchText, batchIndex) => {
      const translatedText = batchTranslations[batchIndex] || batchText;
      const cacheKey = `${targetLanguage}|${sourceLanguage}|${batchText}`;
      translationCache.set(cacheKey, translatedText);
      const originalIndex = uncachedIndices[start + batchIndex];
      output[originalIndex] = translatedText;
    });
  }

  return output;
}

async function applyPageLanguage(displayLanguage) {
  const applyToken = ++state.languageApplyToken;
  const targetLanguage = getLanguageCodeForTranslation(displayLanguage);

  collectTranslatableTargets();

  if (targetLanguage === "en") {
    restoreOriginalLanguage();
    return;
  }

  const textNodesPayload = translatableTextNodes
    .map((node) => ({
      node,
      source: textNodeOriginalMap.get(node),
    }))
    .filter((item) => typeof item.source === "string" && item.source.trim());

  const attrPayload = [];
  translatableAttrTargets.forEach((element) => {
    const originalAttrs = attrOriginalMap.get(element);
    if (!originalAttrs) {
      return;
    }

    [
      ["placeholder", originalAttrs.placeholder],
      ["aria-label", originalAttrs.ariaLabel],
      ["title", originalAttrs.title],
    ].forEach(([attrName, attrValue]) => {
      if (typeof attrValue === "string" && attrValue.trim()) {
        attrPayload.push({
          element,
          attrName,
          source: attrValue,
        });
      }
    });
  });

  const combinedSources = [
    ...textNodesPayload.map((item) => item.source),
    ...attrPayload.map((item) => item.source),
  ];

  if (!combinedSources.length) {
    return;
  }

  try {
    const translatedValues = await translateTextsWithCache(combinedSources, targetLanguage, "auto");

    if (applyToken !== state.languageApplyToken) {
      return;
    }

    textNodesPayload.forEach((item, index) => {
      item.node.nodeValue = translatedValues[index] || item.source;
    });

    attrPayload.forEach((item, attrIndex) => {
      const translatedIndex = textNodesPayload.length + attrIndex;
      item.element.setAttribute(item.attrName, translatedValues[translatedIndex] || item.source);
    });
  } catch {
    restoreOriginalLanguage();
  }
}

async function translateQueryForSearch(query, displayLanguage) {
  const sourceLanguage = getLanguageCodeForTranslation(displayLanguage);

  if (!query.trim() || sourceLanguage === "en") {
    return query;
  }

  try {
    const translated = await translateTextsWithCache([query], "en", sourceLanguage);
    return translated[0] || query;
  } catch {
    return query;
  }
}

// ---------------------------------------------------------------------------
// Session / avatar helpers
// ---------------------------------------------------------------------------

function getInitials(name) {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

function getStoredProfilePrefs() {
  return readJsonStorage(profilePrefsKey, {
    profiles: {},
  });
}

function getProfilePrefsForUser(user) {
  const store = getStoredProfilePrefs();
  const key = getUserProfileStorageKey(user);
  const profile = store.profiles?.[key] || {};

  return {
    avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : "",
    displayName: typeof profile.displayName === "string" ? profile.displayName : "",
    handle: typeof profile.handle === "string" ? profile.handle : "",
  };
}

function setProfilePrefsForUser(user, prefs) {
  const store = getStoredProfilePrefs();
  const key = getUserProfileStorageKey(user);
  const profiles = { ...(store.profiles || {}) };

  profiles[key] = {
    avatarUrl: String(prefs.avatarUrl || "").trim(),
    displayName: String(prefs.displayName || "").trim(),
    handle: String(prefs.handle || "").trim(),
  };

  writeJsonStorage(profilePrefsKey, { profiles });
}

function getStoredSettings() {
  return readJsonStorage(settingsPrefsKey, {
    displayLanguage: "en-US",
    region: "IN",
    theme: "system",
    safeSearch: "moderate",
  });
}

function getSettingsFromUi() {
  return {
    displayLanguage: elements.settingDisplayLanguage.value,
    region: elements.settingRegion.value,
    theme: elements.settingTheme.value,
    safeSearch: elements.settingSafeSearch.value,
  };
}

function getResolvedTheme(themePreference) {
  if (themePreference === "dark") {
    return "dark";
  }

  if (themePreference === "light") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemePreview(themePreference) {
  document.body.dataset.themePreference = themePreference;
  document.body.dataset.theme = getResolvedTheme(themePreference);
}

function getResolvedUser(user) {
  const prefs = getProfilePrefsForUser(user);
  const providerHandle = user.provider === "twitter"
    ? (user.username ? `@${String(user.username).replace(/^@+/, "")}` : "")
    : (user.email || user.username || "");
  const fallbackName = user.name || user.username || (user.email ? user.email.split("@")[0] : "") || "User";

  return {
    ...user,
    name: prefs.displayName || fallbackName,
    handle: prefs.handle || providerHandle,
    picture: prefs.avatarUrl || user.picture || "",
  };
}

function applyUserSummary(user) {
  const resolvedUser = getResolvedUser(user);
  const fallback = getInitials(resolvedUser.name);

  elements.profileSummaryName.textContent = resolvedUser.name;
  elements.profileSummaryEmail.textContent = resolvedUser.handle || "No email or username available";
  elements.profileSummaryProvider.textContent = resolvedUser.provider
    ? `Signed in with ${resolvedUser.provider}`
    : "Signed in";

  if (resolvedUser.picture) {
    elements.profileSummaryAvatar.onerror = () => {
      elements.profileSummaryAvatar.hidden = true;
      elements.profileSummaryFallback.hidden = false;
      elements.profileSummaryFallback.textContent = fallback;
    };
    elements.profileSummaryAvatar.src = resolvedUser.picture;
    elements.profileSummaryAvatar.alt = `${resolvedUser.name} avatar`;
    elements.profileSummaryAvatar.hidden = false;
    elements.profileSummaryFallback.hidden = true;
  } else {
    elements.profileSummaryAvatar.onerror = null;
    elements.profileSummaryAvatar.hidden = true;
    elements.profileSummaryFallback.hidden = false;
    elements.profileSummaryFallback.textContent = fallback;
  }

  elements.profileNameInput.value = resolvedUser.name;
  elements.profileHandleInput.value = resolvedUser.handle || "";
  elements.profileAvatarInput.value = resolvedUser.picture || "";
}

function applySettingsUi() {
  const settings = getStoredSettings();

  populateSettingsOptions();

  elements.settingDisplayLanguage.value = settings.displayLanguage;
  elements.settingRegion.value = settings.region;
  elements.settingTheme.value = settings.theme;
  elements.settingSafeSearch.value = settings.safeSearch;

  document.documentElement.lang = settings.displayLanguage;
  document.body.dataset.region = settings.region;
  document.body.dataset.safeSearch = settings.safeSearch;
  applyThemePreview(settings.theme);

  void applyPageLanguage(settings.displayLanguage);
}

function setProfileSection(sectionName) {
  const isOverview = sectionName === "overview";
  const isSettings = sectionName === "settings";

  elements.profileOverviewSection.hidden = !isOverview;
  elements.settingsForm.hidden = !isSettings;

  if (isOverview) {
    elements.profilePanelTitle.textContent = "Your profile";
    elements.profilePanelDescription.textContent = "Review and update your name and email/username.";
  }

  if (isSettings) {
    elements.profilePanelTitle.textContent = "Settings";
    elements.profilePanelDescription.textContent = "Preview theme instantly, then save language, region, theme, and safe search.";
  }

  void applyPageLanguage(getStoredSettings().displayLanguage);
}

function persistSettingsFromUi() {
  writeJsonStorage(settingsPrefsKey, getSettingsFromUi());

  applySettingsUi();
}

function openProfilePanel(sectionName = "overview") {
  if (!state.profileUser) {
    return;
  }

  applyUserSummary(state.profileUser);
  applySettingsUi();
  setProfileSection(sectionName);
  elements.profileModal.classList.add("is-open");
  elements.profileModal.setAttribute("aria-hidden", "false");
}

function closeProfilePanel() {
  elements.profileModal.classList.remove("is-open");
  elements.profileModal.setAttribute("aria-hidden", "true");
  applySettingsUi();
}

function showLoggedInUI(user) {
  const resolvedUser = getResolvedUser(user);

  state.profileUser = {
    ...user,
    name: resolvedUser.name,
    handle: resolvedUser.handle,
    picture: resolvedUser.picture,
  };

  document.querySelector(".auth-actions").hidden = true;
  elements.userProfile.hidden = false;

  if (resolvedUser.picture) {
    elements.avatarImage.onerror = () => {
      elements.avatarImage.hidden = true;
      elements.avatarFallback.hidden = false;
      elements.avatarFallback.textContent = getInitials(resolvedUser.name);
    };
    elements.avatarImage.src = resolvedUser.picture;
    elements.avatarImage.alt = resolvedUser.name || "User avatar";
    elements.avatarImage.hidden = false;
    elements.avatarFallback.hidden = true;
  } else {
    elements.avatarImage.onerror = null;
    elements.avatarImage.hidden = true;
    elements.avatarFallback.hidden = false;
    elements.avatarFallback.textContent = getInitials(resolvedUser.name);
  }

  elements.profileName.textContent = resolvedUser.name || "User";
  elements.profileEmail.textContent = resolvedUser.handle || resolvedUser.provider || "";
  applyUserSummary(state.profileUser);
  applySettingsUi();
}

function showLoggedOutUI() {
  document.querySelector(".auth-actions").hidden = false;
  elements.userProfile.hidden = true;
  elements.profileDropdown.hidden = true;
  elements.avatarButton.setAttribute("aria-expanded", "false");
  state.profileUser = null;
  closeProfilePanel();
}

function toggleProfileDropdown() {
  const isOpen = !elements.profileDropdown.hidden;
  elements.profileDropdown.hidden = isOpen;
  elements.avatarButton.setAttribute("aria-expanded", String(!isOpen));
}

async function checkSession() {
  try {
    const resp = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!resp.ok) { showLoggedOutUI(); return; }
    const user = await resp.json();
    if (user.authenticated) { showLoggedInUI(user); } else { showLoggedOutUI(); }
  } catch { showLoggedOutUI(); }
}

async function handleLogout() {
  try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch {}
  showLoggedOutUI();
}

function bindEvents() {
  document.querySelectorAll("[data-auth-trigger]").forEach((button) => {
    button.addEventListener("click", () => {
      openAuthModal(button.getAttribute("data-auth-trigger") || "login");
    });
  });

  elements.authCloseButton.addEventListener("click", closeAuthModal);
  elements.authBackdrop.addEventListener("click", closeAuthModal);

  elements.authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = elements.authEmailInput.value.trim();
    if (email) {
      window.location.href = `/api/auth/google/login?login_hint=${encodeURIComponent(email)}&expected_email=${encodeURIComponent(email)}`;
    }
  });

  document.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      const provider = button.getAttribute("data-provider");
      if (provider === "Google") {
        const email = elements.authEmailInput.value.trim();
        const query = email
          ? `?login_hint=${encodeURIComponent(email)}&expected_email=${encodeURIComponent(email)}`
          : "";
        window.location.href = `/api/auth/google/login${query}`;
      }
      if (provider === "X") { window.location.href = "/api/auth/twitter/login"; }
    });
  });

  elements.avatarButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileDropdown();
  });

  elements.logoutButton.addEventListener("click", () => {
    toggleProfileDropdown();
    void handleLogout();
  });

  document.querySelectorAll("[data-profile-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.profileDropdown.hidden = true;
      elements.avatarButton.setAttribute("aria-expanded", "false");
      openProfilePanel(button.getAttribute("data-profile-panel") || "overview");
    });
  });

  elements.profileCloseButton.addEventListener("click", closeProfilePanel);
  elements.profileBackdrop.addEventListener("click", closeProfilePanel);

  elements.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    setProfilePrefsForUser(state.profileUser, {
      avatarUrl: elements.profileAvatarInput.value.trim(),
      displayName: elements.profileNameInput.value.trim(),
      handle: elements.profileHandleInput.value.trim(),
    });

    if (state.profileUser) {
      showLoggedInUI(state.profileUser);
      setProfileSection("overview");
    }
  });

  [
    elements.settingDisplayLanguage,
    elements.settingRegion,
    elements.settingTheme,
    elements.settingSafeSearch,
  ].forEach((selectElement) => {
    selectElement.addEventListener("change", () => {
      persistSettingsFromUi();
    });
  });

  elements.settingTheme.addEventListener("change", () => {
    applyThemePreview(elements.settingTheme.value);
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const settings = getStoredSettings();

    if (settings.theme === "system") {
      applySettingsUi();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user-profile")) {
      elements.profileDropdown.hidden = true;
      elements.avatarButton.setAttribute("aria-expanded", "false");
    }
  });

  elements.searchTabs.forEach((button) => {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-search-tab") || "all";
      setActiveSearchTab(tabName);

      if (tabName === "all") {
        void executeSearch(getEffectiveQuery());
        return;
      }

      openSearchVertical(tabName);
    });
  });

  elements.queryInput.addEventListener("focus", () => {
    openDropdown(elements.queryInput.value);
  });

  elements.queryInput.addEventListener("input", () => {


    if (elements.queryInput.value.trim()) {
      openDropdown(elements.queryInput.value);
      return;
    }

    openDropdown("");
    setSearchStatus(state.lastSubmittedQuery ? `Last search: ${state.lastSubmittedQuery}` : "");
  });

  elements.queryInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" && state.activeItems.length) {
      event.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, state.activeItems.length - 1);
      updateActiveItem();
      return;
    }

    if (event.key === "ArrowUp" && state.activeItems.length) {
      event.preventDefault();
      state.activeIndex = Math.max(state.activeIndex - 1, 0);
      updateActiveItem();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (state.activeIndex >= 0 && state.activeItems[state.activeIndex]) {
        elements.queryInput.value = state.activeItems[state.activeIndex].text;
      }

      void executeSearch(elements.queryInput.value);
    }

    if (event.key === "Escape") {
      closeDropdown();
      closeAuthModal();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-stage")) {
      closeDropdown();
      closeAttachMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAuthModal();
    }
  });

  elements.voiceButton.addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      elements.queryInput.focus();
      return;
    }

    if (state.recognition) {
      state.recognition.stop();
      return;
    }

    state.voicePreviousValue = elements.queryInput.value;
    state.voiceDraft = "";
    elements.queryInput.value = "";


    state.recognition = new SpeechRecognition();
    state.recognition.lang = "en-US";
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.maxAlternatives = 2;
    setVoiceUiState("recording");

    state.recognition.onresult = (event) => {
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";

        if (event.results[index].isFinal) {
          state.voiceDraft = `${state.voiceDraft} ${transcript}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim();
        }
      }

      const liveTranscript = `${state.voiceDraft} ${interimTranscript}`.trim();
      elements.queryInput.value = liveTranscript;

    };

    state.recognition.onerror = () => {
      state.recognition = null;
      const transcript = state.voiceDraft.trim();
      elements.queryInput.value = transcript || state.voicePreviousValue;
      clearVoiceDraft();
    };

    state.recognition.onend = () => {
      state.recognition = null;
      const transcript = state.voiceDraft.trim();

      if (transcript) {
        elements.queryInput.value = transcript;

        elements.queryInput.focus();
      } else {
        elements.queryInput.value = state.voicePreviousValue;

      }

      state.voicePreviousValue = "";
      clearVoiceDraft();
    };

    state.recognition.start();
  });

  elements.voiceStopButton.addEventListener("click", () => {
    if (state.recognition) {
      setVoiceUiState("idle");
      state.recognition.stop();
    }
  });

  elements.attachButton.addEventListener("click", (event) => {
    event.stopPropagation();
    elements.attachMenu.classList.toggle("is-open");
  });

  elements.searchButton.addEventListener("click", () => {
    void executeSearch(elements.queryInput.value);
  });

  elements.uploadImageButton.addEventListener("click", () => {
    closeAttachMenu();
    elements.imagePicker.click();
  });

  elements.uploadFileButton.addEventListener("click", () => {
    closeAttachMenu();
    elements.filePicker.click();
  });

  elements.imagePicker.addEventListener("change", () => {
    const files = Array.from(elements.imagePicker.files || []);
    handlePickedFiles(files);
    elements.imagePicker.value = "";
  });

  elements.filePicker.addEventListener("change", () => {
    const files = Array.from(elements.filePicker.files || []);
    handlePickedFiles(files);
    elements.filePicker.value = "";
  });
}

async function checkForLocalChanges() {
  if (!devRefreshState.isEnabled) {
    return;
  }

  try {
    const response = await fetch(`/api/dev/version?ts=${Date.now()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const nextVersion = String(payload.version || "");

    if (!nextVersion) {
      return;
    }

    if (devRefreshState.currentVersion === null) {
      devRefreshState.currentVersion = nextVersion;
      return;
    }

    if (devRefreshState.currentVersion !== nextVersion) {
      window.location.reload();
    }
  } catch {
    // Ignore transient dev refresh polling failures.
  }
}

function startLocalAutoRefresh() {
  if (!devRefreshState.isEnabled || devRefreshState.timerId !== null) {
    return;
  }

  void checkForLocalChanges();
  devRefreshState.timerId = window.setInterval(() => {
    void checkForLocalChanges();
  }, 1000);
}

function initializePage() {
  renderResults("");
  const authActions = document.querySelector(".auth-actions");
  if (authActions) {
    authActions.hidden = true;
  }
  elements.userProfile.hidden = true;
  closeDropdown();

  applySettingsUi();
  bindEvents();
  startLocalAutoRefresh();
  void loadTrendingTopics();
  void updateUserLocation();
  void checkSession();
}

initializePage();
