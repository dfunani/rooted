"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/src/public/styles/auth.module.css";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(
        typeof data.message === "string"
          ? data.message
          : data.message?.message ||
              "If that account exists, a reset link was sent."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Account recovery</p>
        <h1 className={styles.heroBrand}>Rooted</h1>
        <p className={styles.heroCopy}>
          We&apos;ll email you a secure link to choose a new password.
        </p>
      </section>
      <div className={styles["login-container"]}>
        <h2 className={styles.h2}>Forgot password</h2>
        <div className={styles.form}>
          <input
            className={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className={styles.section}>
            <button
              type="button"
              className={styles.button}
              onClick={submit}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <span className={styles.spinner} aria-hidden />}
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => router.push("/auth/user/login")}
              disabled={loading}
            >
              Back
            </button>
          </div>
        </div>
        {message && <p className={styles.subtitle}>{message}</p>}
      </div>
    </div>
  );
}
