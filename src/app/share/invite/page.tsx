"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "@/src/public/styles/auth.module.css";

export default function InviteAcceptPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const token = params.get("token") ?? "";
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) localStorage.setItem("rooted_invite", token);
  }, [token]);

  useEffect(() => {
    async function autoAccept() {
      const stored = token || localStorage.getItem("rooted_invite");
      if (status !== "authenticated" || !stored) return;
      const response = await fetch("/api/share/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: stored }),
      });
      if (response.ok) {
        localStorage.removeItem("rooted_invite");
        setMessage("Invite accepted. You can open Rooted to collaborate.");
      }
    }
    autoAccept();
  }, [status, token]);

  return (
    <div className="main">
      <div className={styles.shell} style={{ maxWidth: 720 }}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Invitation</p>
          <h1 className={styles.heroBrand}>Rooted</h1>
          <p className={styles.heroCopy}>
            You&apos;ve been invited to a family tree.
          </p>
        </section>
        <div className={styles["login-container"]}>
          <h2 className={styles.h2}>Accept invite</h2>
          <p className={styles.subtitle}>
            Sign in with the invited email to accept access.
          </p>
          {status !== "authenticated" ? (
            <button
              type="button"
              className={styles.button}
              onClick={() => router.push("/auth/user/login")}
            >
              Sign in to accept
            </button>
          ) : (
            <button
              type="button"
              className={styles.button}
              onClick={() => router.push("/")}
            >
              Open Rooted
            </button>
          )}
          {message && <p className={styles.subtitle}>{message}</p>}
        </div>
      </div>
    </div>
  );
}
