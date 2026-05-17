import Parser from "rss-parser";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { rssFeeds } from "@/lib/rss-feeds";

type ArticleInsert = {
  title: string;
  url: string;
  source: string;
  category: string;
  published_at: string | null;
  fetched_at: string;
};

type ArticleCandidate = ArticleInsert & {
  originalIndex: number;
};

type FeedResult = {
  name: string;
  rssItemCount: number;
  candidateCount: number;
  error?: string;
};

const parser = new Parser();
const MAX_CANDIDATES_PER_FEED = 5;
const MAX_TARGET_ARTICLES = 10;

function normalizeUrl(value: string | undefined) {
  return value?.trim() ?? "";
}

function parsePublishedAt(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function compareCandidates(a: ArticleCandidate, b: ArticleCandidate) {
  if (a.published_at && b.published_at) {
    return (
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  }

  if (a.published_at) {
    return -1;
  }

  if (b.published_at) {
    return 1;
  }

  return a.originalIndex - b.originalIndex;
}

export async function POST() {
  const fetchedAt = new Date().toISOString();
  const allCandidates: ArticleCandidate[] = [];
  const feedResults: FeedResult[] = [];
  let rssItemCount = 0;
  let candidateCount = 0;

  for (const feed of rssFeeds) {
    try {
      const parsedFeed = await parser.parseURL(feed.url);
      const feedRssItemCount = parsedFeed.items.length;
      rssItemCount += feedRssItemCount;

      const feedCandidates = parsedFeed.items.flatMap((item, originalIndex) => {
        const url = normalizeUrl(item.link ?? item.guid);

        if (!url) {
          return [];
        }

        const title = item.title?.trim();

        if (!title) {
          return [];
        }

        return {
          title,
          url,
          source: feed.name,
          category: feed.category,
          published_at: parsePublishedAt(item.isoDate ?? item.pubDate),
          fetched_at: fetchedAt,
          originalIndex,
        };
      });

      const limitedCandidates = feedCandidates
        .sort(compareCandidates)
        .slice(0, MAX_CANDIDATES_PER_FEED);

      allCandidates.push(...limitedCandidates);
      candidateCount += limitedCandidates.length;

      feedResults.push({
        name: feed.name,
        rssItemCount: feedRssItemCount,
        candidateCount: limitedCandidates.length,
      });
    } catch (error) {
      console.error(`Failed to fetch RSS feed: ${feed.name}`, error);
      feedResults.push({
        name: feed.name,
        rssItemCount: 0,
        candidateCount: 0,
        error: "取得に失敗しました",
      });
    }
  }

  const articlesByUrl = new Map<string, ArticleInsert>();

  for (const candidate of allCandidates.sort(compareCandidates)) {
    if (articlesByUrl.has(candidate.url)) {
      continue;
    }

    articlesByUrl.set(candidate.url, {
      title: candidate.title,
      url: candidate.url,
      source: candidate.source,
      category: candidate.category,
      published_at: candidate.published_at,
      fetched_at: candidate.fetched_at,
    });

    if (articlesByUrl.size >= MAX_TARGET_ARTICLES) {
      break;
    }
  }

  const rows = Array.from(articlesByUrl.values());
  const targetCount = rows.length;

  if (rows.length === 0) {
    const hasFeedError = feedResults.some((result) => result.error);

    return Response.json(
      {
        message: hasFeedError
          ? "ニュース取得に失敗しました。"
          : "追加できる記事はありませんでした。",
        rssItemCount,
        candidateCount,
        targetCount,
        insertedCount: 0,
        skippedCount: 0,
        feedResults,
      },
      { status: hasFeedError ? 502 : 200 },
    );
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("articles")
      .upsert(rows, {
        onConflict: "url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error("Failed to save RSS articles:", error);
      return Response.json(
        {
          message: "ニュースの保存に失敗しました。",
          rssItemCount,
          candidateCount,
          targetCount,
          insertedCount: 0,
          skippedCount: targetCount,
          feedResults,
        },
        { status: 500 },
      );
    }

    const insertedCount = data?.length ?? 0;

    return Response.json({
      message: "ニュース取得が完了しました。",
      rssItemCount,
      candidateCount,
      targetCount,
      insertedCount,
      skippedCount: targetCount - insertedCount,
      feedResults,
    });
  } catch (error) {
    console.error("Failed to initialize Supabase admin client:", error);
    return Response.json(
      {
        message: "ニュース取得の設定が不足しています。",
        rssItemCount,
        candidateCount,
        targetCount,
        insertedCount: 0,
        skippedCount: targetCount,
        feedResults,
      },
      { status: 500 },
    );
  }
}
