# Full-Stack AI Search Engine — TypeScript / Node.js
## Architecture: BM25 + Dense Vector + PageRank + LLM Re-ranking + AI Answer

---

## 1. Project Structure

```
search-engine/
├── crawler/
│   ├── crawler.ts          # Playwright-based web crawler
│   ├── pagerank.ts         # PageRank graph computation
│   └── embedder.ts         # Batch embedding generator
├── indexer/
│   ├── bm25-indexer.ts     # Elasticsearch BM25 index writer
│   ├── vector-indexer.ts   # Pinecone / pgvector writer
│   └── graph-indexer.ts    # Neo4j link graph writer
├── gateway/
│   ├── query-parser.ts     # LLM intent + entity extraction
│   ├── query-expander.ts   # Synonym + semantic expansion
│   └── embedder.ts         # Real-time query embedding
├── retrieval/
│   ├── bm25-retriever.ts   # Elasticsearch sparse retrieval
│   ├── vector-retriever.ts # ANN dense retrieval
│   └── pagerank-scorer.ts  # Authority score lookup
├── ranking/
│   ├── rrf-fusion.ts       # Reciprocal Rank Fusion
│   ├── cross-encoder.ts    # Cohere re-ranker
│   └── freshness.ts        # Time-decay scoring
├── ai/
│   ├── answer-generator.ts # RAG answer via Claude Bedrock
│   └── query-suggester.ts  # Related queries LLM
├── api/
│   └── search-router.ts    # Express route handler
└── frontend/
    └── SearchBar.tsx       # React search UI component
```

---

## 2. Crawler & PageRank Builder

```typescript
// crawler/crawler.ts
import { chromium } from 'playwright';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'us-east-1' });

interface CrawledPage {
  url: string;
  title: string;
  body: string;
  outboundLinks: string[];
  crawledAt: string;
}

export async function crawlPage(url: string): Promise<CrawledPage> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  const title = await page.title();
  
  // Clean text extraction — strip nav, footer, scripts
  const body = await page.evaluate(() => {
    const remove = ['nav','footer','script','style','header','aside'];
    remove.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
    return document.body.innerText.replace(/\s+/g, ' ').trim();
  });

  const outboundLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(href => href.startsWith('http'))
      .slice(0, 100)
  );

  await browser.close();

  const doc: CrawledPage = {
    url, title, body, outboundLinks,
    crawledAt: new Date().toISOString()
  };

  // Push to SQS for async indexing
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.CRAWL_QUEUE_URL!,
    MessageBody: JSON.stringify(doc),
  }));

  return doc;
}
```

```typescript
// crawler/pagerank.ts
// Iterative PageRank using adjacency list — O(n * iterations)
interface Graph { [url: string]: string[] }

export function computePageRank(
  graph: Graph,
  dampingFactor = 0.85,
  iterations = 50
): Record<string, number> {
  const nodes = Object.keys(graph);
  const N = nodes.length;
  let scores: Record<string, number> = {};
  
  // Initialize equal scores
  nodes.forEach(n => (scores[n] = 1 / N));

  for (let iter = 0; iter < iterations; iter++) {
    const next: Record<string, number> = {};
    nodes.forEach(n => (next[n] = (1 - dampingFactor) / N));

    for (const node of nodes) {
      const outLinks = graph[node] ?? [];
      const contrib = scores[node] / (outLinks.length || 1);
      outLinks.forEach(target => {
        if (next[target] !== undefined) next[target] += dampingFactor * contrib;
      });
    }
    scores = next;
  }
  return scores;
}
```

---

## 3. Embedding Generation (batch + real-time)

```typescript
// crawler/embedder.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedTexts(texts: string[]): Promise<number[][]> {
  // Chunk text to max 8192 tokens
  const truncated = texts.map(t => t.slice(0, 8000));
  
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large', // 3072 dimensions
    input: truncated,
    encoding_format: 'float',
  });

  return response.data.map(d => d.embedding);
}

// Single query embedding (real-time, cached in Redis)
export async function embedQuery(query: string): Promise<number[]> {
  const vectors = await embedTexts([query]);
  return vectors[0];
}
```

---

## 4. BM25 Indexing + Retrieval (Elasticsearch)

```typescript
// indexer/bm25-indexer.ts
import { Client } from '@elastic/elasticsearch';

const es = new Client({ node: process.env.ELASTICSEARCH_URL });

export async function createSearchIndex() {
  await es.indices.create({
    index: 'web_pages',
    settings: {
      analysis: {
        analyzer: {
          search_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'stop', 'porter_stem'],
          }
        }
      },
      similarity: { bm25: { type: 'BM25', k1: 1.5, b: 0.75 } }
    },
    mappings: {
      properties: {
        url:        { type: 'keyword' },
        title:      { type: 'text', analyzer: 'search_analyzer', boost: 3 },
        body:       { type: 'text', analyzer: 'search_analyzer' },
        pagerank:   { type: 'float' },
        crawledAt:  { type: 'date' },
      }
    }
  });
}

export async function indexDocument(doc: {
  url: string; title: string; body: string;
  pagerank: number; crawledAt: string;
}) {
  await es.index({ index: 'web_pages', id: doc.url, document: doc });
}

// BM25 retrieval with PageRank boost applied at query time
export async function bm25Search(query: string, topK = 100) {
  const result = await es.search({
    index: 'web_pages',
    size: topK,
    query: {
      function_score: {
        query: {
          multi_match: {
            query,
            fields: ['title^3', 'body'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          }
        },
        functions: [
          {
            // Multiply BM25 score by log(1 + pagerank)
            script_score: {
              script: {
                source: "_score * Math.log(1 + doc['pagerank'].value)"
              }
            }
          }
        ]
      }
    },
    _source: ['url', 'title', 'body', 'pagerank'],
  });

  return result.hits.hits.map((h, rank) => ({
    url: (h._source as any).url,
    title: (h._source as any).title,
    body: (h._source as any).body,
    score: h._score ?? 0,
    rank,
  }));
}
```

---

## 5. Dense Vector Retrieval (pgvector / Postgres)

```typescript
// retrieval/vector-retriever.ts
import { Pool } from 'pg';
import { embedQuery } from '../crawler/embedder';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Schema setup (run once):
// CREATE EXTENSION IF NOT EXISTS vector;
// CREATE TABLE page_embeddings (
//   url TEXT PRIMARY KEY,
//   title TEXT,
//   body_snippet TEXT,
//   embedding vector(3072),
//   pagerank FLOAT
// );
// CREATE INDEX ON page_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists=100);

export async function vectorSearch(query: string, topK = 100) {
  const queryVec = await embedQuery(query);
  const vecString = `[${queryVec.join(',')}]`;

  const result = await pool.query(
    `SELECT url, title, body_snippet, pagerank,
       1 - (embedding <=> $1::vector) AS cosine_score
     FROM page_embeddings
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vecString, topK]
  );

  return result.rows.map((r, rank) => ({
    url: r.url,
    title: r.title,
    body: r.body_snippet,
    score: parseFloat(r.cosine_score),
    rank,
  }));
}
```

---

## 6. Reciprocal Rank Fusion (RRF)

```typescript
// ranking/rrf-fusion.ts
// RRF is the gold standard for combining heterogeneous ranked lists
// Score = Σ (1 / (k + rank_i)) where k=60 is empirically optimal

interface SearchResult {
  url: string;
  title: string;
  body: string;
  score: number;
  rank: number;
}

interface FusedResult extends SearchResult {
  rrfScore: number;
  pagerankScore: number;
  sources: ('bm25' | 'vector')[];
}

export function reciprocalRankFusion(
  lists: SearchResult[][],
  pageranks: Record<string, number>,
  k = 60,
  pagerankWeight = 0.15  // 15% PageRank influence on top of RRF
): FusedResult[] {
  const scoreMap = new Map<string, FusedResult>();

  lists.forEach((list, listIdx) => {
    list.forEach((result, rank) => {
      const rrfContrib = 1 / (k + rank);
      
      if (!scoreMap.has(result.url)) {
        scoreMap.set(result.url, {
          ...result,
          rrfScore: 0,
          pagerankScore: pageranks[result.url] ?? 0,
          sources: [],
        });
      }
      
      const entry = scoreMap.get(result.url)!;
      entry.rrfScore += rrfContrib;
      entry.sources.push(listIdx === 0 ? 'bm25' : 'vector');
    });
  });

  return Array.from(scoreMap.values())
    .map(r => ({
      ...r,
      score: r.rrfScore + pagerankWeight * Math.log(1 + r.pagerankScore),
    }))
    .sort((a, b) => b.score - a.score);
}
```

---

## 7. LLM Query Understanding (intent + expansion)

```typescript
// gateway/query-parser.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface ParsedQuery {
  intent: 'navigational' | 'informational' | 'transactional' | 'local';
  entities: string[];
  expandedTerms: string[];
  correctedQuery: string;
  isQuestion: boolean;
}

export async function parseQuery(rawQuery: string): Promise<ParsedQuery> {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 300,
    system: `You are a search query analyzer. Return ONLY valid JSON, no explanation.`,
    messages: [{
      role: 'user',
      content: `Analyze this search query and return JSON:

Query: "${rawQuery}"

Return exactly this structure:
{
  "intent": "navigational|informational|transactional|local",
  "entities": ["list", "of", "key", "entities"],
  "expandedTerms": ["synonyms", "related", "terms", "to", "add"],
  "correctedQuery": "spell-corrected version of the query",
  "isQuestion": true|false
}`
    }]
  });

  const text = (response.content[0] as any).text;
  return JSON.parse(text) as ParsedQuery;
}
```

---

## 8. LLM Cross-Encoder Re-ranking (Cohere)

```typescript
// ranking/cross-encoder.ts
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });

interface RerankInput {
  url: string;
  title: string;
  body: string;
  score: number;
}

export async function rerankWithCrossEncoder(
  query: string,
  candidates: RerankInput[],
  topN = 10
): Promise<RerankInput[]> {
  // Cohere rerank-3 is a cross-encoder: it reads query+document together
  // Much more accurate than bi-encoder similarity at the cost of latency
  const response = await cohere.rerank({
    model: 'rerank-english-v3.0',
    query,
    documents: candidates.map(c => `${c.title}\n\n${c.body.slice(0, 500)}`),
    topN,
    returnDocuments: false,
  });

  return response.results.map(r => ({
    ...candidates[r.index],
    score: r.relevanceScore,
  }));
}
```

---

## 9. RAG Answer Generation (Claude Bedrock)

```typescript
// ai/answer-generator.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface SearchResult {
  url: string;
  title: string;
  body: string;
  score: number;
}

interface AIAnswer {
  answer: string;
  citations: string[];
  confidence: 'high' | 'medium' | 'low';
  relatedQueries: string[];
}

export async function generateAIAnswer(
  query: string,
  topResults: SearchResult[]
): Promise<AIAnswer> {
  const context = topResults.slice(0, 5)
    .map((r, i) => `[${i+1}] ${r.title}\nURL: ${r.url}\n${r.body.slice(0, 800)}`)
    .join('\n\n---\n\n');

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 600,
    system: `You are a search assistant. Answer concisely based ONLY on provided context.
Return JSON with keys: answer (string), citations (array of URLs), confidence (high/medium/low), relatedQueries (array of 3 strings).`,
    messages: [{
      role: 'user',
      content: `Query: ${query}\n\nContext:\n${context}\n\nReturn valid JSON only.`
    }]
  });

  const text = (response.content[0] as any).text;
  return JSON.parse(text) as AIAnswer;
}
```

---

## 10. Main Search Orchestrator

```typescript
// api/search-router.ts
import express from 'express';
import { parseQuery } from '../gateway/query-parser';
import { bm25Search } from '../indexer/bm25-indexer';
import { vectorSearch } from '../retrieval/vector-retriever';
import { reciprocalRankFusion } from '../ranking/rrf-fusion';
import { rerankWithCrossEncoder } from '../ranking/cross-encoder';
import { generateAIAnswer } from '../ai/answer-generator';
import { getPageRanks } from '../crawler/pagerank';
import Redis from 'ioredis';

const router = express.Router();
const redis = new Redis(process.env.REDIS_URL!);

router.get('/search', async (req, res) => {
  const rawQuery = (req.query.q as string)?.trim();
  if (!rawQuery) return res.status(400).json({ error: 'Missing query' });

  // 1. Cache check (5 min TTL)
  const cacheKey = `search:${rawQuery.toLowerCase()}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  try {
    // 2. LLM query understanding (parallel with retrieval)
    const [parsedQuery, bm25Results, vectorResults] = await Promise.all([
      parseQuery(rawQuery),
      bm25Search(rawQuery, 100),
      vectorSearch(rawQuery, 100),
    ]);

    // 3. Also run BM25 on expanded terms
    const expandedBm25 = parsedQuery.expandedTerms.length > 0
      ? await bm25Search(
          rawQuery + ' ' + parsedQuery.expandedTerms.join(' '), 50
        )
      : [];

    // 4. RRF fusion of all three lists
    const pageranks = await getPageRanks(
      [...bm25Results, ...vectorResults].map(r => r.url)
    );

    const fused = reciprocalRankFusion(
      [bm25Results, vectorResults, expandedBm25],
      pageranks
    );

    // 5. Cross-encoder re-rank top 50 to get top 10
    const reranked = await rerankWithCrossEncoder(
      parsedQuery.correctedQuery,
      fused.slice(0, 50),
      10
    );

    // 6. AI answer (only for informational / question queries)
    let aiAnswer = null;
    if (parsedQuery.isQuestion || parsedQuery.intent === 'informational') {
      aiAnswer = await generateAIAnswer(rawQuery, reranked);
    }

    // 7. Freshness decay (multiply score by exp(-days/90))
    const now = Date.now();
    const results = reranked.map(r => ({
      ...r,
      score: r.score, // freshness applied in ranking step
    }));

    const payload = {
      query: parsedQuery.correctedQuery,
      originalQuery: rawQuery,
      intent: parsedQuery.intent,
      results,
      aiAnswer,
      totalCandidates: fused.length,
    };

    await redis.setex(cacheKey, 300, JSON.stringify(payload));
    return res.json(payload);

  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
```

---

## 11. React Frontend — AI Search Bar

```tsx
// frontend/SearchBar.tsx
import React, { useState, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';

interface SearchResult {
  url: string;
  title: string;
  body: string;
  score: number;
}

interface AIAnswer {
  answer: string;
  citations: string[];
  confidence: 'high' | 'medium' | 'low';
  relatedQueries: string[];
}

interface SearchResponse {
  query: string;
  intent: string;
  results: SearchResult[];
  aiAnswer: AIAnswer | null;
  totalCandidates: number;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 300);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Autocomplete suggestions from your /suggest endpoint
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) return setSuggestions([]);
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSuggestions(data.suggestions ?? []);
  }, []);

  React.useEffect(() => {
    fetchSuggestions(debouncedQuery);
  }, [debouncedQuery]);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setSuggestions([]);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}`,
        { signal: abortRef.current.signal }
      );
      const data: SearchResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      {/* Search Input */}
      <div className="search-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch(query)}
          placeholder="Search anything..."
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls="suggestions-list"
        />
        <button onClick={() => handleSearch(query)} disabled={loading}>
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {/* Autocomplete Suggestions */}
      {suggestions.length > 0 && (
        <ul id="suggestions-list" role="listbox">
          {suggestions.map(s => (
            <li
              key={s}
              role="option"
              onClick={() => { setQuery(s); handleSearch(s); }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {/* AI Answer (zero-click featured snippet) */}
      {response?.aiAnswer && (
        <div className="ai-answer" role="article" aria-label="AI-generated answer">
          <div className="ai-badge">AI Answer</div>
          <p>{response.aiAnswer.answer}</p>
          <div className="citations">
            {response.aiAnswer.citations.map(url => (
              <a key={url} href={url} rel="noopener noreferrer">{new URL(url).hostname}</a>
            ))}
          </div>
        </div>
      )}

      {/* Standard Results */}
      <div className="results-list" role="list">
        {response?.results.map(r => (
          <article key={r.url} className="result-card" role="listitem">
            <a href={r.url} className="result-url">{r.url}</a>
            <h3 className="result-title">
              <a href={r.url}>{r.title}</a>
            </h3>
            <p className="result-snippet">{r.body.slice(0, 200)}…</p>
          </article>
        ))}
      </div>

      {/* Related Queries */}
      {response?.aiAnswer?.relatedQueries && (
        <div className="related-queries">
          <strong>Related:</strong>
          {response.aiAnswer.relatedQueries.map(q => (
            <button key={q} onClick={() => { setQuery(q); handleSearch(q); }}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 12. AWS Infrastructure (CDK)

```typescript
// infrastructure/search-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

export class SearchStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'SearchVPC', { maxAzs: 2 });

    // S3 — raw crawl storage
    const crawlBucket = new s3.Bucket(this, 'CrawlBucket', {
      versioned: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(90) }],
    });

    // SQS — crawl job queue
    const crawlQueue = new sqs.Queue(this, 'CrawlQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'CrawlDLQ'),
        maxReceiveCount: 3,
      },
    });

    // OpenSearch Serverless — BM25
    const opensearchDomain = new opensearch.Domain(this, 'SearchDomain', {
      version: opensearch.EngineVersion.OPENSEARCH_2_9,
      capacity: {
        dataNodeInstanceType: 'r6g.large.search',
        dataNodes: 2,
      },
      ebs: { volumeSize: 100, volumeType: ec2.EbsDeviceVolumeType.GP3 },
      zoneAwareness: { enabled: true },
      vpc,
    });

    // ElastiCache Redis — query result cache
    new elasticache.CfnReplicationGroup(this, 'SearchCache', {
      replicationGroupDescription: 'Search result cache',
      cacheNodeType: 'cache.r7g.large',
      numCacheClusters: 2,
      automaticFailoverEnabled: true,
    });

    // Lambda — indexing worker (triggered by SQS)
    const indexerFn = new lambda.DockerImageFunction(this, 'IndexerFn', {
      code: lambda.DockerImageCode.fromImageAsset('./indexer'),
      memorySize: 2048,
      timeout: cdk.Duration.seconds(300),
      environment: {
        OPENSEARCH_URL: opensearchDomain.domainEndpoint,
        CRAWL_BUCKET: crawlBucket.bucketName,
      },
    });

    indexerFn.addEventSource(
      new cdk.aws_lambda_event_sources.SqsEventSource(crawlQueue, { batchSize: 10 })
    );

    // ECS Fargate — search API
    const cluster = new ecs.Cluster(this, 'SearchCluster', { vpc });
    const taskDef = new ecs.FargateTaskDefinition(this, 'SearchTaskDef', {
      memoryLimitMiB: 4096,
      cpu: 2048,
    });

    taskDef.addContainer('SearchAPI', {
      image: ecs.ContainerImage.fromAsset('./api'),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        OPENSEARCH_URL: opensearchDomain.domainEndpoint,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'search-api' }),
    });

    new ecs.FargateService(this, 'SearchService', {
      cluster,
      taskDefinition: taskDef,
      desiredCount: 2,
      assignPublicIp: false,
    });
  }
}
```

---

## 13. Environment Variables

```env
# .env.production
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
COHERE_API_KEY=...
ELASTICSEARCH_URL=https://your-opensearch-endpoint.es.amazonaws.com
DATABASE_URL=postgresql://user:pass@rds-host:5432/search
REDIS_URL=redis://elasticache-endpoint:6379
CRAWL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/xxx/CrawlQueue
AWS_REGION=us-east-1
```

---

## 14. Scoring Formula (Full)

```
final_score(doc) =
    RRF_score(doc)                    ← from BM25 + vector + expanded BM25 lists
  + 0.15 × log(1 + pagerank(doc))    ← authority boost
  × exp(−days_since_crawl / 90)      ← freshness decay
  × cross_encoder_score(query, doc)  ← LLM re-rank multiplier (top-50 only)
```

**Where:**
- `RRF_score = Σ 1/(60 + rank_i)` across all retrieval lists
- `pagerank` is iterative damped PageRank (d=0.85, 50 iterations)
- `cross_encoder_score` is Cohere rerank-3 relevance score ∈ [0,1]
- Freshness half-life is 90 days (configurable per corpus)

---

## 15. Key Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0",
    "@aws-sdk/client-sqs": "^3.x",
    "@aws-sdk/client-s3": "^3.x",
    "@elastic/elasticsearch": "^8.x",
    "cohere-ai": "^7.x",
    "openai": "^4.x",
    "playwright": "^1.x",
    "pg": "^8.x",
    "ioredis": "^5.x",
    "express": "^4.x",
    "neo4j-driver": "^5.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "aws-cdk-lib": "^2.x"
  }
}
```
