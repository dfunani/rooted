import crypto from "crypto";
import { ObjectId } from "mongodb";
import Model from "@/src/public/models/model";

export type AuthTokenKind = "email_verify" | "password_reset" | "share_invite";

export type AuthTokenRecord = {
  id: string;
  kind: AuthTokenKind;
  tokenHash: string;
  userId?: string;
  email?: string;
  ownerId?: string;
  role?: "view" | "edit";
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function mintToken() {
  return crypto.randomBytes(32).toString("hex");
}

export default class AuthTokenStore extends Model {
  constructor(db_uri: string, db_name: string) {
    super(db_uri, db_name, "auth_tokens");
  }

  async create(input: {
    kind: AuthTokenKind;
    userId?: string;
    email?: string;
    ownerId?: string;
    role?: "view" | "edit";
    ttlMs: number;
  }) {
    const collection = await this.getCollection();
    const token = mintToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + input.ttlMs);

    await collection.insertOne({
      kind: input.kind,
      tokenHash: hashToken(token),
      userId: input.userId,
      email: input.email?.toLowerCase(),
      ownerId: input.ownerId,
      role: input.role,
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdAt: now.toISOString(),
    });

    return { token, expiresAt: expiresAt.toISOString() };
  }

  async consume(kind: AuthTokenKind, token: string) {
    const collection = await this.getCollection();
    const tokenHash = hashToken(token);
    const doc = await collection.findOne({ kind, tokenHash, usedAt: null });
    if (!doc) return null;
    if (new Date(doc.expiresAt).getTime() < Date.now()) return null;

    await collection.updateOne(
      { _id: doc._id },
      { $set: { usedAt: new Date().toISOString() } }
    );

    return {
      id: doc._id.toString(),
      kind: doc.kind as AuthTokenKind,
      tokenHash: doc.tokenHash as string,
      userId: doc.userId as string | undefined,
      email: doc.email as string | undefined,
      ownerId: doc.ownerId as string | undefined,
      role: doc.role as "view" | "edit" | undefined,
      expiresAt: doc.expiresAt as string,
      usedAt: null,
      createdAt: doc.createdAt as string,
    } satisfies AuthTokenRecord;
  }

  async invalidateUserTokens(kind: AuthTokenKind, userId: string) {
    const collection = await this.getCollection();
    await collection.updateMany(
      { kind, userId, usedAt: null },
      { $set: { usedAt: new Date().toISOString() } }
    );
  }

  async getById(id: string) {
    const collection = await this.getCollection();
    if (!ObjectId.isValid(id)) return null;
    return collection.findOne({ _id: new ObjectId(id) });
  }
}
