"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/src/public/styles/auth.module.css";

export default function ResetPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (response.ok) {
        setDone(true);
        setMessage("Password updated. You can sign in now.");
      } else {
        const data = await response.json();
        setMessage(data.message || "Could not reset password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>New password</p>
        <h1 className={styles.heroBrand}>Rooted</h1>
        <p className={styles.heroCopy}>
          Choose a strong password — 8+ characters, a number, and a symbol.
        </p>
      </section>
      <div className={styles["login-container"]}>
        <h2 className={styles.h2}>Reset password</h2>
        {!done ? (
          <div className={styles.form}>
            <input
              className={styles.input}
              type="password"
              placeholder="New password"
              value={password}
              disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.button}
              onClick={submit}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <span className={styles.spinner} aria-hidden />}
              {loading ? "Updating…" : "Update password"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.button}
            onClick={() => router.push("/auth/user/login")}
          >
            Sign in
          </button>
        )}
        {message && <p className={styles.subtitle}>{message}</p>}
      </div>
    </div>
  );
}
