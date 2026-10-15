import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { DatabaseError } from "@/src/public/errors/database";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function normalizeUri(uri: string): string {
  let value = uri.trim().replace(/^["']|["']$/g, "");

  // Ensure SRV URLs carry TLS-friendly query defaults used by Atlas + Vercel
  if (value.startsWith("mongodb+srv://")) {
    const hasQuery = value.includes("?");
    const params = new URLSearchParams(hasQuery ? value.split("?")[1] : "");
    if (!params.has("retryWrites")) params.set("retryWrites", "true");
    if (!params.has("w")) params.set("w", "majority");
    const base = hasQuery ? value.split("?")[0] : value;
    value = `${base}?${params.toString()}`;
  }

  return value;
}

function getClientPromise(uri: string): Promise<MongoClient> {
  const normalized = normalizeUri(uri);

  const connect = () => {
    const options: MongoClientOptions = {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      // Vercel/Atlas: prefer IPv4 — IPv6 paths often fail with TLS alert 80
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
    };

    const client = new MongoClient(normalized, options);
    return client.connect().catch((error) => {
      global._mongoClientPromise = undefined;
      throw error;
    });
  };

  // Reuse across warm serverless invocations (dev + Vercel)
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect();
  }
  return global._mongoClientPromise;
}

export async function connection(uri: string, name: string): Promise<Db> {
  if (!uri || !name) {
    throw new DatabaseError("Database Client Error.");
  }

  try {
    const client = await getClientPromise(uri);
    return client.db(name.trim().replace(/^["']|["']$/g, ""));
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw new DatabaseError("Database Connection Error.");
  }
}

export async function getMongoClient(uri: string): Promise<MongoClient> {
  return getClientPromise(uri);
}
