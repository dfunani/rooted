import { Db, MongoClient } from "mongodb";
import { DatabaseError } from "@/src/public/errors/database";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clients = new Map<string, Promise<MongoClient>>();

function getClientPromise(uri: string): Promise<MongoClient> {
  const connect = () => {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    return client.connect().catch((error) => {
      // Don't keep a rejected promise around — allow retries after Atlas/network blips
      if (process.env.NODE_ENV === "development") {
        global._mongoClientPromise = undefined;
      } else {
        clients.delete(uri);
      }
      throw error;
    });
  };

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = connect();
    }
    return global._mongoClientPromise;
  }

  let promise = clients.get(uri);
  if (!promise) {
    promise = connect();
    clients.set(uri, promise);
  }
  return promise;
}

export async function connection(uri: string, name: string): Promise<Db> {
  if (!uri || !name) {
    throw new DatabaseError("Database Client Error.");
  }

  try {
    const client = await getClientPromise(uri);
    return client.db(name);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw new DatabaseError("Database Connection Error.");
  }
}

export async function getMongoClient(uri: string): Promise<MongoClient> {
  return getClientPromise(uri);
}
