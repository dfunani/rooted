"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import styles from "@/src/components/canvas.module.css";
import {
  RELATIONSHIP_LABELS,
  RelationshipType,
} from "@/src/public/types/editor";

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relationship = (data?.relationship as RelationshipType) ?? "related";
  const text =
    (typeof label === "string" && label) ||
    RELATIONSHIP_LABELS[relationship] ||
    "Related";

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className={styles.edgeLabel}
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          {text}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
