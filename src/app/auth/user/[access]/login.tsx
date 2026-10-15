"use client";

import styles from "@/src/public/styles/auth.module.css";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

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

  function handleUpdateCredentials(key: string, value: string) {
    if (resolveText) setresolveText(null);
    setCredentials((prevCreds: CredentialsType) => {
      return { ...prevCreds, [key]: value };
    });
  }

  async function handleLogin() {
    const response = await signIn("credentials", {
      ...credentials,
      redirect: false,
      callbackUrl: "/",
    });

    if (!response?.ok) {
      router.push("/auth/user/login?resolve=Invalid");
    } else router.push("/");
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
          Map the people who made you — photos, places, and the ties between them.
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
        />
        {resolveText && <p className={styles.error}>{resolveText}</p>}
      </div>
    </div>
  );
}
