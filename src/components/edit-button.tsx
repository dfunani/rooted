"use client";

import styles from "@/src/public/styles/button.module.css";

export default function EditButton() {
  return (
    <button type="button" className={styles["edit-pill"]}>
      <span className={styles["logout-pill-text"]}>Profile</span>
    </button>
  );
}
