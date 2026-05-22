"use client";

import dynamic from "next/dynamic";
import type { Article } from "./ArticleFiltersAndList";

export type { Article } from "./ArticleFiltersAndList";

const ArticleFiltersAndList = dynamic(
  () =>
    import("./ArticleFiltersAndList").then(
      (mod) => mod.ArticleFiltersAndList,
    ),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          記事一覧を読み込んでいます。
        </p>
      </section>
    ),
  },
);

type ClientOnlyArticleFiltersAndListProps = {
  articles: Article[];
};

export function ClientOnlyArticleFiltersAndList({
  articles,
}: ClientOnlyArticleFiltersAndListProps) {
  return <ArticleFiltersAndList articles={articles} />;
}
