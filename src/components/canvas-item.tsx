"use client";

import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { useSelector } from "react-redux";

import styles from "@/src/components/canvas.module.css";
import { NodeDataType } from "@/src/public/types/editor";
import { StateReducerType } from "@/src/public/types/states";
import Modal from "@/src/components/modal";
import { useEditorActions } from "@/src/public/utils/editor-context";

type Props = {
  id: string;
  data: NodeDataType;
  isConnectable: boolean | undefined;
};

export default function CanvasItem(props: Props) {
  const userState = useSelector((state: StateReducerType) => state.user);
  const { getNodes, getEdges, setGraph, updateNodeData, readOnly } =
    useEditorActions();

  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(false);

  async function persist(nodes = getNodes(), edges = getEdges()) {
    if (!userState.id) return;
    await fetch("/api/editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userState.id,
        nodes,
        edges,
      }),
    });
  }

  async function deleteNodes(id: string) {
    const nodes = getNodes().filter((value) => value.id !== id);
    const edges = getEdges().filter(
      (value) => value.source !== id && value.target !== id
    );
    setGraph(nodes, edges);
    await persist(nodes, edges);
    setExpanded(false);
  }

  async function updateNodes(id: string, new_node: Partial<NodeDataType>) {
    updateNodeData(id, new_node);
    const nodes = getNodes().map((node) =>
      node.id === id ? { ...node, data: { ...node.data, ...new_node } } : node
    );
    await persist(nodes, getEdges());
    setExpanded(false);
  }

  function downloadImage() {
    const src = props.data.image as string;
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = `${props.data.name || "person"}-${props.data.surname || "photo"}`;
    link.click();
  }

  const imageSrc = (props.data.image as string) || "/avatars/person-1.svg";

  return (
    <div
      className={`${styles["node-item"]} ${expanded ? "" : styles.rounded}`}
      onClick={() => setExpanded((prev) => !prev)}
    >
      <Handle type="source" id="top-s" position={Position.Top} isConnectable={props.isConnectable} />
      <Handle type="target" id="top-t" position={Position.Top} isConnectable={props.isConnectable} />
      <Handle type="source" id="bottom-s" position={Position.Bottom} isConnectable={props.isConnectable} />
      <Handle type="target" id="bottom-t" position={Position.Bottom} isConnectable={props.isConnectable} />
      <Handle type="source" id="left-s" position={Position.Left} isConnectable={props.isConnectable} />
      <Handle type="target" id="left-t" position={Position.Left} isConnectable={props.isConnectable} />
      <Handle type="source" id="right-s" position={Position.Right} isConnectable={props.isConnectable} />
      <Handle type="target" id="right-t" position={Position.Right} isConnectable={props.isConnectable} />

      {!expanded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles["node-img"]}
          src={imageSrc}
          alt={props.data.label}
        />
      )}

      {expanded && (
        <div className={styles["node-content"]}>
          <div className={styles["node-name"]}>
            {props.data.name} {props.data.surname}
          </div>
          <div className={styles["node-location"]}>
            {props.data.city}, {props.data.country}
          </div>
          <div className={styles["node-dob"]}>{props.data.dob}</div>
          {!readOnly && (
            <div className={styles["node-buttons"]}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setModal(true);
                  setExpanded(false);
                }}
                aria-label="Edit"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNodes(props.id);
                }}
                aria-label="Delete"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage();
                }}
                aria-label="Download photo"
              >
                Photo
              </button>
            </div>
          )}
        </div>
      )}

      {modal && !readOnly && (
        <Modal
          setClicked={setExpanded}
          setModal={setModal}
          updateNodes={updateNodes}
          id={props.id}
        />
      )}
    </div>
  );
}
