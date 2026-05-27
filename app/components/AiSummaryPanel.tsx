"use client";

import { useRef, useState } from "react";

export type AiSummary = {
  summary_date: string;
  title: string;
  summary: string;
  article_count: number;
  model: string;
};

type GenerateSummaryResponse = {
  message: string;
  summaryDate?: string;
  title?: string;
  summary?: string;
  articleCount?: number;
  model?: string;
  cached?: boolean;
};

type AiSummaryPanelProps = {
  initialSummary: AiSummary | null;
};

function toAiSummary(result: GenerateSummaryResponse): AiSummary | null {
  if (
    !result.summaryDate ||
    !result.title ||
    !result.summary ||
    typeof result.articleCount !== "number" ||
    !result.model
  ) {
    return null;
  }

  return {
    summary_date: result.summaryDate,
    title: result.title,
    summary: result.summary,
    article_count: result.articleCount,
    model: result.model,
  };
}

export function AiSummaryPanel({ initialSummary }: AiSummaryPanelProps) {
  const isRequestInFlight = useRef(false);
  const [summary, setSummary] = useState<AiSummary | null>(initialSummary);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerateSummary() {
    if (isRequestInFlight.current) {
      return;
    }

    isRequestInFlight.current = true;
    setIsGenerating(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/generate-summary", {
        method: "POST",
      });
      const result = (await response.json()) as GenerateSummaryResponse;

      if (!response.ok) {
        setErrorMessage(result.message || "AI要約の生成に失敗しました。");
        return;
      }

      const nextSummary = toAiSummary(result);

      if (!nextSummary) {
        setErrorMessage("AI要約の生成結果を表示できませんでした。");
        return;
      }

      setSummary(nextSummary);
      setMessage(result.message);
    } catch {
      setErrorMessage("AI要約の生成に失敗しました。");
    } finally {
      isRequestInFlight.current = false;
      setIsGenerating(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              AI要約
            </p>
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {summary ? summary.title : "まだAI要約はありません"}
            </h2>
          </div>
          {summary ? (
            <dl className="grid gap-1 text-sm text-zinc-600 dark:text-zinc-400 sm:text-right">
              <div>
                <dt className="sr-only">要約日</dt>
                <dd>{summary.summary_date}</dd>
              </div>
              <div>
                <dt className="sr-only">記事数</dt>
                <dd>{summary.article_count}件の記事から生成</dd>
              </div>
              <div>
                <dt className="sr-only">モデル</dt>
                <dd>{summary.model}</dd>
              </div>
            </dl>
          ) : null}
        </div>

        {summary ? (
          <div className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-300">
            {summary.summary}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              最新記事から今日のAIニュース要約を生成できます。
            </p>
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 sm:w-fit"
            >
              {isGenerating ? "生成中..." : "AI要約を生成"}
            </button>
          </div>
        )}

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
    </section>
  );
}
