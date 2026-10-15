"use client";

import { ChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";

import styles from "@/src/public/styles/auth.module.css";
import { CredentialsType } from "@/src/public/types/user";

type Props = {
  credentials: CredentialsType;
  handleUpdateCredentials: (key: string, value: string) => void;
  handleLogin: () => void;
};

export default function Login(props: Props) {
  const router = useRouter();
  const { access } = useParams();
  const param = access?.toString() ?? "";

  return (
    <div className={styles.form}>
      <input
        className={styles.input}
        aria-label="Email"
        autoComplete="email"
        type="email"
        placeholder="Email"
        value={props.credentials.email}
        onChange={(event: ChangeEvent) =>
          props.handleUpdateCredentials(
            "email",
            (event.currentTarget as HTMLInputElement).value
          )
        }
      />
      <input
        className={styles.input}
        aria-label="Password"
        type="password"
        autoComplete={param === "login" ? "current-password" : "new-password"}
        placeholder="Password"
        value={props.credentials.password}
        onChange={(event: ChangeEvent) =>
          props.handleUpdateCredentials(
            "password",
            (event.currentTarget as HTMLInputElement).value
          )
        }
      />
      <div className={styles.section}>
        <button
          className={styles.button}
          onClick={() => props.handleLogin()}
          type="button"
        >
          {param === "login" ? "Sign in" : "Continue"}
        </button>
        {param === "login" && (
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => router.push("/auth/user/register")}
            type="button"
          >
            Create account
          </button>
        )}
        {param === "register" && (
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => router.push("/auth/user/login")}
            type="button"
          >
            Sign in
          </button>
        )}
      </div>
    </div>
  );
}
