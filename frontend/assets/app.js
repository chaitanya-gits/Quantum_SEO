const staticDataset = {
  "what is reciprocal rank fusion in search?": {
    answer:
      "Reciprocal Rank Fusion combines multiple ranked lists by assigning each result a position-based contribution from every retrieval method. It is effective for hybrid search because BM25 and vector retrieval can each elevate useful documents without requiring raw score normalization.",
    citations: [
      "https://example.com/rrf",
      "https://example.com/hybrid-search",
    ],
    suggestions: [
      "reciprocal rank fusion formula",
      "rrf in hybrid retrieval",
      "how reranking works after rrf",
    ],
    results: [
      {
        title: "Reciprocal Rank Fusion Explained",
        url: "https://example.com/rrf",
        snippet:
          "RRF sums a reciprocal score from each ranked list so documents that consistently appear near the top are rewarded, even when ranking systems use incompatible scoring scales.",
      },
      {
        title: "Hybrid Retrieval Pipeline",
        url: "https://example.com/hybrid-search",
        snippet:
          "A practical search stack issues BM25 and dense vector retrieval in parallel, fuses the candidates, then sends the top results to a cross-encoder for final re-ranking.",
      },
      {
        title: "Cross-Encoder Re-ranking",
        url: "https://example.com/cross-encoder",
        snippet:
          "Cross-encoders jointly read the query and each document candidate, improving relevance in the top positions at the cost of latency.",
      },
    ],
    relatedQueries: [
      "bm25 vs vector search",
      "what is cross encoder reranking",
      "hybrid retrieval architecture",
    ],
  },
  "bm25 vs vector search": {
    answer:
      "BM25 is best at lexical precision and exact token overlap, while vector retrieval captures semantic similarity across paraphrases and related phrasing. Modern search engines typically combine both and let a reranker refine the top results.",
    citations: [
      "https://example.com/bm25",
      "https://example.com/vector",
    ],
    suggestions: [
      "semantic retrieval examples",
      "when to use bm25",
      "dense retrieval architecture",
    ],
    results: [
      {
        title: "BM25 Sparse Retrieval",
        url: "https://example.com/bm25",
        snippet:
          "BM25 scores exact and near-exact textual overlap, which makes it strong for precise informational and navigational queries.",
      },
      {
        title: "Dense Retrieval with Embeddings",
        url: "https://example.com/vector",
        snippet:
          "Embedding retrieval matches intent and meaning, enabling better recall for conceptual searches where document wording differs from the user query.",
      },
    ],
    relatedQueries: [
      "hybrid retrieval architecture",
      "what is semantic retrieval",
      "why rerank top 50 documents",
    ],
  },
  "how pagerank affects ranking": {
    answer:
      "PageRank contributes an authority prior. It does not replace lexical or semantic relevance, but it can boost documents that are strongly connected in the link graph and therefore more likely to be trusted or important.",
    citations: ["https://example.com/pagerank"],
    suggestions: [
      "pagerank formula explained",
      "authority signals in search",
      "freshness vs authority ranking",
    ],
    results: [
      {
        title: "PageRank as Authority Prior",
        url: "https://example.com/pagerank",
        snippet:
          "PageRank models how authority flows through a link graph and is often used as a secondary signal layered on top of retrieval relevance.",
      },
    ],
    relatedQueries: [
      "authority signals in search",
      "bm25 vs vector search",
      "freshness decay ranking",
    ],
  },
};

const historyKey = "ai-search-history";
const defaultSearchPlaceholder = "Search anything";

const elements = {
  answerText: document.getElementById("answerText"),
  answerWrap: document.getElementById("aiAnswer"),
  attachButton: document.getElementById("attachButton"),
  attachMenu: document.getElementById("attachMenu"),
  citations: document.getElementById("citations"),
  clearButton: document.getElementById("clearButton"),
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
  recognition: null,
  searchController: null,
  voiceDraft: "",
  voicePreviousValue: "",
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

function normalizeLookup(value) {
  return value.trim().toLowerCase();
}

function buildSuggestionPool() {
  const combinedItems = [...readHistory(), ...state.liveSuggestions];
  const seenItems = new Set();

  return combinedItems.filter((item) => {
    const key = normalizeLookup(item);

    if (!key || seenItems.has(key)) {
      return false;
    }

    seenItems.add(key);
    return true;
  });
}

function getStaticState(query) {
  const normalizedQuery = query.trim().toLowerCase();
  return staticDataset[normalizedQuery] || null;
}

function updateClearButton() {
  elements.clearButton.classList.toggle(
    "is-visible",
    Boolean(elements.queryInput.value.trim()),
  );
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

function setVoiceUiState(mode) {
  const isVisible = mode !== "idle";

  elements.searchShell.classList.toggle("is-voice-mode", isVisible);
  elements.voiceFeedback.classList.toggle("is-visible", isVisible);
  elements.voiceStopButton.classList.toggle("is-visible", mode === "recording");
  elements.voiceButton.style.opacity = mode === "recording" ? "0.55" : "1";
  elements.queryInput.placeholder =
    mode === "recording" ? "Listening..." : defaultSearchPlaceholder;
}

function clearVoiceDraft() {
  state.voiceDraft = "";
  setVoiceUiState("idle");
  updateClearButton();
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
    .slice(0, 4)
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
    setSuggestedQuestions([], "");
    elements.emptyState.style.display = "block";
    elements.emptyState.textContent = "";
    setSearchStatus("");
    return;
  }

  const localState = getStaticState(trimmedQuery);

  if (!localState) {
    elements.answerWrap.classList.add("is-visible");
    renderOverview(trimmedQuery, "No cached preview is available for this query.", []);
    elements.citations.innerHTML = "";
    elements.results.innerHTML = "";
    setSuggestedQuestions(buildFollowUpQuestions(trimmedQuery, []), trimmedQuery);
    elements.emptyState.style.display = "block";
    elements.emptyState.textContent = "Try a live search.";
    return;
  }

  renderOverview(
    trimmedQuery,
    localState.answer,
    localState.results.map((result) => ({
      title: result.title,
      url: result.url,
      summary: result.snippet,
    })),
  );

  elements.citations.innerHTML = "";
  elements.results.innerHTML = "";

  localState.citations.forEach((citation) => {
    const link = document.createElement("a");
    link.className = "citation";
    link.href = citation;
    link.textContent = new URL(citation).hostname;
    link.rel = "noreferrer noopener";
    elements.citations.appendChild(link);
  });

  localState.results.forEach((result) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.innerHTML = `
      <div class="result-url">${escapeHtml(result.url)}</div>
      <h3 class="result-title">
        <a href="${escapeHtml(result.url)}" rel="noreferrer noopener">${escapeHtml(result.title)}</a>
      </h3>
      <p class="result-snippet">${escapeHtml(result.snippet)}</p>
    `;
    elements.results.appendChild(card);
  });

  setSuggestedQuestions(localState.relatedQueries, trimmedQuery);
  elements.answerWrap.classList.add("is-visible");
  setSearchStatus("");
  elements.emptyState.style.display = localState.results.length === 0 ? "block" : "none";
  elements.emptyState.textContent = localState.results.length === 0 ? "No matching results found." : "";
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
  const suggestionPool = buildSuggestionPool();

  const suggestionMatches = suggestionPool
    .filter((item) => (normalizedQuery ? item.toLowerCase().startsWith(normalizedQuery) : false))
    .slice(0, 8)
    .map((item) => ({ type: "suggestion", text: item }));

  const trendingMatches = !normalizedQuery
    ? state.liveSuggestions.slice(0, 8).map((item) => ({ type: "trending", text: item }))
    : [];

  return {
    history: [],
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
  state.activeItems = query.trim() ? [...groups.suggestions] : [...groups.trending];

  if (!state.activeItems.length) {
    closeDropdown();
    return;
  }

  elements.suggestPanel.innerHTML = query.trim()
    ? renderGroup("Suggestions", groups.suggestions, 0)
    : renderGroup("Trending searches", groups.trending, 0);

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

async function executeSearch(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    renderResults("");
    closeDropdown();
    updateClearButton();
    return;
  }

  if (state.searchController) {
    state.searchController.abort();
  }

  const searchToken = ++state.activeSearchToken;
  state.searchController = new AbortController();
  elements.queryInput.value = trimmedQuery;
  updateClearButton();
  saveHistory(trimmedQuery);
  closeDropdown();
  setSearchLoading(true);
  state.lastSubmittedQuery = trimmedQuery;

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
      signal: state.searchController.signal,
    });

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const payload = await response.json();

    if (searchToken !== state.activeSearchToken) {
      return;
    }

    renderLiveResults(trimmedQuery, payload);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    const fallbackState = getStaticState(trimmedQuery);

    if (fallbackState) {
      renderResults(trimmedQuery);
      setSearchStatus("Live search timed out. Showing local preview");
      return;
    }

    console.error(error);
    renderErrorState(trimmedQuery, "Live search could not complete.");
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

  const summary =
    files.length === 1
      ? `Analyze file: ${files[0].name}`
      : `Analyze files: ${files.length} selected`;

  elements.queryInput.value = summary;
  void executeSearch(summary);
}

function bindEvents() {
  elements.queryInput.addEventListener("focus", () => {
    openDropdown(elements.queryInput.value);
  });

  elements.queryInput.addEventListener("input", () => {
    updateClearButton();

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
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".search-stage")) {
      closeDropdown();
      closeAttachMenu();
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
    updateClearButton();

    state.recognition = new SpeechRecognition();
    state.recognition.lang = "en-US";
    state.recognition.interimResults = false;
    state.recognition.maxAlternatives = 1;
    setVoiceUiState("recording");

    state.recognition.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";

        if (event.results[index].isFinal) {
          state.voiceDraft = `${state.voiceDraft} ${transcript}`.trim();
        }
      }
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
        updateClearButton();
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

  elements.clearButton.addEventListener("click", () => {
    if (state.searchController) {
      state.searchController.abort();
      state.searchController = null;
    }

    if (state.recognition) {
      state.recognition.stop();
    }

    clearVoiceDraft();
    state.activeSearchToken += 1;
    elements.queryInput.value = "";
    updateClearButton();
    setSearchLoading(false, "");
    renderResults("");
    elements.queryInput.focus();
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

function initializePage() {
  renderResults("");
  closeDropdown();
  updateClearButton();
  bindEvents();
  void loadTrendingTopics();
  void updateUserLocation();
}

initializePage();
