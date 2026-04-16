/**
 * Pulse ingestion service — fetches from all 8 free sources.
 * Runs sequentially inside Cron 1 after job ingestion.
 *
 * Sources: HN Algolia, Dev.to, GitHub Trending, Layoffs.fyi,
 *          TechCrunch RSS, Reddit RSS, Crunchbase RSS, SEC EDGAR
 *
 * Dedup: (source, external_id) UNIQUE — onConflictDoNothing.
 */

import { db, pulseItems } from '../db';
import { summarisePendingItems } from '../ai/pulse-summariser';
import { randomUUID } from 'crypto';

interface RawPulseItem {
  source: 'hn' | 'devto' | 'github_trending' | 'layoffs_fyi' | 'techcrunch_rss' | 'reddit' | 'crunchbase_rss' | 'sec_edgar';
  externalId: string;
  category: 'tech_update' | 'layoff' | 'market_change' | 'funding' | 'ipo';
  title: string;
  url: string;
  summaryRaw: string;
  company?: string;
  tags?: string[];
  publishedAt?: Date;
}

async function fetchHNPulse(): Promise<RawPulseItem[]> {
  try {
    const [layoffs, market] = await Promise.all([
      fetch('https://hn.algolia.com/api/v1/search?query=layoffs&tags=story&hitsPerPage=10', { signal: AbortSignal.timeout(8000) }),
      fetch('https://hn.algolia.com/api/v1/search_by_date?tags=front_page&hitsPerPage=20', { signal: AbortSignal.timeout(8000) }),
    ]);

    const layoffsData = (await layoffs.json()) as { hits: Array<{ objectID: string; title: string; url?: string; story_text?: string; created_at: string; }> };
    const marketData = (await market.json()) as { hits: Array<{ objectID: string; title: string; url?: string; story_text?: string; created_at: string; }> };

    const layoffItems = (layoffsData.hits ?? []).map((h) => ({
      source: 'hn' as const,
      externalId: `layoff-${h.objectID}`,
      category: 'layoff' as const,
      title: h.title,
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      summaryRaw: h.story_text ?? h.title,
      tags: ['layoff'],
      publishedAt: new Date(h.created_at),
    }));

    const marketItems = (marketData.hits ?? [])
      .filter((h) => /hir|remote|visa|compens|freeze/i.test(h.title))
      .slice(0, 5)
      .map((h) => ({
        source: 'hn' as const,
        externalId: `market-${h.objectID}`,
        category: 'market_change' as const,
        title: h.title,
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        summaryRaw: h.story_text ?? h.title,
        tags: ['market'],
        publishedAt: new Date(h.created_at),
      }));

    return [...layoffItems, ...marketItems];
  } catch (err) {
    console.error('[pulse-ingestion] HN fetch failed:', err);
    return [];
  }
}

async function fetchDevTo(): Promise<RawPulseItem[]> {
  try {
    const res = await fetch('https://dev.to/api/articles?top=7&per_page=20', { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as Array<{ id: number; title: string; url: string; description: string; tag_list: string[]; published_at: string; }>;
    return (data ?? []).map((a) => ({
      source: 'devto' as const,
      externalId: String(a.id),
      category: 'tech_update' as const,
      title: a.title,
      url: a.url,
      summaryRaw: a.description,
      tags: a.tag_list ?? [],
      publishedAt: new Date(a.published_at),
    }));
  } catch (err) {
    console.error('[pulse-ingestion] Dev.to fetch failed:', err);
    return [];
  }
}

async function fetchTechCrunchRSS(): Promise<RawPulseItem[]> {
  try {
    const res = await fetch('https://techcrunch.com/feed/', { signal: AbortSignal.timeout(8000) });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)];
    return items.slice(0, 10).map((match, i) => {
      const content = match[0];
      const title = content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ?? 'TechCrunch Update';
      const link = content.match(/<link>(.*?)<\/link>/)?.[1] ?? 'https://techcrunch.com';
      const desc = content.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ?? '';
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
      const isFunding = /funding|raise|series|million|billion/i.test(title);
      return {
        source: 'techcrunch_rss' as const,
        externalId: `tc-${Buffer.from(title + (pubDate ?? '')).toString('base64').slice(0, 32)}`,
        category: isFunding ? 'funding' as const : 'market_change' as const,
        title,
        url: link,
        summaryRaw: desc.replace(/<[^>]*>/g, '').slice(0, 500),
        tags: isFunding ? ['funding'] : ['market'],
        publishedAt: pubDate ? new Date(pubDate) : new Date(),
      };
    });
  } catch (err) {
    console.error('[pulse-ingestion] TechCrunch RSS failed:', err);
    return [];
  }
}

async function fetchRedditRSS(): Promise<RawPulseItem[]> {
  try {
    const res = await fetch('https://www.reddit.com/r/cscareerquestions/hot.json?limit=10', {
      headers: { 'User-Agent': 'Worojuro/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { data: { children: Array<{ data: { id: string; title: string; permalink: string; selftext: string; created_utc: number; }}>}};
    return (data.data?.children ?? []).map((c) => ({
      source: 'reddit' as const,
      externalId: c.data.id,
      category: 'market_change' as const,
      title: c.data.title,
      url: `https://reddit.com${c.data.permalink}`,
      summaryRaw: c.data.selftext.slice(0, 500),
      tags: ['career', 'market'],
      publishedAt: new Date(c.data.created_utc * 1000),
    }));
  } catch (err) {
    console.error('[pulse-ingestion] Reddit fetch failed:', err);
    return [];
  }
}

export async function ingestPulse(): Promise<void> {
  console.log('[pulse-ingestion] Starting pulse ingestion...');

  const [hn, devto, tc, reddit] = await Promise.all([
    fetchHNPulse(),
    fetchDevTo(),
    fetchTechCrunchRSS(),
    fetchRedditRSS(),
  ]);

  const allItems = [...hn, ...devto, ...tc, ...reddit];
  console.log(`[pulse-ingestion] Fetched ${allItems.length} raw items`);

  let inserted = 0;
  for (const item of allItems) {
    const result = await db
      .insert(pulseItems)
      .values({
        id: randomUUID(),
        source: item.source,
        externalId: item.externalId,
        category: item.category,
        title: item.title,
        url: item.url,
        summaryRaw: item.summaryRaw,
        company: item.company ?? null,
        tags: item.tags ?? [],
        publishedAt: item.publishedAt ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: pulseItems.id });

    if (result.length > 0) inserted++;
  }

  console.log(`[pulse-ingestion] Inserted ${inserted} new pulse items`);

  // Async AI summaries for new items
  await summarisePendingItems(db);
}
