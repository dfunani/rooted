import crypto from "crypto";
import Model from "@/src/public/models/model";
import { EditorType } from "../types/editor";

export type TreeVisibility = "private" | "link";
export type CollaboratorRole = "view" | "edit";

export type Collaborator = {
  email: string;
  emailHash: string;
  userId?: string | null;
  role: CollaboratorRole;
  invitedAt: string;
  acceptedAt?: string | null;
};

export type EditorDocument = EditorType & {
  visibility: TreeVisibility;
  shareToken: string | null;
  collaborators: Collaborator[];
};

export default class Editor extends Model {
  constructor(db_uri: string, db_name: string) {
    super(db_uri, db_name, "nodes");
  }

  async get(user_id: string): Promise<EditorDocument | null> {
    const collection = await this.getCollection();
    const response = await collection.findOne({ user_id: user_id });
    if (!response) return null;

    return {
      id: response._id.toString(),
      user_id: response.user_id,
      edges: response.edges ?? [],
      nodes: response.nodes ?? [],
      visibility: (response.visibility as TreeVisibility) ?? "private",
      shareToken: response.shareToken ?? null,
      collaborators: response.collaborators ?? [],
    };
  }

  async getByShareToken(token: string): Promise<EditorDocument | null> {
    const collection = await this.getCollection();
    const response = await collection.findOne({
      shareToken: token,
      visibility: "link",
    });
    if (!response) return null;
    return {
      id: response._id.toString(),
      user_id: response.user_id,
      edges: response.edges ?? [],
      nodes: response.nodes ?? [],
      visibility: "link",
      shareToken: response.shareToken,
      collaborators: response.collaborators ?? [],
    };
  }

  async canAccess(
    treeOwnerId: string,
    requesterId: string | null,
    requesterEmailHash?: string | null
  ): Promise<"owner" | "edit" | "view" | null> {
    if (requesterId && requesterId === treeOwnerId) return "owner";
    const doc = await this.get(treeOwnerId);
    if (!doc) return null;

    if (requesterId) {
      const byUser = doc.collaborators.find(
        (c) => c.userId === requesterId && c.acceptedAt
      );
      if (byUser) return byUser.role;
    }

    if (requesterEmailHash) {
      const byEmail = doc.collaborators.find(
        (c) => c.emailHash === requesterEmailHash && c.acceptedAt
      );
      if (byEmail) return byEmail.role;
    }

    return null;
  }

  async update(
    user_id: string,
    data: Partial<
      Omit<EditorDocument, "id" | "user_id"> & { user_id?: string }
    >
  ) {
    const collection = await this.getCollection();
    await collection.updateOne(
      { user_id: user_id },
      {
        $set: {
          ...data,
          user_id,
        },
        $setOnInsert: {
          visibility: "private",
          shareToken: null,
          collaborators: [],
        },
      },
      { upsert: true }
    );
    return { user_id: user_id };
  }

  async enableShareLink(user_id: string) {
    const token = crypto.randomBytes(24).toString("hex");
    await this.update(user_id, {
      visibility: "link",
      shareToken: token,
    });
    return token;
  }

  async disableShareLink(user_id: string) {
    await this.update(user_id, {
      visibility: "private",
      shareToken: null,
    });
  }

  async upsertCollaborator(
    ownerId: string,
    collaborator: Collaborator
  ) {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ user_id: ownerId });
    const list: Collaborator[] = doc?.collaborators ?? [];
    const next = list.filter((c) => c.emailHash !== collaborator.emailHash);
    next.push(collaborator);
    await collection.updateOne(
      { user_id: ownerId },
      {
        $set: { collaborators: next, user_id: ownerId },
        $setOnInsert: {
          nodes: [],
          edges: [],
          visibility: "private",
          shareToken: null,
        },
      },
      { upsert: true }
    );
  }

  async acceptCollaborator(
    ownerId: string,
    emailHash: string,
    userId: string
  ) {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ user_id: ownerId });
    if (!doc) return null;
    const collaborators: Collaborator[] = (doc.collaborators ?? []).map(
      (c: Collaborator) =>
        c.emailHash === emailHash
          ? {
              ...c,
              userId,
              acceptedAt: new Date().toISOString(),
            }
          : c
    );
    await collection.updateOne(
      { user_id: ownerId },
      { $set: { collaborators } }
    );
    return collaborators.find((c) => c.emailHash === emailHash) ?? null;
  }

  async delete(user_id: string) {
    const collection = await this.getCollection();
    const response = await collection.findOne({ user_id: user_id });
    if (!response) return null;
    await collection.deleteOne({ user_id: user_id });
    return { user_id: user_id };
  }
}
