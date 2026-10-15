"use client";

import { createContext, useContext } from "react";
import { EdgeType, NodeDataType, NodeType } from "@/src/public/types/editor";

type EditorActions = {
  readOnly?: boolean;
  getNodes: () => NodeType[];
  getEdges: () => EdgeType[];
  setGraph: (nodes: NodeType[], edges: EdgeType[]) => void;
  updateNodeData: (id: string, data: Partial<NodeDataType>) => void;
  removeNode: (id: string) => void;
};

const EditorContext = createContext<EditorActions | null>(null);

export function EditorProvider({
  value,
  children,
}: {
  value: EditorActions;
  children: React.ReactNode;
}) {
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

export function useEditorActions() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorActions must be used within EditorProvider");
  }
  return ctx;
}
