const historyKey = "ai-search-history";
const historySavingKey = "quair-history-saving";
const profilePrefsKey = "quair-profile-preferences";
const settingsPrefsKey = "quair-settings";
const knownAccountsKey = "quair-known-accounts";
const bookmarksKey = "quair-bookmarks";
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
  imagePreviewBackdrop: document.getElementById("imagePreviewBackdrop"),
  imagePreviewCloseButton: document.getElementById("imagePreviewCloseButton"),
  imagePreviewImage: document.getElementById("imagePreviewImage"),
  imagePreviewModal: document.getElementById("imagePreviewModal"),
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
  historyBackdrop: document.getElementById("historyBackdrop"),
  historyCloseButton: document.getElementById("historyCloseButton"),
  historyDeleteAllButton: document.getElementById("historyDeleteAllButton"),
  historyList: document.getElementById("historyList"),
  historyModal: document.getElementById("historyModal"),
  historySavingToggle: document.getElementById("historySavingToggle"),
  historyStatusLabel: document.getElementById("historyStatusLabel"),
  languageStatusLabel: document.getElementById("languageStatusLabel"),
  menuLanguage: document.getElementById("menuLanguage"),
  menuSafeSearch: document.getElementById("menuSafeSearch"),
  menuSearchHistory: document.getElementById("menuSearchHistory"),
  safeSearchStatusLabel: document.getElementById("safeSearchStatusLabel"),
  accountsList: document.getElementById("accountsList"),
  addAccountButton: document.getElementById("addAccountButton"),
  topBrandButton: document.getElementById("topBrandButton"),
  userProfile: document.getElementById("userProfile"),
  filterDateRange: document.getElementById("filterDateRange"),
  filterSite: document.getElementById("filterSite"),
  filterFileType: document.getElementById("filterFileType"),
  applyFilters: document.getElementById("applyFilters"),
  searchFilters: document.getElementById("searchFilters"),
  instantAnswer: document.getElementById("instantAnswer"),
  loadMoreWrap: document.getElementById("loadMoreWrap"),
  loadMoreButton: document.getElementById("loadMoreButton"),
  historyExportButton: document.getElementById("historyExportButton"),
  menuBookmarks: document.getElementById("menuBookmarks"),
  bookmarksModal: document.getElementById("bookmarksModal"),
  bookmarksBackdrop: document.getElementById("bookmarksBackdrop"),
  bookmarksCloseButton: document.getElementById("bookmarksCloseButton"),
  bookmarksList: document.getElementById("bookmarksList"),
  attachButton: document.getElementById("attachButton"),
  attachPreview: document.getElementById("attachPreview"),
  attachMenu: document.getElementById("attachMenu"),
  citations: document.getElementById("citations"),
  emptyState: document.getElementById("emptyState"),
  filePicker: document.getElementById("filePicker"),
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
  searchingStatus: document.getElementById("searchingStatus"),
  suggestPanel: document.getElementById("suggestPanel"),
  uploadAttachmentButton: document.getElementById("uploadAttachmentButton"),
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
  attachmentContext: "",
  attachments: [],
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
  lastSearchPayload: null,
  displayedResultCount: 0,
  resultPageSize: 8,
  previewHoverTimer: null,
};

const devRefreshState = {
  currentVersion: null,
  isEnabled: ["localhost", "127.0.0.1"].includes(window.location.hostname),
  timerId: null,
};

function getUserHistoryKey() {
  const user = state.profileUser;
  if (!user) return `${historyKey}:anonymous`;
  const id = String(user.id || user.email || user.username || "").trim().toLowerCase();
  return id ? `${historyKey}:${user.provider || "unknown"}:${id}` : `${historyKey}:anonymous`;
}

function isHistorySavingEnabled() {
  const raw = localStorage.getItem(historySavingKey);
  return raw === null ? true : raw === "true";
}

function setHistorySaving(enabled) {
  localStorage.setItem(historySavingKey, String(enabled));
  syncHistoryUiState();
}

function readHistoryEntries() {
  try {
    const rawValue = localStorage.getItem(getUserHistoryKey()) || "[]";
    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [];
    return parsedValue.map((item) => {
      if (typeof item === "string") return { id: generateEntryId(), query: item, timestamp: 0 };
      if (item && typeof item.query === "string") {
        if (!item.id) item.id = generateEntryId();
        return item;
      }
      return null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function readHistory() {
  return readHistoryEntries().map((e) => e.query);
}

function writeHistoryEntries(entries) {
  localStorage.setItem(getUserHistoryKey(), JSON.stringify(entries.slice(0, 50)));
}

function writeHistory(items) {
  const existing = readHistoryEntries();
  const merged = items.map((q) => {
    const found = existing.find((e) => e.query.toLowerCase() === q.toLowerCase());
    return found || { query: q, timestamp: Date.now() };
  });
  writeHistoryEntries(merged);
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
  const entries = readHistoryEntries().filter(
    (e) => e.query.toLowerCase() !== value.toLowerCase(),
  );
  writeHistoryEntries(entries);
  openDropdown(elements.queryInput.value);
}

function readBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(bookmarksKey) || "[]");
  } catch { return []; }
}

function writeBookmarks(items) {
  localStorage.setItem(bookmarksKey, JSON.stringify(items.slice(0, 200)));
}

function addBookmark(url, title, snippet) {
  const existing = readBookmarks();
  if (existing.some((b) => b.url === url)) return;
  existing.unshift({ url, title, snippet: snippet || "", timestamp: Date.now() });
  writeBookmarks(existing);
}

function removeBookmark(url) {
  writeBookmarks(readBookmarks().filter((b) => b.url !== url));
}

function isBookmarked(url) {
  return readBookmarks().some((b) => b.url === url);
}

function renderBookmarksList() {
  const bookmarks = readBookmarks();
  if (!bookmarks.length) {
    elements.bookmarksList.innerHTML = '<div class="history-empty">No bookmarks yet. Click the bookmark icon on search results to save them.</div>';
    return;
  }
  let html = "";
  for (const bm of bookmarks) {
    const host = (() => { try { return new URL(bm.url).hostname; } catch { return bm.url; } })();
    html += `<div class="history-entry">
      <img class="history-entry-favicon" src="https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}" alt="" />
      <div class="history-entry-body">
        <a class="history-entry-query" href="${escapeHtml(bm.url)}" target="_blank" rel="noreferrer noopener" style="text-decoration:none;color:inherit">${escapeHtml(bm.title)}</a>
        <span class="history-entry-source">${escapeHtml(host)}</span>
      </div>
      <button class="history-entry-delete" type="button" title="Remove bookmark" data-bm-url="${escapeHtml(bm.url)}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>`;
  }
  elements.bookmarksList.innerHTML = html;
  for (const btn of elements.bookmarksList.querySelectorAll("[data-bm-url]")) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeBookmark(btn.getAttribute("data-bm-url"));
      renderBookmarksList();
    });
  }
}

function openBookmarksModal() {
  renderBookmarksList();
  elements.bookmarksModal.classList.add("is-open");
  elements.bookmarksModal.setAttribute("aria-hidden", "false");
}

function closeBookmarksModal() {
  elements.bookmarksModal.classList.remove("is-open");
  elements.bookmarksModal.setAttribute("aria-hidden", "true");
}

function exportHistoryAs(format) {
  const entries = readHistoryEntries();
  if (!entries.length) return;
  let content = "";
  let mime = "application/json";
  let ext = "json";
  if (format === "csv") {
    const rows = [["Date", "Time", "Query"]];
    for (const e of entries) {
      const d = new Date(e.timestamp);
      rows.push([d.toLocaleDateString(), d.toLocaleTimeString(), `"${e.query.replace(/"/g, '""')}"`]);
    }
    content = rows.map((r) => r.join(",")).join("\n");
    mime = "text/csv";
    ext = "csv";
  } else {
    content = JSON.stringify(entries, null, 2);
  }
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `quair-search-history.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function tryInstantAnswer(query) {
  const trimmed = query.trim();
  const mathResult = tryCalculator(trimmed);
  if (mathResult) {
    elements.instantAnswer.hidden = false;
    elements.instantAnswer.innerHTML = `
      <span class="instant-answer-label">Calculator</span>
      <div class="instant-answer-expression">${escapeHtml(trimmed)}</div>
      <div class="instant-answer-value">${escapeHtml(mathResult)}</div>`;
    return true;
  }
  const unitResult = tryUnitConvert(trimmed);
  if (unitResult) {
    elements.instantAnswer.hidden = false;
    elements.instantAnswer.innerHTML = `
      <span class="instant-answer-label">Unit Converter</span>
      <div class="instant-answer-expression">${escapeHtml(trimmed)}</div>
      <div class="instant-answer-value">${escapeHtml(unitResult)}</div>`;
    return true;
  }
  elements.instantAnswer.hidden = true;
  return false;
}

function tryCalculator(expr) {
  const cleaned = expr.replace(/[^0-9+\-*/.()^%\s]/g, "").trim();
  if (!cleaned || !/\d/.test(cleaned)) return null;
  try {
    const safe = cleaned.replace(/\^/g, "**");
    const result = Function(`"use strict"; return (${safe})`)();
    if (typeof result === "number" && Number.isFinite(result)) {
      return result % 1 === 0 ? result.toLocaleString() : Number.parseFloat(result.toPrecision(12)).toLocaleString();
    }
  } catch { /* not a math expression */ }
  return null;
}

function tryUnitConvert(query) {
  const patterns = [
    { re: /([\d.]+)\s*(km|kilometers?)\s+(?:in|to)\s+(mi|miles?)/i, fn: (v) => `${(v * 0.621371).toFixed(4)} miles` },
    { re: /([\d.]+)\s*(mi|miles?)\s+(?:in|to)\s+(km|kilometers?)/i, fn: (v) => `${(v * 1.60934).toFixed(4)} km` },
    { re: /([\d.]+)\s*(kg|kilograms?)\s+(?:in|to)\s+(lbs?|pounds?)/i, fn: (v) => `${(v * 2.20462).toFixed(4)} lbs` },
    { re: /([\d.]+)\s*(lbs?|pounds?)\s+(?:in|to)\s+(kg|kilograms?)/i, fn: (v) => `${(v * 0.453592).toFixed(4)} kg` },
    { re: /([\d.]+)\s*°?[cf]\s+(?:in|to)\s+°?([cf])/i, fn: (v, m) => {
      const from = m[0].toLowerCase().includes("c") ? "c" : "f";
      const to = m[m.length - 1].toLowerCase();
      if (from === "c" && to === "f") return `${((v * 9 / 5) + 32).toFixed(2)} °F`;
      if (from === "f" && to === "c") return `${((v - 32) * 5 / 9).toFixed(2)} °C`;
      return null;
    }},
    { re: /([\d.]+)\s*(cm|centimeters?)\s+(?:in|to)\s+(in|inches?)/i, fn: (v) => `${(v * 0.393701).toFixed(4)} inches` },
    { re: /([\d.]+)\s*(in|inches?)\s+(?:in|to)\s+(cm|centimeters?)/i, fn: (v) => `${(v * 2.54).toFixed(4)} cm` },
    { re: /([\d.]+)\s*(m|meters?)\s+(?:in|to)\s+(ft|feet|foot)/i, fn: (v) => `${(v * 3.28084).toFixed(4)} feet` },
    { re: /([\d.]+)\s*(ft|feet|foot)\s+(?:in|to)\s+(m|meters?)/i, fn: (v) => `${(v * 0.3048).toFixed(4)} meters` },
    { re: /([\d.]+)\s*(l|liters?|litres?)\s+(?:in|to)\s+(gal|gallons?)/i, fn: (v) => `${(v * 0.264172).toFixed(4)} gallons` },
    { re: /([\d.]+)\s*(gal|gallons?)\s+(?:in|to)\s+(l|liters?|litres?)/i, fn: (v) => `${(v * 3.78541).toFixed(4)} liters` },
  ];
  for (const p of patterns) {
    const match = query.match(p.re);
    if (match) {
      const value = Number.parseFloat(match[1]);
      if (!Number.isFinite(value)) continue;
      const result = p.fn(value, match);
      if (result) return result;
    }
  }
  return null;
}

function removeHistoryEntry(entryId) {
  const entries = readHistoryEntries().filter((e) => e.id !== entryId);
  writeHistoryEntries(entries);
}

function clearAllHistory() {
  writeHistoryEntries([]);
}

function generateEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveHistory(query) {
  if (!isHistorySavingEnabled()) return;
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return;

  const entries = readHistoryEntries();
  entries.unshift({ id: generateEntryId(), query: trimmedQuery, timestamp: Date.now() });
  writeHistoryEntries(entries);
}

function setSearchStatus(message) {
  const text = (message || "").trim();

  elements.statusPill.textContent = text;
  elements.statusPill.classList.toggle("is-visible", Boolean(text));
  elements.resultsHead.style.display = text ? "flex" : "none";
}

function setSearchingStatus(message) {
  const text = (message || "").trim();

  if (elements.searchingStatus) {
    elements.searchingStatus.textContent = text;
    elements.searchingStatus.classList.toggle("is-visible", Boolean(text));
  }
}

function setSearchLoading(isLoading, message) {
  elements.searchShell.classList.toggle("is-loading", isLoading);
  elements.searchButton.disabled = isLoading;
  elements.queryInput.disabled = false;

  if (isLoading) {
    setSearchingStatus(message || "Searching live web...");
    setSearchStatus("");
  } else {
    setSearchingStatus("");
    setSearchStatus(message || "");
  }
}

function getEffectiveQuery() {
  return elements.queryInput.value.trim() || state.lastSubmittedQuery.trim();
}

function setActiveSearchTab(tabName) {
  for (const button of elements.searchTabs) {
    button.classList.toggle(
      "is-active",
      button.getAttribute("data-search-tab") === tabName,
    );
  }
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

  if (tabName === "mail") {
    const mailUrl = query
      ? `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`
      : "https://mail.google.com/mail/u/0/#inbox";
    window.open(mailUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if (tabName === "stocks") {
    const financeUrl = new URL("https://www.google.com/finance");
    if (query) {
      financeUrl.searchParams.set("q", query);
    }
    financeUrl.searchParams.set("hl", settings.displayLanguage);
    financeUrl.searchParams.set("gl", settings.region);
    window.open(financeUrl.toString(), "_blank", "noopener,noreferrer");
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
  } else if (tabName === "shopping") {
    url.searchParams.set("tbm", "shop");
  }

  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function openImagePreview(src) {
  if (!elements.imagePreviewModal || !elements.imagePreviewImage) {
    return;
  }

  elements.imagePreviewImage.src = src;
  elements.imagePreviewModal.classList.add("is-open");
  elements.imagePreviewModal.setAttribute("aria-hidden", "false");
}

function closeImagePreview() {
  if (!elements.imagePreviewModal || !elements.imagePreviewImage) {
    return;
  }

  elements.imagePreviewModal.classList.remove("is-open");
  elements.imagePreviewModal.setAttribute("aria-hidden", "true");
  elements.imagePreviewImage.src = "";
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

  for (const item of suggestions) {
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
  }

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
    let topResult = null;
    const response = await fetch(
      `/api/location/reverse?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
    );

    if (response.ok) {
      const payload = await response.json();
      topResult = payload.results?.[0] || null;
    } else {
      // If the backend reverse-geocode endpoint isn't available, fall back to a public reverse geocoder.
      const fallbackResponse = await fetch(
        `https://geocode.maps.co/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
      );
      if (fallbackResponse.ok) {
        const fallbackPayload = await fallbackResponse.json();
        const address = fallbackPayload.address || {};
        topResult = {
          areaName: address.suburb || address.neighbourhood || address.residential || "",
          cityName: address.city || address.town || address.village || "",
          stateName: address.state || "",
          countryName: address.country || "",
          pincode: address.postcode || "",
          formattedAddress: fallbackPayload.display_name || "",
        };
      }
    }

    if (!topResult) {
      return false;
    }

    const placeName = (
      topResult.areaName
      || topResult.cityName
      || topResult.stateName
      || topResult.countryName
      || topResult.formattedAddress
      || ""
    ).trim();
    const pincode = String(topResult.pincode || "").trim();
    const locationLabel = placeName
      ? (pincode ? `${placeName} - ${pincode}` : placeName)
      : "";

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

function routeToBackend(path) {
  window.location.href = path;
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

function buildResultCard(source) {
  const card = document.createElement("article");
  card.className = "result-card";
  const bookmarked = isBookmarked(source.url);
  card.innerHTML = `
    <button class="result-bookmark${bookmarked ? " is-bookmarked" : ""}" type="button" title="${bookmarked ? "Remove bookmark" : "Bookmark"}" data-bm-url="${escapeHtml(source.url)}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${bookmarked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    </button>
    <div class="result-url">${escapeHtml(source.url)}</div>
    <h3 class="result-title">
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(source.title)}</a>
    </h3>
    <p class="result-snippet">${escapeHtml(source.summary)}</p>
    <div class="result-preview-tooltip">${escapeHtml((source.summary || "").slice(0, 260))}${(source.summary || "").length > 260 ? "..." : ""}</div>
  `;
  const bmBtn = card.querySelector(".result-bookmark");
  bmBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isBookmarked(source.url)) {
      removeBookmark(source.url);
      bmBtn.classList.remove("is-bookmarked");
      bmBtn.querySelector("svg").setAttribute("fill", "none");
      bmBtn.title = "Bookmark";
    } else {
      addBookmark(source.url, source.title, source.summary);
      bmBtn.classList.add("is-bookmarked");
      bmBtn.querySelector("svg").setAttribute("fill", "currentColor");
      bmBtn.title = "Remove bookmark";
    }
  });
  const cardLink = card.querySelector(".result-title a");
  if (cardLink) {
    cardLink.addEventListener("click", () => {
      saveHistory(`${source.title} – ${(() => { try { return new URL(source.url).hostname; } catch { return source.url; } })()}`);
    });
  }
  return card;
}

function showMoreResults() {
  if (!state.lastSearchPayload) return;
  const sources = Array.isArray(state.lastSearchPayload.sources) ? state.lastSearchPayload.sources : [];
  const end = Math.min(state.displayedResultCount + state.resultPageSize, sources.length);
  for (let i = state.displayedResultCount; i < end; i++) {
    elements.results.appendChild(buildResultCard(sources[i]));
  }
  state.displayedResultCount = end;
  elements.loadMoreWrap.hidden = end >= sources.length;
}

function renderLiveResults(query, payload) {
  const sources = Array.isArray(payload.sources) ? payload.sources : [];
  state.lastSearchPayload = payload;
  state.displayedResultCount = 0;

  tryInstantAnswer(query);
  elements.searchFilters.hidden = false;

  renderOverview(query, payload.final_answer || "insufficient data", sources);
  elements.citations.innerHTML = "";
  elements.results.innerHTML = "";

  for (const source of sources.slice(0, 3)) {
    const link = document.createElement("a");
    link.className = "citation";
    link.href = source.url;
    link.target = "_blank";
    link.textContent = (() => { try { return new URL(source.url).hostname; } catch { return source.url; } })();
    link.rel = "noreferrer noopener";
    link.addEventListener("click", () => {
      saveHistory(`${source.title} – ${link.textContent}`);
    });
    elements.citations.appendChild(link);
  }

  const initialBatch = sources.slice(0, state.resultPageSize);
  for (const source of initialBatch) {
    elements.results.appendChild(buildResultCard(source));
  }
  state.displayedResultCount = initialBatch.length;
  elements.loadMoreWrap.hidden = sources.length <= state.resultPageSize;

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

  for (const button of Array.from(elements.suggestPanel.querySelectorAll(".suggest-item"))) {
    button.addEventListener("click", () => {
      const value = button.getAttribute("data-value") || "";
      elements.queryInput.value = value;
      void executeSearch(value);
    });
  }

  for (const button of Array.from(elements.suggestPanel.querySelectorAll(".history-delete"))) {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const value = button.getAttribute("data-delete") || "";
      removeHistoryItem(value);
    });
  }
}

function updateActiveItem() {
  for (const item of Array.from(elements.suggestPanel.querySelectorAll(".suggest-item"))) {
    const index = Number(item.getAttribute("data-index"));
    item.classList.toggle("is-active", index === state.activeIndex);
  }
}

async function executeSearch(query, attachmentContext = "", options = {}) {
  const trimmedQuery = query.trim();
  const displayQuery = String(options.displayQuery ?? trimmedQuery).trim() || trimmedQuery;
  const inputValue = typeof options.inputValue === "string" ? options.inputValue : trimmedQuery;
  const shouldSaveHistory = options.saveHistory !== false;
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
  elements.queryInput.value = inputValue;

  if (shouldSaveHistory) {
    saveHistory(trimmedQuery);
  }
  closeDropdown();
  tryInstantAnswer(trimmedQuery);
  setSearchLoading(true);
  state.lastSubmittedQuery = displayQuery;

  try {
    const translatedQuery = await translateQueryForSearch(trimmedQuery, settings.displayLanguage);
    let searchUrl = `/api/search?q=${encodeURIComponent(translatedQuery)}&region=${encodeURIComponent(settings.region)}&hl=${encodeURIComponent(settings.displayLanguage)}&safe_search=${encodeURIComponent(settings.safeSearch)}&context=${encodeURIComponent(attachmentContext)}`;
    const siteFilter = elements.filterSite?.value?.trim();
    if (siteFilter) searchUrl += `&site=${encodeURIComponent(siteFilter)}`;
    const dateFilter = elements.filterDateRange?.value;
    if (dateFilter) searchUrl += `&date_range=${encodeURIComponent(dateFilter)}`;
    const fileFilter = elements.filterFileType?.value;
    if (fileFilter) searchUrl += `&filetype=${encodeURIComponent(fileFilter)}`;
    const response = await fetch(searchUrl, { signal: state.searchController.signal });

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const payload = await response.json();

    if (searchToken !== state.activeSearchToken) {
      return;
    }

    renderLiveResults(displayQuery, payload);
    void applyPageLanguage(settings.displayLanguage);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error(error);
    renderErrorState(displayQuery, "Live search could not complete.");
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
    const region = getStoredSettings().region || "US";
    const response = await fetch(`/api/trending?geo=${encodeURIComponent(region)}`);

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

function getAttachmentKind(file) {
  const type = String(file?.type || "");
  if (type.startsWith("image/")) return "image";
  if (type.includes("pdf")) return "pdf";
  if (type.includes("spreadsheet") || type.includes("excel")) return "sheet";
  if (type.includes("word")) return "doc";
  if (type.includes("presentation") || type.includes("powerpoint")) return "slides";
  if (type.includes("text")) return "text";
  return "file";
}

function getFileExtension(name) {
  const value = String(name || "");
  const lastDot = value.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === value.length - 1) return "";
  return value.slice(lastDot + 1).toLowerCase();
}

function getAttachmentIconMeta(item) {
  const ext = getFileExtension(item?.name);
  const kind = item?.kind || "file";
  const key = kind === "file" && ext ? ext : kind;

  const meta = {
    label: "",
    className: "is-generic",
    glyph: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
    `,
  };

  if (key === "pdf") {
    meta.label = "PDF";
    meta.className = "is-pdf";
  } else if (key === "sheet" || key === "xlsx" || key === "xls" || key === "csv") {
    meta.label = "XLS";
    meta.className = "is-sheet";
  } else if (key === "doc" || key === "docx") {
    meta.label = "DOC";
    meta.className = "is-doc";
  } else if (key === "slides" || key === "ppt" || key === "pptx") {
    meta.label = "PPT";
    meta.className = "is-slides";
  } else if (key === "text" || key === "txt" || key === "json") {
    meta.label = "TXT";
    meta.className = "is-text";
  }

  return meta;
}

function clearAttachments() {
  for (const item of state.attachments) {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  }
  state.attachments = [];
  state.attachmentContext = "";
  if (elements.attachPreview) {
    elements.attachPreview.classList.remove("is-visible");
    elements.attachPreview.innerHTML = "";
  }
}

function renderAttachments() {
  if (!elements.attachPreview) return;

  if (!state.attachments.length) {
    elements.attachPreview.classList.remove("is-visible");
    elements.attachPreview.innerHTML = "";
    return;
  }

  const chips = state.attachments.map((item) => {
    const isImage = item.kind === "image" && item.previewUrl;
    const iconMeta = isImage ? null : getAttachmentIconMeta(item);
    const iconHtml = isImage
      ? `<img class="attach-chip-thumb" src="${escapeAttribute(item.previewUrl)}" alt="" />`
      : `
        <span class="attach-chip-icon ${escapeAttribute(iconMeta.className)}" aria-hidden="true">
          ${iconMeta.glyph}
          ${iconMeta.label ? `<span class="attach-chip-badge">${escapeHtml(iconMeta.label)}</span>` : ""}
        </span>
      `;

    const fileNameHtml = isImage
      ? ""
      : `<span class="attach-chip-name">${escapeHtml(item.name)}</span>`;

    return `
      <span class="attach-chip${isImage ? " is-image" : " is-file"}" data-attachment-id="${escapeAttribute(item.id)}"${isImage ? ` data-preview-src="${escapeAttribute(item.previewUrl)}"` : ""}>
        ${iconHtml}
        ${fileNameHtml}
        <button class="attach-chip-remove" type="button" aria-label="Remove attachment" data-attachment-remove="${escapeAttribute(item.id)}">×</button>
      </span>
    `;
  }).join("");

  elements.attachPreview.innerHTML = chips;
  elements.attachPreview.classList.add("is-visible");

  for (const button of Array.from(elements.attachPreview.querySelectorAll("[data-attachment-remove]"))) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearAttachments();
    });
  }

  for (const chip of Array.from(elements.attachPreview.querySelectorAll(".attach-chip.is-image"))) {
    chip.addEventListener("click", () => {
      const src = chip.getAttribute("data-preview-src") || "";
      if (src) {
        openImagePreview(src);
      }
    });
  }
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
    const attachmentQuery = String(payload.search_query || "").trim()
      || "Summarize the uploaded attachment and explain the important details.";
    const attachmentSummary = String(payload.summary || "").trim();

    clearAttachments();
    state.attachments = files.slice(0, 3).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      kind: getAttachmentKind(file),
      mime: file.type || "",
      previewUrl: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    state.attachmentContext = attachmentSummary;
    renderAttachments();
    await executeSearch(attachmentQuery, attachmentSummary, {
      displayQuery: files[0]?.name || "Attachment analysis",
      inputValue: "",
      saveHistory: false,
    });
    elements.queryInput.value = "";
    elements.queryInput.focus();
  } catch (error) {
    console.error(error);
    clearAttachments();
    state.attachments = files.slice(0, 3).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      kind: getAttachmentKind(file),
      mime: file.type || "",
      previewUrl: file.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
    }));
    state.attachmentContext = "Uploaded file analysis unavailable.";
    renderAttachments();
    elements.queryInput.value = "";
    elements.queryInput.focus();
    renderErrorState(files[0]?.name || "Attachment analysis", "Attachment analysis unavailable.");
    setSearchLoading(false, "");
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

  for (const element of document.querySelectorAll("[placeholder], [aria-label], [title]")) {
    if (!attrOriginalMap.has(element)) {
      attrOriginalMap.set(element, {
        placeholder: element.getAttribute("placeholder"),
        ariaLabel: element.getAttribute("aria-label"),
        title: element.getAttribute("title"),
      });
      translatableAttrTargets.push(element);
    }
  }
}

function restoreOriginalLanguage() {
  for (const node of translatableTextNodes) {
    const originalText = textNodeOriginalMap.get(node);
    if (typeof originalText === "string") {
      node.nodeValue = originalText;
    }
  }

  for (const element of translatableAttrTargets) {
    const originalAttrs = attrOriginalMap.get(element);
    if (!originalAttrs) {
      return;
    }

    const restorePairs = [
      ["placeholder", originalAttrs.placeholder],
      ["aria-label", originalAttrs.ariaLabel],
      ["title", originalAttrs.title],
    ];

    for (const [attrName, attrValue] of restorePairs) {
      if (typeof attrValue === "string") {
        element.setAttribute(attrName, attrValue);
      } else {
        element.removeAttribute(attrName);
      }
    }
  }
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
  for (const element of translatableAttrTargets) {
    const originalAttrs = attrOriginalMap.get(element);
    if (!originalAttrs) {
      continue;
    }

    const attrPairs = [
      ["placeholder", originalAttrs.placeholder],
      ["aria-label", originalAttrs.ariaLabel],
      ["title", originalAttrs.title],
    ];

    for (const [attrName, attrValue] of attrPairs) {
      if (typeof attrValue === "string" && attrValue.trim()) {
        attrPayload.push({
          element,
          attrName,
          source: attrValue,
        });
      }
    }
  }

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

    for (const [index, item] of textNodesPayload.entries()) {
      item.node.nodeValue = translatedValues[index] || item.source;
    }

    for (const [attrIndex, item] of attrPayload.entries()) {
      const translatedIndex = textNodesPayload.length + attrIndex;
      item.element.setAttribute(item.attrName, translatedValues[translatedIndex] || item.source);
    }
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

function getKnownAccounts() {
  try {
    const raw = localStorage.getItem(knownAccountsKey);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveKnownAccount(user) {
  if (!user || !user.email) return;
  const accounts = getKnownAccounts();
  const idx = accounts.findIndex((a) => a.email?.toLowerCase() === user.email.toLowerCase());
  const entry = {
    provider: user.provider || "google",
    id: user.id || "",
    name: user.name || "",
    email: user.email || "",
    picture: user.picture || "",
  };
  if (idx >= 0) { accounts[idx] = entry; } else { accounts.push(entry); }
  const capped = accounts.slice(0, 3);
  localStorage.setItem(knownAccountsKey, JSON.stringify(capped));
}

function removeKnownAccount(user) {
  if (!user?.email) {
    return [];
  }

  const nextAccounts = getKnownAccounts().filter(
    (account) => account.email?.toLowerCase() !== user.email.toLowerCase(),
  );
  localStorage.setItem(knownAccountsKey, JSON.stringify(nextAccounts));
  return nextAccounts;
}

function getFallbackAccount(accounts, excludedEmail = "") {
  const excluded = String(excludedEmail || "").trim().toLowerCase();
  return accounts.find((account) => account.email?.toLowerCase() !== excluded) || null;
}

function renderAccountsList() {
  if (!elements.accountsList) return;
  const accounts = getKnownAccounts();
  const currentEmail = state.profileUser?.email?.toLowerCase() || "";
  if (accounts.length <= 1) {
    elements.accountsList.innerHTML = "";
    return;
  }
  let html = "";
  for (const acct of accounts) {
    const isCurrent = acct.email?.toLowerCase() === currentEmail;
    const initials = getInitials(acct.name);
    const avatarHtml = acct.picture
      ? `<img class="account-item-avatar" src="${acct.picture}" alt="" />`
      : `<span class="account-item-fallback">${initials}</span>`;
    const checkHtml = isCurrent
      ? '<svg class="account-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : "";
    const removeHtml = !isCurrent
      ? `<button class="account-item-remove" type="button" title="Remove account" data-remove-email="${(acct.email || "").replace(/"/g, "&quot;")}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`
      : "";
    const escapedEmail = (acct.email || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const escapedName = (acct.name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    html += `<div class="account-item" data-switch-email="${escapedEmail}">
      ${avatarHtml}
      <div class="account-item-info">
        <span class="account-item-name">${escapedName}</span>
        <span class="account-item-email">${escapedEmail}</span>
      </div>
      ${checkHtml}${removeHtml}
    </div>`;
  }
  elements.accountsList.innerHTML = html;

  for (const item of elements.accountsList.querySelectorAll("[data-switch-email]")) {
    item.addEventListener("click", (e) => {
      if (e.target.closest("[data-remove-email]")) return;
      const email = item.getAttribute("data-switch-email");
      if (email?.toLowerCase() !== currentEmail) {
        routeToBackend(`/api/auth/google/login?login_hint=${encodeURIComponent(email)}&expected_email=${encodeURIComponent(email)}`);
      }
    });
  }

  for (const btn of elements.accountsList.querySelectorAll("[data-remove-email]")) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const email = btn.getAttribute("data-remove-email");
      removeKnownAccount({ email });
      renderAccountsList();
    });
  }
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
    picture: user.picture || prefs.avatarUrl || "",
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
    elements.profilePanelDescription.textContent = "";
  }

  if (isSettings) {
    elements.profilePanelTitle.textContent = "Settings";
    elements.profilePanelDescription.textContent = "";
  }

  void applyPageLanguage(getStoredSettings().displayLanguage);
}

function applyGoogleTranslate(langCode) {
  const targetLang = (langCode || "en").split("-")[0].toLowerCase();
  if (targetLang === "en") {
    const frame = document.querySelector(".goog-te-banner-frame");
    if (frame) frame.remove();
    const container = document.getElementById("google_translate_element");
    if (container) container.innerHTML = "";
    document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.body.style.top = "";
    return;
  }
  document.cookie = `googtrans=/en/${targetLang}; path=/;`;
  if (!document.getElementById("gt-script")) {
    const container = document.getElementById("google_translate_element");
    if (!container) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      document.body.appendChild(div);
    }
    window.googleTranslateElementInit = () => {
      new google.translate.TranslateElement({
        pageLanguage: "en",
        autoDisplay: false,
      }, "google_translate_element");
    };
    const script = document.createElement("script");
    script.id = "gt-script";
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);
  } else {
    const combo = document.querySelector(".goog-te-combo");
    if (combo) {
      combo.value = targetLang;
      combo.dispatchEvent(new Event("change"));
    }
  }
}

function persistSettingsFromUi() {
  translationCache.clear();
  const newSettings = getSettingsFromUi();
  writeJsonStorage(settingsPrefsKey, newSettings);

  applySettingsUi();
  syncHistoryUiState();
  applyGoogleTranslate(newSettings.displayLanguage);
  void loadTrendingTopics();
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
  saveKnownAccount(state.profileUser);
  renderAccountsList();
  if (elements.addAccountButton) {
    elements.addAccountButton.style.display = getKnownAccounts().length >= 3 ? "none" : "";
  }
}

function showLoggedOutUI() {
  document.querySelector(".auth-actions").hidden = false;
  elements.userProfile.hidden = true;
  elements.profileDropdown.hidden = true;
  elements.avatarButton.setAttribute("aria-expanded", "false");
  state.profileUser = null;
  closeProfilePanel();
}

function syncHistoryUiState() {
  const saving = isHistorySavingEnabled();
  if (elements.historyStatusLabel) {
    elements.historyStatusLabel.textContent = saving ? "Saving" : "Not saving";
  }
  if (elements.historySavingToggle) {
    elements.historySavingToggle.checked = saving;
  }
  const toggleLabel = document.querySelector(".history-toggle-label");
  if (toggleLabel) {
    toggleLabel.textContent = saving ? "Saving" : "Paused";
  }
  const settings = getStoredSettings();
  if (elements.safeSearchStatusLabel) {
    const labels = { moderate: "Moderate", strict: "Strict", off: "Off" };
    elements.safeSearchStatusLabel.textContent = labels[settings.safeSearch] || "Moderate";
  }
  if (elements.languageStatusLabel) {
    const langTag = settings.displayLanguage || "en-US";
    try {
      const dn = new Intl.DisplayNames([langTag], { type: "language" });
      elements.languageStatusLabel.textContent = dn.of(langTag) || langTag;
    } catch {
      elements.languageStatusLabel.textContent = langTag;
    }
  }
}

function formatHistoryDate(ts) {
  if (!ts) return "Older";
  const locale = getStoredSettings().displayLanguage || undefined;
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const formattedDate = d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (isToday) return `${rtf.format(0, "day")} - ${formattedDate}`;
    if (isYesterday) return `${rtf.format(-1, "day")} - ${formattedDate}`;
  } catch {
    if (isToday) return `Today - ${formattedDate}`;
    if (isYesterday) return `Yesterday - ${formattedDate}`;
  }

  return formattedDate;
}

function formatHistoryTime(ts) {
  if (!ts) return "";
  const locale = getStoredSettings().displayLanguage || undefined;
  return new Date(ts).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function renderHistoryList() {
  const entries = readHistoryEntries();
  if (!entries.length) {
    elements.historyList.innerHTML = '<div class="history-empty">No search history yet.</div>';
    void applyPageLanguage(getStoredSettings().displayLanguage);
    return;
  }

  const grouped = new Map();
  for (const entry of entries) {
    const key = formatHistoryDate(entry.timestamp);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }

  let html = "";
  for (const [dateLabel, items] of grouped) {
    html += `<div class="history-date-group"><h3 class="history-date-heading">${dateLabel}</h3>`;
    for (const item of items) {
      const time = formatHistoryTime(item.timestamp);
      const escapedQuery = item.query.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const entryId = (item.id || "").replace(/"/g, "&quot;");
      html += `<div class="history-entry">
        <span class="history-entry-time">${time}</span>
        <img class="history-entry-favicon" src="https://www.google.com/s2/favicons?sz=32&domain=quairsearch.com" alt="" />
        <div class="history-entry-body">
          <span class="history-entry-query">${escapedQuery}</span>
          <span class="history-entry-source">QuAir Search</span>
        </div>
        <button class="history-entry-delete" type="button" title="Delete from history" data-entry-id="${entryId}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>`;
    }
    html += "</div>";
  }
  elements.historyList.innerHTML = html;

  for (const btn of elements.historyList.querySelectorAll("[data-entry-id]")) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeHistoryEntry(btn.getAttribute("data-entry-id"));
      renderHistoryList();
    });
  }

  void applyPageLanguage(getStoredSettings().displayLanguage);
}

function openHistoryModal() {
  syncHistoryUiState();
  renderHistoryList();
  elements.historyModal.classList.add("is-open");
  elements.historyModal.setAttribute("aria-hidden", "false");
}

function closeHistoryModal() {
  elements.historyModal.classList.remove("is-open");
  elements.historyModal.setAttribute("aria-hidden", "true");
}

function toggleProfileDropdown() {
  const isOpen = !elements.profileDropdown.hidden;
  elements.profileDropdown.hidden = isOpen;
  elements.avatarButton.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) {
    syncHistoryUiState();
    renderAccountsList();
  }
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
  const signedOutUser = state.profileUser;
  const remainingAccounts = removeKnownAccount(signedOutUser);
  showLoggedOutUI();
  renderAccountsList();

  const fallbackAccount = getFallbackAccount(remainingAccounts, signedOutUser?.email);
  if (fallbackAccount?.email) {
    routeToBackend(`/api/auth/google/login?login_hint=${encodeURIComponent(fallbackAccount.email)}&expected_email=${encodeURIComponent(fallbackAccount.email)}`);
  }
}

function bindEvents() {
  elements.topBrandButton.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.reload();
  });

  for (const button of document.querySelectorAll("[data-auth-trigger]")) {
    button.addEventListener("click", () => {
      openAuthModal(button.getAttribute("data-auth-trigger") || "login");
    });
  }

  elements.authCloseButton.addEventListener("click", closeAuthModal);
  elements.authBackdrop.addEventListener("click", closeAuthModal);
  elements.imagePreviewCloseButton.addEventListener("click", closeImagePreview);
  elements.imagePreviewBackdrop.addEventListener("click", closeImagePreview);

  elements.authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = elements.authEmailInput.value.trim();
    if (email) {
      routeToBackend(`/api/auth/google/login?login_hint=${encodeURIComponent(email)}&expected_email=${encodeURIComponent(email)}`);
    }
  });

  for (const button of document.querySelectorAll("[data-provider]")) {
    button.addEventListener("click", () => {
      const provider = button.getAttribute("data-provider");
      if (provider === "Google") {
        const email = elements.authEmailInput.value.trim();
        const query = email
          ? `?login_hint=${encodeURIComponent(email)}&expected_email=${encodeURIComponent(email)}`
          : "";
        routeToBackend(`/api/auth/google/login${query}`);
      }
      if (provider === "X") { routeToBackend("/api/auth/twitter/login"); }
    });
  }

  elements.avatarButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileDropdown();
  });

  elements.logoutButton.addEventListener("click", () => {
    toggleProfileDropdown();
    void handleLogout();
  });

  for (const button of document.querySelectorAll("[data-profile-panel]")) {
    button.addEventListener("click", () => {
      elements.profileDropdown.hidden = true;
      elements.avatarButton.setAttribute("aria-expanded", "false");
      openProfilePanel(button.getAttribute("data-profile-panel") || "overview");
    });
  }

  elements.profileCloseButton.addEventListener("click", closeProfilePanel);
  elements.profileBackdrop.addEventListener("click", closeProfilePanel);

  elements.menuSearchHistory.addEventListener("click", () => {
    elements.profileDropdown.hidden = true;
    elements.avatarButton.setAttribute("aria-expanded", "false");
    openHistoryModal();
  });

  elements.menuSafeSearch.addEventListener("click", () => {
    elements.profileDropdown.hidden = true;
    elements.avatarButton.setAttribute("aria-expanded", "false");
    openProfilePanel("settings");
  });

  elements.menuLanguage.addEventListener("click", () => {
    elements.profileDropdown.hidden = true;
    elements.avatarButton.setAttribute("aria-expanded", "false");
    openProfilePanel("settings");
  });

  elements.historyCloseButton.addEventListener("click", closeHistoryModal);
  elements.historyBackdrop.addEventListener("click", closeHistoryModal);

  elements.historySavingToggle.addEventListener("change", () => {
    setHistorySaving(elements.historySavingToggle.checked);
  });

  elements.historyDeleteAllButton.addEventListener("click", () => {
    clearAllHistory();
    renderHistoryList();
  });

  elements.addAccountButton.addEventListener("click", () => {
    elements.profileDropdown.hidden = true;
    elements.avatarButton.setAttribute("aria-expanded", "false");
    routeToBackend("/api/auth/google/login");
  });

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

  const settingsSelects = [
    elements.settingDisplayLanguage,
    elements.settingRegion,
    elements.settingTheme,
    elements.settingSafeSearch,
  ];

  for (const selectElement of settingsSelects) {
    selectElement.addEventListener("change", () => {
      persistSettingsFromUi();
    });
  }

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

  for (const button of elements.searchTabs) {
    button.addEventListener("click", () => {
      const tabName = button.getAttribute("data-search-tab") || "all";
      setActiveSearchTab(tabName);

      if (tabName === "all") {
        void executeSearch(getEffectiveQuery(), state.attachmentContext);
        return;
      }

      openSearchVertical(tabName);
    });
  }

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

      void executeSearch(elements.queryInput.value, state.attachmentContext);
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
      closeImagePreview();
      closeHistoryModal();
      closeBookmarksModal();
    }

    const tag = document.activeElement?.tagName;
    const isTyping = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable;

    if (!isTyping && event.key === "/" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      elements.queryInput.focus();
    }

    if (!isTyping && event.key === "b" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      openBookmarksModal();
    }

    if (!isTyping && event.key === "h" && (event.ctrlKey || event.metaKey) && event.shiftKey) {
      event.preventDefault();
      openHistoryModal();
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
    void executeSearch(elements.queryInput.value, state.attachmentContext);
  });

  elements.uploadAttachmentButton.addEventListener("click", () => {
    closeAttachMenu();
    elements.filePicker.click();
  });

  elements.filePicker.addEventListener("change", () => {
    const files = Array.from(elements.filePicker.files || []);
    handlePickedFiles(files);
    elements.filePicker.value = "";
  });

  if (elements.loadMoreButton) {
    elements.loadMoreButton.addEventListener("click", showMoreResults);
  }

  if (elements.applyFilters) {
    elements.applyFilters.addEventListener("click", () => {
      void executeSearch(elements.queryInput.value, state.attachmentContext);
    });
  }

  if (elements.menuBookmarks) {
    elements.menuBookmarks.addEventListener("click", () => {
      elements.profileDropdown.hidden = true;
      elements.avatarButton.setAttribute("aria-expanded", "false");
      openBookmarksModal();
    });
  }

  if (elements.bookmarksCloseButton) {
    elements.bookmarksCloseButton.addEventListener("click", closeBookmarksModal);
  }
  if (elements.bookmarksBackdrop) {
    elements.bookmarksBackdrop.addEventListener("click", closeBookmarksModal);
  }

  if (elements.historyExportButton) {
    elements.historyExportButton.addEventListener("click", () => {
      exportHistoryAs("json");
    });
  }
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

async function initializePage() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("auth") || params.has("auth_error")) {
    window.history.replaceState({}, "", "/");
  }

  renderResults("");
  const authActions = document.querySelector(".auth-actions");
  if (authActions) {
    authActions.hidden = true;
  }
  elements.userProfile.hidden = true;
  closeDropdown();
  clearAttachments();

  applySettingsUi();
  bindEvents();
  startLocalAutoRefresh();
  await checkSession();
  const savedLang = getStoredSettings().displayLanguage;
  if (savedLang && savedLang.split("-")[0].toLowerCase() !== "en") {
    applyGoogleTranslate(savedLang);
  }
  void loadTrendingTopics();
  void updateUserLocation();
}

initializePage();
