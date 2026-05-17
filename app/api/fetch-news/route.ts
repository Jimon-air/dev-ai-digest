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

type FeedResult = {
  name: string;
  fetchedCount: number;
  error?: string;
};

const parser = new Parser();

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

export async function POST() {
  const fetchedAt = new Date().toISOString();
  const articlesByUrl = new Map<string, ArticleInsert>();
  const feedResults: FeedResult[] = [];

  for (const feed of rssFeeds) {
    try {
      const parsedFeed = await parser.parseURL(feed.url);
      let fetchedCount = 0;

      for (const item of parsedFeed.items) {
        const url = normalizeUrl(item.link ?? item.guid);

        if (!url || articlesByUrl.has(url)) {
          continue;
        }

        const title = item.title?.trim();

        if (!title) {
          continue;
        }

        articlesByUrl.set(url, {
          title,
          url,
          source: feed.name,
          category: feed.category,
          published_at: parsePublishedAt(item.isoDate ?? item.pubDate),
          fetched_at: fetchedAt,
        });
        fetchedCount += 1;
      }

      feedResults.push({
        name: feed.name,
        fetchedCount,
      });
    } catch (error) {
      console.error(`Failed to fetch RSS feed: ${feed.name}`, error);
      feedResults.push({
        name: feed.name,
        fetchedCount: 0,
        error: "取得に失敗しました",
      });
    }
  }

  const rows = Array.from(articlesByUrl.values());

  if (rows.length === 0) {
    const hasFeedError = feedResults.some((result) => result.error);

    return Response.json(
      {
        message: hasFeedError
          ? "ニュース取得に失敗しました。"
          : "追加できる記事はありませんでした。",
        fetchedCount: 0,
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
          fetchedCount: rows.length,
          insertedCount: 0,
          skippedCount: rows.length,
          feedResults,
        },
        { status: 500 },
      );
    }

    const insertedCount = data?.length ?? 0;

    return Response.json({
      message: "ニュース取得が完了しました。",
      fetchedCount: rows.length,
      insertedCount,
      skippedCount: rows.length - insertedCount,
      feedResults,
    });
  } catch (error) {
    console.error("Failed to initialize Supabase admin client:", error);
    return Response.json(
      {
        message: "ニュース取得の設定が不足しています。",
        fetchedCount: rows.length,
        insertedCount: 0,
        skippedCount: rows.length,
        feedResults,
      },
      { status: 500 },
    );
  }
}
