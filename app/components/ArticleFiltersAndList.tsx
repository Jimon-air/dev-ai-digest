"use client";

import { useMemo, useState } from "react";

export type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  category: string | null;
  published_at: string | null;
};

type ArticleFiltersAndListProps = {
  articles: Article[];
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const ISO_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateTime(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return Number.NaN;
  }

  if (ISO_TIME_ZONE_PATTERN.test(trimmedValue)) {
    return Date.parse(trimmedValue);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return Date.parse(`${trimmedValue}T00:00:00Z`);
  }

  return Date.parse(`${trimmedValue.replace(" ", "T")}Z`);
}

function formatPublishedAt(value: string | null) {
  if (!value) {
    return "公開日時なし";
  }

  const timestamp = parseDateTime(value);

  if (Number.isNaN(timestamp)) {
    return "日時不明";
  }

  const jstDate = new Date(timestamp + JST_OFFSET_MS);
  const year = jstDate.getUTCFullYear();
  const month = padDatePart(jstDate.getUTCMonth() + 1);
  const day = padDatePart(jstDate.getUTCDate());
  const hours = padDatePart(jstDate.getUTCHours());
  const minutes = padDatePart(jstDate.getUTCMinutes());

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function getUniqueValues(
  articles: Article[],
  key: "source" | "category",
) {
  return Array.from(
    new Set(
      articles
        .map((article) => article[key])
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function ArticleFiltersAndList({
  articles,
}: ArticleFiltersAndListProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const sourceOptions = useMemo(
    () => getUniqueValues(articles, "source"),
    [articles],
  );
  const categoryOptions = useMemo(
    () => getUniqueValues(articles, "category"),
    [articles],
  );

  const filteredArticles = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        article.title.toLowerCase().includes(normalizedKeyword);
      const matchesSource =
        selectedSource.length === 0 || article.source === selectedSource;
      const matchesCategory =
        selectedCategory.length === 0 ||
        article.category === selectedCategory;

      return matchesKeyword && matchesSource && matchesCategory;
    });
  }, [articles, keyword, selectedCategory, selectedSource]);

  const hasActiveFilters =
    keyword.trim().length > 0 ||
    selectedSource.length > 0 ||
    selectedCategory.length > 0;

  function clearFilters() {
    setKeyword("");
    setSelectedSource("");
    setSelectedCategory("");
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              記事を絞り込む
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              タイトル、情報源、カテゴリで記事を探せます。
            </p>
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {articles.length}件中 {filteredArticles.length}件を表示
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)_minmax(10rem,14rem)_auto] lg:items-end">
          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            キーワード
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="タイトルで検索"
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-normal text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-400"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            source
            <select
              value={selectedSource}
              onChange={(event) => setSelectedSource(event.target.value)}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-normal text-zinc-950 outline-none transition-colors focus:border-emerald-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-400"
            >
              <option value="">すべて</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            category
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-normal text-zinc-950 outline-none transition-colors focus:border-emerald-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-400"
            >
              <option value="">すべて</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:w-fit"
          >
            条件クリア
          </button>
        </div>
      </div>

      {filteredArticles.length > 0 ? (
        <div className="grid gap-4">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {article.source ?? "情報源なし"}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {article.category ?? "カテゴリなし"}
                  </span>
                  <time
                    dateTime={article.published_at ?? undefined}
                    className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {formatPublishedAt(article.published_at)}
                  </time>
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-xl font-semibold leading-8 text-zinc-950 dark:text-zinc-50">
                    {article.title}
                  </h2>
                  <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 sm:flex-row sm:items-center">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-fit"
                    >
                      記事を開く
                    </a>
                    {/* Hydration mismatch調査用の一時差分: SaveArticleButtonのみ表示しない */}
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      保存ボタンは一時的に非表示
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            条件に一致する記事がありません
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            キーワードや絞り込み条件を変更して、もう一度試してください。
          </p>
        </div>
      )}
    </section>
  );
}
