import { ProfileType } from "@/src/public/types/user";

export type RelationshipType =
  | "parent"
  | "child"
  | "spouse"
  | "sibling"
  | "partner"
  | "related";

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  parent: "Parent",
  child: "Child",
  spouse: "Spouse",
  sibling: "Sibling",
  partner: "Partner",
  related: "Related",
};

export type EditorType = {
  id: string;
  user_id: string;
} & EditorStateType;

export type EditorStateType = {
  nodes: NodeType[] | null;
  edges: EdgeType[] | null;
};

export type PositionType = {
  x: number;
  y: number;
};

export type NodeType = {
  id: string;
  position: PositionType;
  type: string;
  data: NodeDataType;
};

export type EdgeType = {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  type?: string;
  label?: string;
  data?: {
    relationship: RelationshipType;
  };
};

export type NodeDataType = ProfileType & { label: string };
