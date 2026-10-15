"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/src/public/styles/auth.module.css";

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setMessage(
      data.message ||
        "If that account exists, a reset link was sent."
    );
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
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className={styles.section}>
            <button type="button" className={styles.button} onClick={submit}>
              Send reset link
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => router.push("/auth/user/login")}
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
