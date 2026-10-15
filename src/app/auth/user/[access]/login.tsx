"use client";

import styles from "@/src/public/styles/auth.module.css";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import Login from "@/src/components/login";
import { CredentialsType } from "@/src/public/types/user";
import { handleErrors } from "@/src/public/errors/messages";

export default function Page() {
  const router = useRouter();
  const query = useSearchParams();
  const resolve = query.get("resolve");

  const [credentials, setCredentials] = useState<CredentialsType>({
    email: "",
    password: "",
  });
  const [resolveText, setresolveText] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  function handleUpdateCredentials(key: string, value: string) {
    if (resolveText) setresolveText(null);
    setNeedsVerify(false);
    setCredentials((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogin() {
    if (loading) return;
    setLoading(true);
    setresolveText(null);
    try {
      const response = await signIn("credentials", {
        ...credentials,
        redirect: false,
        callbackUrl: "/",
      });

      if (!response?.ok) {
        setNeedsVerify(true);
        setresolveText(
          "Invalid email/password, or your email is not verified yet. You can resend a verification link below."
        );
        return;
      }
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!credentials.email || resending) return;
    setResending(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: credentials.email }),
      });
      setresolveText(
        response.ok
          ? "If that account needs verification, we sent a new link."
          : "Could not resend right now."
      );
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    if (resolve) {
      setresolveText(handleErrors("user", resolve));
      router.replace("/auth/user/login");
    }
  }, [resolve, router]);

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Family trees, grown gently</p>
        <h1 className={styles.heroBrand}>Rooted</h1>
        <p className={styles.heroCopy}>
          Map the people who made you — photos, places, and the ties between
          them.
        </p>
      </section>
      <div className={styles["login-container"]}>
        <p className={styles.eyebrow}>Welcome back</p>
        <h2 className={styles.h2}>Sign in</h2>
        <p className={styles.subtitle}>
          Continue building and sharing your family tree.
        </p>
        <Login
          credentials={credentials}
          handleUpdateCredentials={handleUpdateCredentials}
          handleLogin={handleLogin}
          loading={loading}
          loadingLabel="Signing in…"
        />
        <p className={styles.subtitle}>
          <Link href="/auth/user/forgot">Forgot password?</Link>
        </p>
        {resolveText && <p className={styles.error}>{resolveText}</p>}
        {needsVerify && (
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={resendVerification}
            disabled={resending || loading}
            aria-busy={resending}
          >
            {resending && (
              <span
                className={`${styles.spinner} ${styles.spinnerDark}`}
                aria-hidden
              />
            )}
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        )}
      </div>
    </div>
  );
}
