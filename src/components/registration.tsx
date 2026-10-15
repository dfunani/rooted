"use client";

import { ChangeEvent, useState } from "react";

import styles from "@/src/public/styles/auth.module.css";
import AddButton from "@/src/components/add-button";
import { RegistrationType } from "@/src/public/types/user";
import { uploadImageFile } from "@/src/public/utils/upload";

type Props = {
  registration: Omit<RegistrationType, "email" | "password">;
  handleUpdateRegistration: (key: string, value: string) => void;
  handleRegistration: () => void;
  submitLabel?: string;
};

export default function Registration(props: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleUpdateImage(file: File) {
    setUploading(true);
    try {
      // Prefer media API when signed in; during registration fall back to data URL
      // (server stores it in GridFS/S3 on createUser / updateUser).
      const url = await uploadImageFile(file);
      if (url) {
        props.handleUpdateRegistration("image", url);
        return;
      }

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
        <p className={styles.subtitle} style={{ textAlign: "center" }}>
          Uploading photo…
        </p>
      )}
      <input
        className={styles.input}
        aria-label="Name"
        type="text"
        placeholder="First name"
        required
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
        >
          {props.submitLabel ?? "Create my tree"}
        </button>
      </div>
    </div>
  );
}
