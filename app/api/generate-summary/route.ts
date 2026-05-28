import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type ArticleForSummary = {
  title: string;
  source: string;
  category: string;
  url: string;
  published_at: string | null;
};

type DailyAiSummary = {
  summary_date: string;
  title: string;
  summary: string;
  article_count: number;
  model: string;
};

const DEFAULT_GEMINI_SUMMARY_MODEL = "gemini-2.5-flash-lite";
const MAX_SUMMARY_ARTICLES = 10;

function getJstDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildPrompt(articles: ArticleForSummary[]) {
  const articleLines = articles
    .map((article, index) => {
      return [
        `${index + 1}. ${article.title}`,
        `source: ${article.source}`,
        `category: ${article.category}`,
        `url: ${article.url}`,
        `published_at: ${article.published_at ?? "unknown"}`,
      ].join("\n");
    })
    .join("\n\n");

  return `あなたは日本語のAIニュース編集者です。
以下の記事一覧だけを根拠に、今日のAIニュース要約を日本語で作成してください。

制約:
- 記事本文は読めないため、タイトル・媒体・カテゴリ・公開日時・URLから分かる範囲だけで要約する
- 推測しすぎない
- 重要トピックを3〜5個にまとめる
- 最後に「注目ポイント」を2〜3個書く
- 出力はMarkdown
- 各トピックには関連URLを含める

記事:
${articleLines}`;
}

function extractGeminiText(data: unknown) {
  if (!data || typeof data !== "object" || !("candidates" in data)) {
    return "";
  }

  const candidates = data.candidates;

  if (!Array.isArray(candidates)) {
    return "";
  }

  return candidates
    .flatMap((candidate) => {
      if (
        !candidate ||
        typeof candidate !== "object" ||
        !("content" in candidate)
      ) {
        return [];
      }

      const content = candidate.content;

      if (!content || typeof content !== "object" || !("parts" in content)) {
        return [];
      }

      const parts = content.parts;

      if (!Array.isArray(parts)) {
        return [];
      }

      return parts.flatMap((part) => {
        if (!part || typeof part !== "object" || !("text" in part)) {
          return [];
        }

        return typeof part.text === "string" ? [part.text] : [];
      });
    })
    .join("\n")
    .trim();
}

function summaryResponse(
  summary: DailyAiSummary,
  message: string,
  cached: boolean,
) {
  return Response.json({
    message,
    summaryDate: summary.summary_date,
    title: summary.title,
    summary: summary.summary,
    articleCount: summary.article_count,
    model: summary.model,
    cached,
  });
}

export async function generateDailyAiSummary() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_SUMMARY_MODEL ?? DEFAULT_GEMINI_SUMMARY_MODEL;
  const summaryDate = getJstDateString();
  const title = `${summaryDate} のAIニュースまとめ`;

  if (!geminiApiKey) {
    return Response.json(
      {
        message: "Gemini APIキーが設定されていません。",
      },
      { status: 500 },
    );
  }

  let supabaseAdmin;

  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    console.error("Failed to initialize Supabase admin client:", error);
    return Response.json(
      {
        message: "AI要約生成の設定が不足しています。",
      },
      { status: 500 },
    );
  }

  const existingSummaryResult = await supabaseAdmin
    .from("daily_ai_summaries")
    .select("summary_date, title, summary, article_count, model")
    .eq("summary_date", summaryDate)
    .maybeSingle<DailyAiSummary>();

  if (existingSummaryResult.error) {
    console.error("Failed to fetch existing AI summary:", existingSummaryResult.error);
    return Response.json(
      {
        message: "既存のAI要約確認に失敗しました。",
      },
      { status: 500 },
    );
  }

  if (existingSummaryResult.data) {
    return summaryResponse(
      existingSummaryResult.data,
      "今日のAI要約は既に作成済みです。",
      true,
    );
  }

  const articlesResult = await supabaseAdmin
    .from("articles")
    .select("title, source, category, url, published_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(MAX_SUMMARY_ARTICLES);

  if (articlesResult.error) {
    console.error("Failed to fetch articles for AI summary:", articlesResult.error);
    return Response.json(
      {
        message: "要約対象の記事取得に失敗しました。",
      },
      { status: 500 },
    );
  }

  const articles = (articlesResult.data ?? []) as ArticleForSummary[];

  if (articles.length === 0) {
    return Response.json(
      {
        message: "要約対象の記事がありません。先にニュースを取得してください。",
      },
      { status: 404 },
    );
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildPrompt(articles),
              },
            ],
          },
        ],
      }),
    },
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error("Gemini API request failed:", {
      status: geminiResponse.status,
      body: errorText,
    });
    return Response.json(
      {
        message: "Gemini APIでAI要約の生成に失敗しました。",
      },
      { status: 502 },
    );
  }

  const geminiData = await geminiResponse.json();
  const summaryText = extractGeminiText(geminiData);

  if (!summaryText) {
    console.error("Gemini API returned empty summary:", geminiData);
    return Response.json(
      {
        message: "Gemini APIから要約本文を取得できませんでした。",
      },
      { status: 502 },
    );
  }

  const insertResult = await supabaseAdmin
    .from("daily_ai_summaries")
    .insert({
      summary_date: summaryDate,
      title,
      summary: summaryText,
      article_count: articles.length,
      model,
    })
    .select("summary_date, title, summary, article_count, model")
    .single<DailyAiSummary>();

  if (insertResult.error) {
    if (insertResult.error.code === "23505") {
      const conflictedSummaryResult = await supabaseAdmin
        .from("daily_ai_summaries")
        .select("summary_date, title, summary, article_count, model")
        .eq("summary_date", summaryDate)
        .maybeSingle<DailyAiSummary>();

      if (!conflictedSummaryResult.error && conflictedSummaryResult.data) {
        return summaryResponse(
          conflictedSummaryResult.data,
          "今日のAI要約は既に作成済みです。",
          true,
        );
      }
    }

    console.error("Failed to save AI summary:", insertResult.error);
    return Response.json(
      {
        message: "AI要約の保存に失敗しました。",
      },
      { status: 500 },
    );
  }

  return summaryResponse(
    insertResult.data,
    "今日のAI要約を生成しました。",
    false,
  );
}

export async function POST() {
  return generateDailyAiSummary();
}
