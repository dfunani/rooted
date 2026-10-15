"use client";

import Image from "next/image";
import { DragEvent } from "react";

import styles from "@/src/components/canvas.module.css";

type Props = {
  src: string;
  label: string;
};

export default function MenuItem(props: Props) {
  function onDragStart(event: DragEvent) {
    event.dataTransfer.setData(
      "application/rooted-avatar",
      JSON.stringify({ src: props.src, label: props.label })
    );
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <li>
      <button
        type="button"
        className={styles.paletteItem}
        draggable
        onDragStart={onDragStart}
        aria-label={`Add ${props.label}`}
        title="Drag onto the canvas"
      >
        <Image src={props.src} alt={props.label} width={96} height={96} />
      </button>
    </li>
  );
}
