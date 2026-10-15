"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "@/src/public/styles/auth.module.css";

export default function VerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Open the verification link from your email, or resend below.");
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
  }, [token]);

  async function resend() {
    if (!email) return;
    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setMessage(
      response.ok
        ? "If that account needs verification, we sent a new link."
        : "Could not resend. Try again shortly."
    );
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
          <p className={styles.subtitle}>Checking your link…</p>
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
        {status === "error" && (
          <div className={styles.form}>
            <p className={styles.subtitle}>{message}</p>
            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="button" className={styles.button} onClick={resend}>
              Resend verification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
