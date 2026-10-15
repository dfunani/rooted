import { describe, expect, it } from "vitest";
import { RELATIONSHIP_LABELS } from "@/src/public/types/editor";
import { FetchEdge, FetchEditor } from "@/src/public/models/data_classes/editor";

describe("relationship labels", () => {
  it("includes core family relationships", () => {
    expect(RELATIONSHIP_LABELS.parent).toBe("Parent");
    expect(RELATIONSHIP_LABELS.spouse).toBe("Spouse");
  });
});

describe("editor schemas", () => {
  it("accepts relationship edges", () => {
    const edge = FetchEdge.safeParse({
      id: "e1",
      source: "a",
      target: "b",
      type: "relationship",
      label: "Parent",
      data: { relationship: "parent" },
    });
    expect(edge.success).toBe(true);
  });

  it("accepts a minimal editor payload", () => {
    const editor = FetchEditor.safeParse({
      user_id: "507f1f77bcf86cd799439011",
      nodes: [],
      edges: [],
    });
    expect(editor.success).toBe(true);
  });
});
