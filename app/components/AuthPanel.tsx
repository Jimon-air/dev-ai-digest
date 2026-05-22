"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const RESEND_COOLDOWN_SECONDS = 60;

function isEmailRateLimitError(error: unknown) {
  const authError = error as { status?: number; code?: string };

  return (
    authError.status === 429 ||
    authError.code === "over_email_send_rate_limit"
  );
}

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (error) {
        setUser(null);
      } else {
        setUser(data.user);
      }

      setIsAuthLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldownSeconds]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || resendCooldownSeconds > 0) {
      return;
    }

    const trimmedEmail = email.trim();

    setMessage(null);
    setErrorMessage(null);

    if (!trimmedEmail) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Failed to send login link:", error);

      if (isEmailRateLimitError(error)) {
        setErrorMessage(
          "短時間に複数回送信されたため、少し時間をおいてから再度お試しください。",
        );
        setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
        return;
      }

      setErrorMessage("ログインリンクの送信に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setMessage("ログインリンクを送信しました。メールを確認してください。");
    setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
  }

  async function handleLogout() {
    setMessage(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signOut();

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("ログアウトに失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setUser(null);
    setEmail("");
    setMessage("ログアウトしました。");
  }

  const isLoginButtonDisabled = isSubmitting || resendCooldownSeconds > 0;
  const loginButtonLabel = isSubmitting
    ? "送信中..."
    : resendCooldownSeconds > 0
      ? `再送信はあと ${resendCooldownSeconds} 秒`
      : "ログインリンクを送信";

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:min-w-80">
      {isAuthLoading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ログイン状態を確認しています。
        </p>
      ) : user ? (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              ログイン中
            </p>
            <p className="mt-1 break-all text-sm font-medium text-zinc-950 dark:text-zinc-50">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {isSubmitting ? "処理中..." : "ログアウト"}
          </button>
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={handleLogin}>
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Magic Linkログイン
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="auth-email"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              メールアドレス
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={isSubmitting}
              className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-emerald-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoginButtonDisabled}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
          >
            {loginButtonLabel}
          </button>
        </form>
      )}

      {message ? (
        <p className="mt-3 text-sm leading-6 text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 text-sm leading-6 text-red-700 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
