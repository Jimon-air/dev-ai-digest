import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AuthPanel } from "./components/AuthPanel";
import {
  ClientOnlyArticleFiltersAndList,
  type Article,
} from "./components/ClientOnlyArticleFiltersAndList";
import { AiSummaryPanel, type AiSummary } from "./components/AiSummaryPanel";
import { FetchNewsButton } from "./components/FetchNewsButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, category, published_at")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch articles:", error);
  }

  const { data: latestSummary, error: latestSummaryError } = await supabase
    .from("daily_ai_summaries")
    .select("summary_date, title, summary, article_count, model")
    .order("summary_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestSummaryError) {
    console.error("Failed to fetch latest AI summary:", latestSummaryError);
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Dev AI Digest
            </p>
            <nav aria-label="メインナビゲーション">
              <Link
                href="/saved"
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-emerald-700 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30 sm:w-fit"
              >
                保存済み記事を見る
              </Link>
            </nav>
          </div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4">
              <h1 className="text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl dark:text-zinc-50">
                AI・開発ツールニュース
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                RSSから取得した記事を新しい順に表示します。
              </p>
              <FetchNewsButton />
            </div>
            <AuthPanel />
          </div>
        </header>

        <AiSummaryPanel
          initialSummary={
            latestSummaryError ? null : (latestSummary as AiSummary | null)
          }
        />

        {error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-950 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100">
            <h2 className="text-base font-semibold">記事の取得に失敗しました</h2>
            <p className="mt-2 text-sm leading-6">
              時間をおいて再読み込みしてください。Supabaseの接続設定やRLSポリシーも確認してください。
            </p>
          </section>
        ) : articles && articles.length > 0 ? (
          <ClientOnlyArticleFiltersAndList articles={articles as Article[]} />
        ) : (
          <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              まだ記事がありません
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Supabaseの articles テーブルにテスト記事を追加すると、ここに一覧が表示されます。
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
