"use client";

import React, { Dispatch, SetStateAction, useState } from "react";
import styles from "@/src/components/modal.module.css";
import Registration from "@/src/components/registration";
import { buildDate } from "@/src/public/utils/factories";
import { NodeDataType } from "@/src/public/types/editor";

type Props = {
  setClicked: Dispatch<SetStateAction<boolean>>;
  setModal: Dispatch<SetStateAction<boolean>>;
  updateNodes: (id: string, node: Partial<NodeDataType>) => void;
  id: string;
};

export default function Modal(props: Props) {
  const [details, setDetails] = useState<Partial<NodeDataType>>({});

  function handleUpdateRegistration(key: string, value: string) {
    setDetails((prev) => ({
      ...prev,
      [key]: key === "dob" ? buildDate(new Date(value)) : value,
    }));
  }

  async function handleRegistration() {
    props.updateNodes(props.id, details);
    props.setModal(false);
    props.setClicked(false);
  }

  return (
    <div
      className={styles["modal-container"]}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.card}>
        <button
          type="button"
          className={styles["close-button"]}
          onClick={() => {
            props.setModal(false);
            props.setClicked(false);
          }}
          aria-label="Close"
        >
          ×
        </button>
        <h3 className={styles.title}>Edit person</h3>
        <Registration
          registration={{
            name: details.name ?? "",
            surname: details.surname ?? "",
            dob: details.dob ?? "",
            city: details.city ?? "",
            country: details.country ?? "",
            image: details.image ?? "",
          }}
          handleUpdateRegistration={handleUpdateRegistration}
          handleRegistration={handleRegistration}
          submitLabel="Save person"
        />
      </div>
    </div>
  );
}
