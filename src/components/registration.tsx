"use client";

import { ChangeEvent, useState } from "react";

import styles from "@/src/public/styles/auth.module.css";
import AddButton from "@/src/components/add-button";
import { RegistrationType } from "@/src/public/types/user";

type Props = {
  registration: Omit<RegistrationType, "email" | "password">;
  handleUpdateRegistration: (key: string, value: string) => void;
  handleRegistration: () => void;
  submitLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
};

export default function Registration(props: Props) {
  const [uploading, setUploading] = useState(false);
  const busy = Boolean(props.loading) || uploading;

  async function handleUpdateImage(file: File) {
    setUploading(true);
    try {
      // Registration is unauthenticated — skip /api/media and use a data URL.
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      props.handleUpdateRegistration("image", dataUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.form}>
      <div className={styles.profile}>
        <input
          className={styles.file}
          type="file"
          name="Picture"
          id="picture"
          accept="image/*"
          disabled={busy}
          onChange={async (event: ChangeEvent) => {
            const response = event.target as HTMLInputElement;
            const files = response.files;
            if (!files?.[0]) return;
            await handleUpdateImage(files[0]);
          }}
        />
        <div className={styles["file-button"]}>
          {!props.registration.image && <AddButton />}
          {props.registration.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.registration.image as string}
              alt="Profile"
              className={styles["file-image"]}
            />
          )}
        </div>
      </div>
      {uploading && (
        <p className={styles.statusRow} style={{ justifyContent: "center" }}>
          <span className={`${styles.spinner} ${styles.spinnerDark}`} aria-hidden />
          Uploading photo…
        </p>
      )}
      <input
        className={styles.input}
        aria-label="Name"
        type="text"
        placeholder="First name"
        required
        disabled={busy}
        onChange={(event: ChangeEvent) =>
          props.handleUpdateRegistration(
            "name",
            (event.target as HTMLInputElement).value
          )
        }
      />
      <input
        className={styles.input}
        aria-label="Surname"
        type="text"
        placeholder="Surname"
        required
        disabled={busy}
        onChange={(event: ChangeEvent) =>
          props.handleUpdateRegistration(
            "surname",
            (event.target as HTMLInputElement).value
          )
        }
      />
      <input
        className={styles.input}
        aria-label="Date of Birth"
        type="date"
        required
        disabled={busy}
        onChange={(event: ChangeEvent) =>
          props.handleUpdateRegistration(
            "dob",
            (event.target as HTMLInputElement).value
          )
        }
      />
      <input
        className={styles.input}
        aria-label="City"
        required
        type="text"
        placeholder="City"
        disabled={busy}
        onChange={(event: ChangeEvent) =>
          props.handleUpdateRegistration(
            "city",
            (event.target as HTMLInputElement).value
          )
        }
      />
      <input
        className={styles.input}
        aria-label="Country"
        required
        type="text"
        placeholder="Country"
        disabled={busy}
        onChange={(event: ChangeEvent) =>
          props.handleUpdateRegistration(
            "country",
            (event.target as HTMLInputElement).value
          )
        }
      />
      <div className={styles.section}>
        <button
          className={styles.button}
          onClick={() => props.handleRegistration()}
          type="button"
          disabled={busy}
          aria-busy={busy}
        >
          {props.loading && <span className={styles.spinner} aria-hidden />}
          {props.loading
            ? props.loadingLabel || "Creating account…"
            : props.submitLabel ?? "Create my tree"}
        </button>
      </div>
    </div>
  );
}
