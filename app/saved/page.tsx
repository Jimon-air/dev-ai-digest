import Link from "next/link";
import { SavedArticlesList } from "../components/SavedArticlesList";

export default function SavedPage() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Dev AI Digest
            </p>
            <Link
              href="/"
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-emerald-700 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30 sm:w-fit"
            >
              トップページへ戻る
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl dark:text-zinc-50">
              保存済み記事
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              保存したAI・開発ツール関連ニュースを確認できます。
            </p>
          </div>
        </header>

        <SavedArticlesList />
      </main>
    </div>
  );
}
