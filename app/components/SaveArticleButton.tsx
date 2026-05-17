"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SaveArticleButtonProps = {
  articleId: string;
};

export function SaveArticleButton({ articleId }: SaveArticleButtonProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSavedLoading, setIsSavedLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
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
        setIsSaved(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedState(currentUser: User) {
      setIsSavedLoading(true);
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("saved_articles")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("article_id", articleId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      setIsSavedLoading(false);

      if (error) {
        setErrorMessage("保存状態を確認できませんでした。");
        return;
      }

      setIsSaved(Boolean(data));
    }

    if (user) {
      loadSavedState(user);
    }

    return () => {
      isMounted = false;
    };
  }, [articleId, user]);

  async function handleSave() {
    if (!user || isSaved || isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { error } = await supabase.from("saved_articles").insert({
      user_id: user.id,
      article_id: articleId,
      status: "unread",
    });

    setIsSaving(false);

    if (error) {
      if (error.code === "23505") {
        setIsSaved(true);
        return;
      }

      setErrorMessage("保存に失敗しました。");
      return;
    }

    setIsSaved(true);
  }

  if (isAuthLoading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-500 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-400"
      >
        ログイン状態を確認中
      </button>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-500 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-400"
      >
        ログインすると保存できます
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={isSavedLoading || isSaving || isSaved}
        className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-emerald-700 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:text-zinc-500 disabled:hover:bg-transparent dark:border-emerald-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:disabled:border-zinc-700 dark:disabled:text-zinc-400"
      >
        {isSaved
          ? "保存済み"
          : isSaving
            ? "保存中..."
            : isSavedLoading
              ? "保存状態を確認中"
              : "保存"}
      </button>
      {errorMessage ? (
        <p className="text-sm leading-6 text-red-700 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
