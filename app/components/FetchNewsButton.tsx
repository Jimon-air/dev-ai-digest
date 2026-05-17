"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FetchNewsResponse = {
  message: string;
  fetchedCount: number;
  insertedCount: number;
  skippedCount: number;
};

export function FetchNewsButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFetchNews() {
    setIsLoading(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/fetch-news", {
        method: "POST",
      });
      const result = (await response.json()) as FetchNewsResponse;

      if (!response.ok) {
        setErrorMessage(result.message || "ニュース取得に失敗しました。");
        return;
      }

      setMessage(
        `${result.message} 取得: ${result.fetchedCount}件 / 追加: ${result.insertedCount}件 / スキップ: ${result.skippedCount}件`,
      );
      router.refresh();
    } catch {
      setErrorMessage("ニュース取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleFetchNews}
        disabled={isLoading}
        className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
      >
        {isLoading ? "取得中..." : "ニュースを取得"}
      </button>
      {message ? (
        <p className="text-sm leading-6 text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="text-sm leading-6 text-red-700 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
