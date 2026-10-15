"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/src/public/styles/auth.module.css";

export default function VerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const link = params.get("link");
  const deliveryFailed = params.get("delivery") === "failed";
  const emailParam = params.get("email") ?? "";

  const [status, setStatus] = useState<"working" | "ok" | "error" | "pending">(
    token ? "working" : "pending"
  );
  const [email, setEmail] = useState(emailParam);
  const [message, setMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [fallbackLink, setFallbackLink] = useState(link);

  useEffect(() => {
    if (!token) {
      setStatus("pending");
      setMessage(
        deliveryFailed
          ? "Account created, but we couldn’t send the verification email (check RESEND_API_KEY / EMAIL_FROM in Vercel). Use the link below or resend once email is configured."
          : "Check your inbox for a verification link, or resend below."
      );
      return;
    }

    async function run() {
      const response = await fetch(
        `/api/auth/verify?token=${encodeURIComponent(token!)}`
      );
      if (response.ok) {
        setStatus("ok");
      } else {
        setStatus("error");
        setMessage("This verification link is invalid or expired.");
      }
    }
    run();
  }, [token, deliveryFailed]);

  async function resend() {
    if (!email || resending) return;
    setResending(true);
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        if (data.message?.verifyUrl && data.message?.emailQueued === false) {
          setFallbackLink(data.message.verifyUrl);
          setMessage(
            "Email still couldn’t be delivered. Use the verification link below."
          );
        } else {
          setMessage(
            "If that account needs verification, we sent a new link."
          );
        }
      } else {
        setMessage("Could not resend. Try again shortly.");
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Almost there</p>
        <h1 className={styles.heroBrand}>Rooted</h1>
        <p className={styles.heroCopy}>Confirm your email to unlock your tree.</p>
      </section>
      <div className={styles["login-container"]}>
        <h2 className={styles.h2}>
          {status === "ok" ? "Email verified" : "Verify email"}
        </h2>
        {status === "working" && (
          <p className={styles.statusRow}>
            <span
              className={`${styles.spinner} ${styles.spinnerDark}`}
              aria-hidden
            />
            Checking your verification link…
          </p>
        )}
        {status === "ok" && (
          <>
            <p className={styles.subtitle}>
              You&apos;re in. Sign in to start planting roots.
            </p>
            <button
              type="button"
              className={styles.button}
              onClick={() => router.push("/auth/user/login")}
            >
              Sign in
            </button>
          </>
        )}
        {(status === "error" || status === "pending") && (
          <div className={styles.form}>
            <p className={styles.subtitle}>{message}</p>
            {fallbackLink && (
              <p className={styles.subtitle}>
                <a href={fallbackLink}>Open verification link</a>
              </p>
            )}
            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              disabled={resending}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="button"
              className={styles.button}
              onClick={resend}
              disabled={resending}
              aria-busy={resending}
            >
              {resending && <span className={styles.spinner} aria-hidden />}
              {resending ? "Sending…" : "Resend verification"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
