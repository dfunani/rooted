"use client";

import styles from "@/src/public/styles/auth.module.css";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Login from "@/src/components/login";
import Registration from "@/src/components/registration";

import { validateEmail, validatePassword } from "@/src/public/utils/validators";
import { RegistrationType } from "@/src/public/types/user";

export default function Page() {
  const router = useRouter();
  const [submit, setSubmit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolveText, setResolveText] = useState<string | null>(null);
  const [registration, setRegistration] = useState<RegistrationType>({
    email: "",
    password: "",
    name: "",
    surname: "",
    dob: "",
    city: "",
    country: "",
    image: "",
  });

  function handleLogin() {
    if (
      validateEmail(registration.email) &&
      validatePassword(registration.password)
    ) {
      setResolveText(null);
      setSubmit(true);
    } else {
      setResolveText(
        "Use a valid email and a password with 8+ chars, a number, and a symbol."
      );
    }
  }

  function handleUpdateRegistration(key: string, value: string) {
    setRegistration((prev) => ({ ...prev, [key]: value }));
  }

  async function handleRegistration() {
    if (loading) return;
    setLoading(true);
    setResolveText(null);
    try {
      const response = await fetch("/api/auth/user", {
        method: "POST",
        body: JSON.stringify(registration),
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json().catch(() => ({}));
      const serverMessage =
        typeof data.message === "string" ? data.message : null;

      if (response.ok) {
        if (data.message?.emailVerificationRequired) {
          const params = new URLSearchParams();
          params.set("email", registration.email);
          if (data.message.verifyUrl) {
            params.set("link", data.message.verifyUrl);
          }
          if (data.message.emailQueued === false) {
            params.set("delivery", "failed");
          }
          router.push(`/auth/user/verify?${params.toString()}`);
          return;
        }
        router.push(`/auth/user/login?resolve=Created`);
      } else if (response.status === 409) {
        router.push(`/auth/user/login?resolve=Conflict`);
      } else if (response.status === 429) {
        setResolveText("Too many attempts. Please wait and try again.");
      } else {
        setResolveText(
          serverMessage ||
            "Invalid submission. Check password rules and all fields, then try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Start your lineage</p>
        <h1 className={styles.heroBrand}>Rooted</h1>
        <p className={styles.heroCopy}>
          Create an account, add photos, and grow a tree you can share with
          family.
        </p>
      </section>
      <div className={styles["login-container"]}>
        <p className={styles.eyebrow}>New account</p>
        <h2 className={styles.h2}>
          {submit ? "About you" : "Create account"}
        </h2>
        <p className={styles.subtitle}>
          {submit
            ? "Add a photo and a few details — you can edit them later."
            : "We’ll email a verification link before you can sign in."}
        </p>
        {loading && (
          <p className={styles.statusRow}>
            <span
              className={`${styles.spinner} ${styles.spinnerDark}`}
              aria-hidden
            />
            Validating with the server…
          </p>
        )}
        {!submit && (
          <Login
            credentials={{
              email: registration.email,
              password: registration.password,
            }}
            handleUpdateCredentials={handleUpdateRegistration}
            handleLogin={handleLogin}
          />
        )}
        {resolveText && <p className={styles.error}>{resolveText}</p>}
        {submit && (
          <Registration
            registration={registration}
            handleUpdateRegistration={handleUpdateRegistration}
            handleRegistration={handleRegistration}
            loading={loading}
            loadingLabel="Creating your account…"
          />
        )}
      </div>
    </div>
  );
}
