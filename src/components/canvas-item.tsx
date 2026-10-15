"use client";

import { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { useDispatch, useSelector } from "react-redux";
import styles from "@/src/components/canvas.module.css";
import { EdgeType, NodeDataType, NodeType } from "@/src/public/types/editor";
import { StateReducerType } from "@/src/public/types/states";
import Modal from "@/src/components/modal";
import { UPDATE } from "@/lib/reducers/editor";

type Props = {
  id: string;
  data: NodeDataType;
  isConnectable: boolean | undefined;
};

export default function CanvasItem(props: Props) {
  const dispatch = useDispatch();
  const userState = useSelector((state: StateReducerType) => state.user);
  const editorState = useSelector((state: StateReducerType) => state.editor);

  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState(false);

  async function saveNodes(nodes: NodeType[], edges: EdgeType[]) {
    const response = await fetch("/api/editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userState.id,
        nodes,
        edges,
      }),
    });
    if (response.ok) {
      dispatch(UPDATE({ nodes: nodes ?? [], edges: edges ?? [] }));
    }
  }

  async function deleteNodes(id: string) {
    const nodes = editorState.nodes?.filter((value: NodeType) => value.id !== id);
    const edges = editorState.edges?.filter(
      (value: EdgeType) => value.source !== id && value.target !== id
    );
    await saveNodes(nodes ?? [], edges ?? []);
    setExpanded(false);
  }

  async function updateNodes(id: string, new_node: Partial<NodeDataType>) {
    const nodes = editorState.nodes?.map((node: NodeType) => {
      if (node.id === id) {
        return {
          ...node,
          data: { ...node.data, ...new_node },
        };
      }
      return node;
    });
    await saveNodes(nodes ?? [], editorState.edges ?? []);
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
        </div>
      )}

      {modal && (
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
