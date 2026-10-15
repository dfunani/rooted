"use client";

import styles from "@/src/public/styles/button.module.css";

type Props = {
  show: boolean;
  toggleMenu: () => void;
};

export default function MenuButton(props: Props) {
  return (
    <button
      type="button"
      className={styles["menu-button"]}
      onClick={() => props.toggleMenu()}
      aria-label={props.show ? "Close menu" : "Open menu"}
    >
      {props.show ? "−" : "+"}
    </button>
  );
}
