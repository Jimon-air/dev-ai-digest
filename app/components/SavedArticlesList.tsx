"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string | null;
  category: string | null;
  published_at: string | null;
};

type SavedArticle = {
  id: string;
  article_id: string | null;
  status: string | null;
  memo: string | null;
  created_at: string | null;
  articles: Article | Article[] | null;
};

type SavedArticleRow = {
  id: string;
  article_id: string;
  status: string | null;
  memo: string | null;
  created_at: string | null;
};

type StatusFilter = "all" | "unread" | "read";

const STATUS_FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "すべて", value: "all" },
  { label: "未読", value: "unread" },
  { label: "読了", value: "read" },
];

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

function formatDateTime(value: string | null) {
  if (!value) {
    return "日時なし";
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

function getArticle(savedArticle: SavedArticle) {
  if (Array.isArray(savedArticle.articles)) {
    return savedArticle.articles[0] ?? null;
  }

  return savedArticle.articles;
}

function getStatusLabel(status: string | null) {
  if (status === "unread") {
    return "未読";
  }

  if (status === "read") {
    return "読了";
  }

  return "未設定";
}

function getNextStatus(status: string | null) {
  return status === "read" ? "unread" : "read";
}

function getToggleStatusLabel(status: string | null) {
  return status === "read" ? "未読に戻す" : "読了にする";
}

function getStatusBadgeClassName(status: string | null) {
  if (status === "unread") {
    return "w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (status === "read") {
    return "w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  return "w-fit rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function getStatusFilterButtonClassName(isSelected: boolean) {
  const baseClassName =
    "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";

  if (isSelected) {
    return `${baseClassName} bg-emerald-700 text-white dark:bg-emerald-500 dark:text-zinc-950`;
  }

  return `${baseClassName} text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`;
}

async function fetchSavedArticles(userId: string) {
  const relationResult = await supabase
    .from("saved_articles")
    .select(
      `
      id,
      article_id,
      status,
      memo,
      created_at,
      articles (
        id,
        title,
        url,
        source,
        category,
        published_at
      )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!relationResult.error) {
    return relationResult.data as SavedArticle[];
  }

  const savedResult = await supabase
    .from("saved_articles")
    .select("id, article_id, status, memo, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (savedResult.error) {
    throw savedResult.error;
  }

  const savedRows = (savedResult.data ?? []) as SavedArticleRow[];

  if (savedRows.length === 0) {
    return [];
  }

  const articleIds = savedRows.map((row) => row.article_id);
  const articlesResult = await supabase
    .from("articles")
    .select("id, title, url, source, category, published_at")
    .in("id", articleIds);

  if (articlesResult.error) {
    throw articlesResult.error;
  }

  const articlesById = new Map(
    ((articlesResult.data ?? []) as Article[]).map((article) => [
      article.id,
      article,
    ]),
  );

  return savedRows.map((row) => ({
    ...row,
    articles: articlesById.get(row.article_id) ?? null,
  }));
}

export function SavedArticlesList() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingSavedArticleId, setUpdatingSavedArticleId] = useState<
    string | null
  >(null);
  const [statusErrorById, setStatusErrorById] = useState<
    Record<string, string>
  >({});
  const [memoDraftById, setMemoDraftById] = useState<Record<string, string>>(
    {},
  );
  const [savingMemoId, setSavingMemoId] = useState<string | null>(null);
  const [memoErrorById, setMemoErrorById] = useState<Record<string, string>>(
    {},
  );
  const [deletingSavedArticleId, setDeletingSavedArticleId] = useState<
    string | null
  >(null);
  const [deleteErrorById, setDeleteErrorById] = useState<
    Record<string, string>
  >({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredSavedArticles =
    statusFilter === "all"
      ? savedArticles
      : savedArticles.filter((article) => article.status === statusFilter);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setUser(error ? null : data.user);
      setIsAuthLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
      setErrorMessage(null);

      if (!session?.user) {
        setSavedArticles([]);
        setStatusErrorById({});
        setUpdatingSavedArticleId(null);
        setMemoDraftById({});
        setMemoErrorById({});
        setSavingMemoId(null);
        setDeleteErrorById({});
        setDeletingSavedArticleId(null);
        setStatusFilter("all");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedArticles(currentUser: User) {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const articles = await fetchSavedArticles(currentUser.id);

        if (!isMounted) {
          return;
        }

        setSavedArticles(articles);
        setMemoDraftById(
          Object.fromEntries(
            articles.map((savedArticle) => [
              savedArticle.id,
              savedArticle.memo ?? "",
            ]),
          ),
        );
        setMemoErrorById({});
        setDeleteErrorById({});
      } catch {
        if (isMounted) {
          setErrorMessage("保存済み記事を取得できませんでした。");
          setSavedArticles([]);
          setMemoDraftById({});
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (user) {
      loadSavedArticles(user);
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleToggleStatus(savedArticle: SavedArticle) {
    if (!user || updatingSavedArticleId) {
      return;
    }

    const nextStatus = getNextStatus(savedArticle.status);

    setUpdatingSavedArticleId(savedArticle.id);
    setStatusErrorById((current) => {
      const next = { ...current };
      delete next[savedArticle.id];
      return next;
    });

    const { error } = await supabase
      .from("saved_articles")
      .update({ status: nextStatus })
      .eq("id", savedArticle.id)
      .eq("user_id", user.id);

    setUpdatingSavedArticleId(null);

    if (error) {
      setStatusErrorById((current) => ({
        ...current,
        [savedArticle.id]: "状態を更新できませんでした。",
      }));
      return;
    }

    setSavedArticles((current) =>
      current.map((article) =>
        article.id === savedArticle.id
          ? { ...article, status: nextStatus }
          : article,
      ),
    );
  }

  async function handleSaveMemo(savedArticle: SavedArticle) {
    if (!user || savingMemoId) {
      return;
    }

    const memo = memoDraftById[savedArticle.id] ?? "";

    setSavingMemoId(savedArticle.id);
    setMemoErrorById((current) => {
      const next = { ...current };
      delete next[savedArticle.id];
      return next;
    });

    const { error } = await supabase
      .from("saved_articles")
      .update({ memo })
      .eq("id", savedArticle.id)
      .eq("user_id", user.id);

    setSavingMemoId(null);

    if (error) {
      setMemoErrorById((current) => ({
        ...current,
        [savedArticle.id]: "メモを保存できませんでした。",
      }));
      return;
    }

    setSavedArticles((current) =>
      current.map((article) =>
        article.id === savedArticle.id ? { ...article, memo } : article,
      ),
    );
  }

  async function handleDeleteSavedArticle(savedArticle: SavedArticle) {
    if (!user || deletingSavedArticleId) {
      return;
    }

    setDeletingSavedArticleId(savedArticle.id);
    setDeleteErrorById((current) => {
      const next = { ...current };
      delete next[savedArticle.id];
      return next;
    });

    const { data, error } = await supabase
      .from("saved_articles")
      .delete()
      .eq("id", savedArticle.id)
      .eq("user_id", user.id)
      .select("id");

    setDeletingSavedArticleId(null);

    if (error || !data || data.length === 0) {
      setDeleteErrorById((current) => ({
        ...current,
        [savedArticle.id]: "保存解除できませんでした。",
      }));
      return;
    }

    setSavedArticles((current) =>
      current.filter((article) => article.id !== savedArticle.id),
    );
    setMemoDraftById((current) => {
      const next = { ...current };
      delete next[savedArticle.id];
      return next;
    });
    setStatusErrorById((current) => {
      const next = { ...current };
      delete next[savedArticle.id];
      return next;
    });
    setMemoErrorById((current) => {
      const next = { ...current };
      delete next[savedArticle.id];
      return next;
    });
  }

  if (isAuthLoading) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ログイン状態を確認しています。
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          ログインすると保存済み記事を確認できます
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          トップページでMagic Linkログインを行うと、保存した記事だけをここで確認できます。
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          トップページへ戻る
        </Link>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          保存済み記事を読み込んでいます。
        </p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-950 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-100">
        <h2 className="text-base font-semibold">取得に失敗しました</h2>
        <p className="mt-2 text-sm leading-6">{errorMessage}</p>
      </section>
    );
  }

  if (savedArticles.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          保存済み記事はまだありません
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          トップページの記事一覧から気になる記事を保存できます。
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
        >
          記事一覧へ戻る
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
        {STATUS_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={getStatusFilterButtonClassName(
              statusFilter === option.value,
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {filteredSavedArticles.length === 0 ? (
        <section className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            条件に一致する保存記事がありません
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            フィルターを切り替えると、ほかの保存済み記事を確認できます。
          </p>
        </section>
      ) : null}

      {filteredSavedArticles.map((savedArticle) => {
        const article = getArticle(savedArticle);
        const isUpdatingStatus = updatingSavedArticleId === savedArticle.id;
        const isSavingMemo = savingMemoId === savedArticle.id;
        const isDeleting = deletingSavedArticleId === savedArticle.id;

        return (
          <article
            key={savedArticle.id}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {article?.source ?? "情報源なし"}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {article?.category ?? "カテゴリなし"}
                </span>
                <time
                  dateTime={article?.published_at ?? undefined}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {formatDateTime(article?.published_at ?? null)}
                </time>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold leading-8 text-zinc-950 dark:text-zinc-50">
                  {article?.title ?? "記事情報を取得できませんでした"}
                </h2>

                <dl className="grid gap-4 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-zinc-950 dark:text-zinc-50">
                      状態
                    </dt>
                    <dd className="mt-2 flex flex-col gap-2">
                      <span className={getStatusBadgeClassName(savedArticle.status)}>
                        {getStatusLabel(savedArticle.status)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(savedArticle)}
                        disabled={isUpdatingStatus}
                        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-emerald-700 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-500 disabled:hover:bg-transparent dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:disabled:border-zinc-700 dark:disabled:text-zinc-400 sm:w-fit"
                      >
                        {isUpdatingStatus
                          ? "更新中..."
                          : getToggleStatusLabel(savedArticle.status)}
                      </button>
                      {statusErrorById[savedArticle.id] ? (
                        <span className="text-sm leading-6 text-red-700 dark:text-red-400">
                          {statusErrorById[savedArticle.id]}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-950 dark:text-zinc-50">
                      保存日時
                    </dt>
                    <dd className="mt-2 text-zinc-600 dark:text-zinc-400">
                      {formatDateTime(savedArticle.created_at)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-zinc-950 dark:text-zinc-50">
                      メモ
                    </dt>
                    <dd className="mt-2 flex flex-col gap-2">
                      <textarea
                        value={memoDraftById[savedArticle.id] ?? ""}
                        onChange={(event) =>
                          setMemoDraftById((current) => ({
                            ...current,
                            [savedArticle.id]: event.target.value,
                          }))
                        }
                        rows={4}
                        className="min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-400"
                        placeholder="メモを入力"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveMemo(savedArticle)}
                        disabled={isSavingMemo}
                        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-emerald-700 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-500 disabled:hover:bg-transparent dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:disabled:border-zinc-700 dark:disabled:text-zinc-400 sm:w-fit"
                      >
                        {isSavingMemo ? "保存中..." : "メモを保存"}
                      </button>
                      {memoErrorById[savedArticle.id] ? (
                        <span className="text-sm leading-6 text-red-700 dark:text-red-400">
                          {memoErrorById[savedArticle.id]}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {article ? (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 sm:w-fit"
                    >
                      記事を開く
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedArticle(savedArticle)}
                    disabled={isDeleting}
                    className="inline-flex h-9 w-full items-center justify-center rounded-md border border-red-700 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-500 disabled:hover:bg-transparent dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950/30 dark:disabled:border-zinc-700 dark:disabled:text-zinc-400 sm:w-fit"
                  >
                    {isDeleting ? "解除中..." : "保存解除"}
                  </button>
                </div>
                {deleteErrorById[savedArticle.id] ? (
                  <span className="text-sm leading-6 text-red-700 dark:text-red-400">
                    {deleteErrorById[savedArticle.id]}
                  </span>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
