"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import styles from "@/src/components/canvas.module.css";
import CanvasItem from "@/src/components/canvas-item";
import RelationshipEdge from "@/src/components/relationship-edge";
import { EdgeType, NodeType } from "@/src/public/types/editor";
import { EditorProvider } from "@/src/public/utils/editor-context";

const nodeTypes = { "Canvas-Item": CanvasItem };
const edgeTypes = { relationship: RelationshipEdge };

export default function SharePage() {
  const params = useParams();
  const token = params.token?.toString() ?? "";
  const [nodes, setNodes] = useState<NodeType[]>([]);
  const [edges, setEdges] = useState<EdgeType[]>([]);
  const [ownerName, setOwnerName] = useState("Family");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(
        `/api/share?token=${encodeURIComponent(token)}`
      );
      if (!response.ok) {
        setError("This share link is unavailable.");
        return;
      }
      const data = await response.json();
      const shareSuffix = `?share=${encodeURIComponent(token)}`;
      const loadedNodes: NodeType[] = (data.message.nodes ?? []).map(
        (node: NodeType) => ({
          ...node,
          data: {
            ...node.data,
            image:
              typeof node.data.image === "string" &&
              node.data.image.startsWith("/api/media/")
                ? `${node.data.image}${shareSuffix}`
                : node.data.image,
          },
        })
      );
      setNodes(loadedNodes);
      setEdges(data.message.edges ?? []);
      setOwnerName(data.message.ownerName || "Family");
    }
    if (token) load();
  }, [token]);

  const editorActions = useMemo(
    () => ({
      readOnly: true,
      getNodes: () => nodes,
      getEdges: () => edges,
      setGraph: () => undefined,
      updateNodeData: () => undefined,
      removeNode: () => undefined,
    }),
    [nodes, edges]
  );

  if (error) {
    return (
      <div className="main">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <EditorProvider value={editorActions}>
      <div className={styles.canvas}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          defaultEdgeOptions={{
            type: "relationship",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#1e3d32" },
            style: { stroke: "#3d5c4e", strokeWidth: 2 },
          }}
        >
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1.5}
            color="#5c7a6a55"
          />
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              zIndex: 5,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 18,
              padding: "0.85rem 1.1rem",
              boxShadow: "var(--shadow)",
            }}
          >
            <div className={styles.brandChip}>Rooted</div>
            <div style={{ color: "var(--sage)", fontSize: "0.9rem" }}>
              Shared tree from {ownerName} · view only
            </div>
          </div>
        </ReactFlow>
      </div>
    </EditorProvider>
  );
}
