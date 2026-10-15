import styles from "@/src/app/not-found.module.css";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>Rooted</p>
        <h1 className={styles.title}>This path doesn’t grow here</h1>
        <p className={styles.message}>
          The page you’re looking for isn’t on the tree. Head home and keep mapping your roots.
        </p>
        <div className={styles.navigation}>
          <Link href="/" className={styles.link}>
            Back to Rooted
          </Link>
        </div>
      </div>
    </div>
  );
}
