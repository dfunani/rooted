import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/options";
import { AuthService } from "@/src/public/models/auth";
import { APIClient } from "@/src/public/models/api_client";
import { getDatabaseConfig } from "@/src/public/utils/factories";
import jwt from "jsonwebtoken";

export async function getRequestUserId(request: Request): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const apiKey = request.headers.get("x-api-key");
  const authorization = request.headers.get("authorization");

  if (!apiKey && !authorization) return null;

  try {
    await new AuthService(request).validateAuthMethod();
  } catch {
    return null;
  }

  if (authorization) {
    try {
      const bearer = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : authorization;
      const payload = jwt.verify(
        bearer,
        process.env.JWT_SECRET ?? "secret"
      ) as { user_id?: string };
      return payload.user_id ?? null;
    } catch {
      return null;
    }
  }

  if (apiKey) {
    const { db_url, db_name } = getDatabaseConfig();
    const client = new APIClient(db_url, db_name);
    const collection = await client.getCollection();
    const row = await collection.findOne({ apiKey, active: true });
    return row?.user_id ? String(row.user_id) : null;
  }

  return null;
}
