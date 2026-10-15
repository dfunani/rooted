"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  Panel,
  Connection,
  NodeChange,
  EdgeChange,
  ReactFlowInstance,
  MarkerType,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import { v4 as uuid4 } from "uuid";

import styles from "@/src/components/canvas.module.css";
import MenuItem from "@/src/components/menu-item";
import { buildDate, generateImages } from "@/src/public/utils/factories";
import {
  EdgeType,
  NodeType,
  RELATIONSHIP_LABELS,
  RelationshipType,
} from "@/src/public/types/editor";
import { StateReducerType } from "@/src/public/types/states";
import CanvasItem from "@/src/components/canvas-item";
import RelationshipEdge from "@/src/components/relationship-edge";
import ProfilePanel from "@/src/components/profile-panel";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import { UPDATE as userUpdate } from "@/lib/reducers/user";
import { UPDATE as profileUpdate } from "@/lib/reducers/profile";
import { UPDATE as editorUpdate, CLEAR as editorClear } from "@/lib/reducers/editor";

const nodeTypes = { "Canvas-Item": CanvasItem };
const edgeTypes = { relationship: RelationshipEdge };

type Toast = { text: string; status: "error" | "success" };

type PendingConnection = Connection & { id?: string };

export default function Canvas() {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const userState = useSelector((state: StateReducerType) => state.user);
  const editorState = useSelector((state: StateReducerType) => state.editor);

  const [paletteOpen, setPaletteOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingConnection, setPendingConnection] =
    useState<PendingConnection | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance<NodeType, EdgeType> | null>(
    null
  );
  const bootstrapped = useRef(false);

  // React Flow mutates measured width/height on node objects. Redux/Immer
  // freezes state, so pass plain clones into the canvas.
  const nodes = useMemo(
    () =>
      (editorState.nodes ?? []).map((node) => ({
        ...node,
        position: { ...node.position },
        data: { ...node.data },
      })),
    [editorState.nodes]
  );
  const edges = useMemo(
    () =>
      (editorState.edges ?? []).map((edge) => ({
        ...edge,
        data: edge.data ? { ...edge.data } : undefined,
      })),
    [editorState.edges]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<NodeType>[]) => {
      dispatch(
        editorUpdate({
          nodes: applyNodeChanges(changes, nodes),
          edges,
        })
      );
    },
    [dispatch, nodes, edges]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<EdgeType>[]) => {
      dispatch(
        editorUpdate({
          edges: applyEdgeChanges(changes, edges),
          nodes,
        })
      );
    },
    [dispatch, nodes, edges]
  );

  const onConnect = useCallback((params: Connection) => {
    setPendingConnection(params);
    setEditingEdgeId(null);
  }, []);

  function confirmRelationship(relationship: RelationshipType) {
    if (editingEdgeId) {
      const next = edges.map((edge) =>
        edge.id === editingEdgeId
          ? {
              ...edge,
              label: RELATIONSHIP_LABELS[relationship],
              data: { relationship },
            }
          : edge
      );
      dispatch(editorUpdate({ nodes, edges: next }));
      setEditingEdgeId(null);
      return;
    }

    if (!pendingConnection?.source || !pendingConnection?.target) return;

    const edge: EdgeType = {
      id: uuid4(),
      source: pendingConnection.source,
      target: pendingConnection.target,
      sourceHandle: pendingConnection.sourceHandle,
      targetHandle: pendingConnection.targetHandle,
      type: "relationship",
      label: RELATIONSHIP_LABELS[relationship],
      data: { relationship },
    };

    dispatch(editorUpdate({ nodes, edges: [...edges, edge] }));
    setPendingConnection(null);
  }

  function addNodeAt(position: { x: number; y: number }, src: string) {
    const id = uuid4();
    const node: NodeType = {
      id,
      position,
      type: "Canvas-Item",
      data: {
        name: "New",
        surname: "Relative",
        city: "Hometown",
        country: "Country",
        dob: buildDate(new Date()),
        image: src,
        label: `Canvas-Node-${id}`,
      },
    };
    dispatch(editorUpdate({ nodes: [...nodes, node], edges }));
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/rooted-avatar");
    if (!raw || !reactFlowRef.current) return;

    try {
      const { src } = JSON.parse(raw) as { src: string };
      const position = reactFlowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNodeAt(position, src);
    } catch {
      setToast({ text: "Couldn't add person. Try again.", status: "error" });
    }
  }

  async function saveNodes() {
    try {
      const response = await fetch("/api/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userState.id,
          nodes,
          edges,
        }),
      });

      setToast(
        response.ok
          ? { text: "Family tree saved.", status: "success" }
          : { text: "Couldn't save. Try again later.", status: "error" }
      );
    } catch {
      setToast({ text: "Couldn't save. Try again later.", status: "error" });
    }
  }

  async function deleteEditor() {
    if (!userState.id) return;
    if (!window.confirm("Delete your entire family tree? This cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch("/api/editor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userState.id }),
      });
      if (response.ok) {
        dispatch(editorClear());
        dispatch(editorUpdate({ nodes: [], edges: [] }));
        setToast({ text: "Family tree deleted.", status: "success" });
        setMenuOpen(false);
      } else {
        setToast({ text: "Couldn't delete tree.", status: "error" });
      }
    } catch {
      setToast({ text: "Couldn't delete tree.", status: "error" });
    }
  }

  const paletteItems = useMemo(() => {
    const images = generateImages();
    return Object.entries(images).map(([label, src]) => (
      <MenuItem key={label} src={src} label={label} />
    ));
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id || bootstrapped.current) {
      return;
    }
    bootstrapped.current = true;

    dispatch(
      userUpdate({
        id: session.user.id,
        email: session.user.email ?? null,
        isNewUser: Boolean(session.user.isNewUser),
      })
    );

    async function load() {
      const id = session!.user!.id!;
      const [profileRes, editorRes] = await Promise.all([
        fetch(`/api/auth/user?id=${id}`),
        fetch(`/api/editor?id=${id}`),
      ]);

      if (profileRes.ok) {
        const profile = await profileRes.json();
        dispatch(profileUpdate(profile.message));
      } else {
        setToast({
          text: "Profile failed to load.",
          status: "error",
        });
      }

      if (editorRes.ok) {
        const data = await editorRes.json();
        dispatch(
          editorUpdate({
            nodes: data.message.nodes ?? [],
            edges: data.message.edges ?? [],
          })
        );
      } else {
        dispatch(editorUpdate({ nodes: [], edges: [] }));
      }
    }

    load();
  }, [dispatch, session, status]);

  if (status === "loading") {
    return <div className="main">Loading Rooted…</div>;
  }

  if (!session?.user) {
    return <div className="main">Please sign in to continue.</div>;
  }

  return (
    <div className={styles.canvas}>
      <ProfilePanel
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onDeleteTree={deleteEditor}
      />

      {(pendingConnection || editingEdgeId) && (
        <div className={styles.relationshipPicker}>
          <div className={styles.relationshipCard}>
            <h3>{editingEdgeId ? "Edit relationship" : "How are they related?"}</h3>
            <p style={{ margin: 0, color: "var(--sage)" }}>
              Choose a label for this connection.
            </p>
            <div className={styles.relationshipOptions}>
              {(Object.keys(RELATIONSHIP_LABELS) as RelationshipType[]).map(
                (key) => (
                  <button key={key} type="button" onClick={() => confirmRelationship(key)}>
                    {RELATIONSHIP_LABELS[key]}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => {
                setPendingConnection(null);
                setEditingEdgeId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
        onEdgeClick={(_, edge) => {
          setEditingEdgeId(edge.id);
          setPendingConnection(null);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        defaultEdgeOptions={{
          type: "relationship",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#1e3d32" },
          style: { stroke: "#3d5c4e", strokeWidth: 2 },
        }}
      >
        <Controls />
        <MiniMap pannable zoomable />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} color="#5c7a6a55" />

        <Panel position="top-left">
          <div className={styles.toolbar}>
            <span className={styles.brandChip}>Rooted</span>
            <button
              type="button"
              className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
              onClick={saveNodes}
            >
              Save
            </button>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setPaletteOpen((v) => !v)}
            >
              {paletteOpen ? "Hide people" : "Add people"}
            </button>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setMenuOpen(true)}
            >
              Account
            </button>
          </div>
          {paletteOpen && (
            <div className={styles.palette}>
              <h3 className={styles.paletteTitle}>Add a person</h3>
              <p className={styles.paletteHint}>
                Drag an avatar onto the canvas, then connect relatives and label the relationship.
              </p>
              <ul className={styles.paletteGrid}>{paletteItems}</ul>
            </div>
          )}
        </Panel>

        {nodes.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyCard}>
              <h2>Plant your first root</h2>
              <p>
                Drag someone from the palette onto the canvas to begin your family tree.
              </p>
            </div>
          </div>
        )}
      </ReactFlow>

      {toast && (
        <div className={`${styles.toast} ${styles[toast.status]}`}>
          <span>{toast.text}</span>
          <span className={styles["error-close"]} onClick={() => setToast(null)}>
            ×
          </span>
        </div>
      )}
    </div>
  );
}
