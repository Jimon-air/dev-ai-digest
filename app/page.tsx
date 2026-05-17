import { supabase } from "@/lib/supabase";
import { AuthPanel } from "./components/AuthPanel";

export const dynamic = "force-dynamic";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  category: string | null;
  published_at: string | null;
};

function formatPublishedAt(value: string | null) {
  if (!value) {
    return "公開日時なし";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function Home() {
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, url, source, category, published_at")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch articles:", error);
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Dev AI Digest
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl dark:text-zinc-50">
                AI・開発ツールニュース
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
                RSSから取得した記事を新しい順に表示します。
              </p>
            </div>
            <AuthPanel />
          </div>
        </header>

        {error ? (
          <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-950 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100">
            <h2 className="text-base font-semibold">記事の取得に失敗しました</h2>
            <p className="mt-2 text-sm leading-6">
              時間をおいて再読み込みしてください。Supabaseの接続設定やRLSポリシーも確認してください。
            </p>
          </section>
        ) : articles && articles.length > 0 ? (
          <section className="grid gap-4">
            {(articles as Article[]).map((article) => (
              <article
                key={article.id}
                className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span>{article.source ?? "情報源なし"}</span>
                    <span aria-hidden="true">/</span>
                    <span>{article.category ?? "カテゴリなし"}</span>
                    <span aria-hidden="true">/</span>
                    <time dateTime={article.published_at ?? undefined}>
                      {formatPublishedAt(article.published_at)}
                    </time>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h2 className="text-xl font-semibold leading-8 text-zinc-950 dark:text-zinc-50">
                      {article.title}
                    </h2>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-fit text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                    >
                      記事を開く
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </section>
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
