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

function formatDateTime(value: string | null) {
  if (!value) {
    return "日時なし";
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

function getArticle(savedArticle: SavedArticle) {
  if (Array.isArray(savedArticle.articles)) {
    return savedArticle.articles[0] ?? null;
  }

  return savedArticle.articles;
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
      } catch {
        if (isMounted) {
          setErrorMessage("保存済み記事を取得できませんでした。");
          setSavedArticles([]);
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
      {savedArticles.map((savedArticle) => {
        const article = getArticle(savedArticle);

        return (
          <article
            key={savedArticle.id}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <span>{article?.source ?? "情報源なし"}</span>
                <span aria-hidden="true">/</span>
                <span>{article?.category ?? "カテゴリなし"}</span>
                <span aria-hidden="true">/</span>
                <time dateTime={article?.published_at ?? undefined}>
                  {formatDateTime(article?.published_at ?? null)}
                </time>
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold leading-8 text-zinc-950 dark:text-zinc-50">
                  {article?.title ?? "記事情報を取得できませんでした"}
                </h2>

                <dl className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-3">
                  <div>
                    <dt className="font-medium text-zinc-950 dark:text-zinc-50">
                      状態
                    </dt>
                    <dd className="mt-1">{savedArticle.status ?? "未設定"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-950 dark:text-zinc-50">
                      メモ
                    </dt>
                    <dd className="mt-1">{savedArticle.memo || "メモなし"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-950 dark:text-zinc-50">
                      保存日時
                    </dt>
                    <dd className="mt-1">
                      {formatDateTime(savedArticle.created_at)}
                    </dd>
                  </div>
                </dl>

                {article ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-fit text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                  >
                    記事を開く
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
