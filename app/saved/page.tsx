import Link from "next/link";
import { SavedArticlesList } from "../components/SavedArticlesList";

export default function SavedPage() {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="w-fit text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
          >
            トップページへ戻る
          </Link>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Dev AI Digest
            </p>
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
