import { createServer } from "node:http";
import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, join, normalize } from "node:path";
import { URL } from "node:url";

const host = "127.0.0.1";
const port = 3000;
const root = process.cwd();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ts": "text/plain; charset=utf-8",
  ".tsx": "text/plain; charset=utf-8"
};

async function loadDotEnv() {
  const envPath = join(root, ".env");
  try {
    await access(envPath, constants.F_OK);
  } catch {
    return;
  }

  const raw = await readFile(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const splitIndex = trimmed.indexOf("=");
    if (splitIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, splitIndex).trim();
    const value = trimmed.slice(splitIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

const fillerWords = new Set(["a", "an", "about", "for", "from", "how", "i", "me", "please", "search", "show", "tell", "the", "to", "want", "what"]);
const domainBoosts = {
  ".edu": 0.35,
  ".gov": 0.4,
  "arxiv.org": 0.3,
  "docs.": 0.2,
  "github.com": 0.15,
  "nature.com": 0.25,
  "openai.com": 0.2,
  "wikipedia.org": 0.1
};
const synonymMap = {
  ai: ["artificial intelligence", "llm"],
  api: ["developer docs", "reference"],
  seo: ["search engine optimization", "ranking"],
  tavily: ["search api", "web search"]
};

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function classifyIntent(query) {
  const lower = query.toLowerCase();
  if (/(buy|price|pricing|deal|coupon|subscribe|order|book|hire)/.test(lower)) return "transactional";
  if (/(official site|login|homepage|docs|documentation|github|download)/.test(lower)) return "navigational";
  if (/(compare|research|deep dive|analysis|benchmark|survey|pros and cons|architecture)/.test(lower)) return "research/deep dive";
  return "informational";
}

function buildSearchQueries(query, intent) {
  const normalized = normalizeWhitespace(query);
  const tokens = normalized.split(/\s+/).map((token) => token.replace(/[^\w.-]/g, "")).filter(Boolean);
  const condensed = tokens.filter((token) => !fillerWords.has(token.toLowerCase()));
  const expansions = condensed.flatMap((token) => synonymMap[token.toLowerCase()] ?? []);
  const searchQueries = new Set([normalized]);

  if (condensed.length > 0) searchQueries.add(condensed.join(" "));
  if (expansions.length > 0) searchQueries.add([...condensed, ...expansions].join(" "));
  if (intent === "research/deep dive") searchQueries.add(`${condensed.join(" ")} comparison analysis`.trim());

  return Array.from(searchQueries).filter(Boolean).slice(0, 3);
}

function cleanText(value) {
  if (!value) return "";
  return normalizeWhitespace(
    value
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\b(cookie|sign in|subscribe|advertisement|menu|navigation)\b/gi, "")
      .replace(/[|]{2,}/g, " ")
  );
}

function summarizeResult(result) {
  const content = cleanText(result.content || result.raw_content);
  if (!content) return "insufficient data";
  const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 2).join(" ");
  const limited = summary || content.slice(0, 280);
  return limited.length > 320 ? `${limited.slice(0, 317)}...` : limited;
}

function getCredibilityBoost(url) {
  return Object.entries(domainBoosts).reduce((score, [pattern, boost]) => (url.includes(pattern) ? score + boost : score), 0);
}

function getRecencyBoost(publishedDate) {
  if (!publishedDate) return 0;
  const publishedAt = new Date(publishedDate).getTime();
  if (Number.isNaN(publishedAt)) return 0;
  const ageDays = (Date.now() - publishedAt) / (1000 * 60 * 60 * 24);
  if (ageDays <= 30) return 0.2;
  if (ageDays <= 180) return 0.1;
  return 0;
}

async function fetchWikipediaSummary(query) {
  const searchUrl = new URL("https://en.wikipedia.org/w/rest.php/v1/search/title");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("limit", "1");

  const searchResponse = await fetch(searchUrl, {
    headers: {
      "User-Agent": "QuantumSEO/1.0"
    }
  });

  if (!searchResponse.ok) {
    return null;
  }

  const searchData = await searchResponse.json();
  const topPage = searchData.pages?.[0];
  if (!topPage?.key) {
    return null;
  }

  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topPage.key)}`;
  const summaryResponse = await fetch(summaryUrl, {
    headers: {
      "User-Agent": "QuantumSEO/1.0"
    }
  });

  if (!summaryResponse.ok) {
    return null;
  }

  const summaryData = await summaryResponse.json();
  const extract = cleanText(summaryData.extract);
  if (!extract) {
    return null;
  }

  return {
    title: cleanText(summaryData.title) || topPage.title || query,
    url: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topPage.key)}`,
    summary: extract.length > 420 ? `${extract.slice(0, 417)}...` : extract
  };
}

async function callTavilySearch(searchQuery) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is required.");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: searchQuery,
      search_depth: "advanced",
      max_results: 5,
      include_answer: false,
      include_raw_content: true,
      topic: "general"
    })
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed with status ${response.status}.`);
  }

  const data = await response.json();
  return data.results ?? [];
}

async function getTrendingTopics() {
  const today = new Date().toISOString().slice(0, 10);
  const results = await callTavilySearch(`trending topics news today ${today}`);
  const seen = new Set();

  return results
    .map((result) => cleanText(result.title || result.content || ""))
    .map((title) => title.replace(/^#\s*/, "").split(/[:|-]/)[0].trim())
    .map((title) => title.replace(/\b(today|live updates|breaking news|issue)\b/gi, "").trim())
    .filter((title) => title.length > 0)
    .filter((title) => title.length <= 60)
    .filter((title) => {
      const key = title.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function rankAndSummarizeResults(results) {
  const deduped = new Map();

  results.forEach((result) => {
    const title = cleanText(result.title) || "Untitled source";
    const url = result.url || "";
    if (!url) return;

    const summary = summarizeResult(result);
    const rankScore = (result.score ?? 0) + getCredibilityBoost(url) + getRecencyBoost(result.published_date);
    const existing = deduped.get(url);

    if (!existing || rankScore > existing.rankScore) {
      deduped.set(url, { title, url, summary, rankScore });
    }
  });

  return Array.from(deduped.values())
    .sort((left, right) => right.rankScore - left.rankScore)
    .slice(0, 5)
    .map(({ title, url, summary }) => ({ title, url, summary }));
}

function buildFinalAnswer(sources) {
  if (sources.length === 0) return "insufficient data";
  const combined = sources.slice(0, 3).map((source) => source.summary).filter((summary) => summary !== "insufficient data").join(" ");
  if (!combined) return "insufficient data";
  const answer = normalizeWhitespace(combined);
  return answer.length > 650 ? `${answer.slice(0, 647)}...` : answer;
}

async function runExternalSearchAgent(query) {
  const normalizedQuery = normalizeWhitespace(query);
  if (normalizedQuery.length < 2) {
    return {
      query: normalizedQuery,
      search_queries: [normalizedQuery],
      sources: [],
      final_answer: "Type at least 2 characters to search."
    };
  }

  const intent = classifyIntent(query);
  const searchQueries = buildSearchQueries(query, intent);
  const [searchResponses, wikipediaSource] = await Promise.all([
    Promise.all(
      searchQueries.map(async (searchQuery) => {
        try {
          return await callTavilySearch(searchQuery);
        } catch (error) {
          console.error(`Tavily search failed for "${searchQuery}":`, error);
          return [];
        }
      })
    ),
    fetchWikipediaSummary(query).catch((error) => {
      console.error(`Wikipedia fallback failed for "${query}":`, error);
      return null;
    })
  ]);

  const rankedSources = rankAndSummarizeResults(searchResponses.flat());
  const sources = wikipediaSource
    ? [
        wikipediaSource,
        ...rankedSources.filter((source) => source.url !== wikipediaSource.url)
      ].slice(0, 5)
    : rankedSources;
  const finalAnswer = buildFinalAnswer(sources);

  return {
    query: normalizeWhitespace(query),
    search_queries: searchQueries,
    sources,
    final_answer: finalAnswer === "insufficient data" ? "Live search is temporarily unavailable. Try again in a moment." : finalAnswer
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

async function handleStaticRequest(req, res) {
  try {
    const requestPath = req.url === "/" ? "/index.html" : req.url ?? "/index.html";
    const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const data = await readFile(filePath);
    const extension = extname(filePath);

    res.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

await loadDotEnv();

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${host}:${port}`);

  if (req.method === "GET" && url.pathname === "/api/search") {
    const rawQuery = url.searchParams.get("q")?.trim() ?? "";
    if (!rawQuery) {
      return sendJson(res, 400, { query: "", search_queries: [], sources: [], final_answer: "insufficient data" });
    }

    try {
      const payload = await runExternalSearchAgent(rawQuery);
      return sendJson(res, 200, payload);
    } catch (error) {
      console.error("Search error:", error);
      return sendJson(res, 500, { query: rawQuery, search_queries: [], sources: [], final_answer: "insufficient data" });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/trending") {
    try {
      const topics = await getTrendingTopics();
      return sendJson(res, 200, { topics });
    } catch (error) {
      console.error("Trending error:", error);
      return sendJson(res, 200, { topics: [] });
    }
  }

  return handleStaticRequest(req, res);
}).listen(port, host, () => {
  console.log(`Quantum SEO available at http://${host}:${port}`);
});
