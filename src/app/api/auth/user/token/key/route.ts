import { AuthenticationError } from "@/src/public/errors/auth";
import { APIClient } from "@/src/public/models/api_client";
import { APIKeyResponse } from "@/src/public/models/data_classes/auth";
import { AuthService } from "@/src/public/models/auth";
import {
  generateServerResponses,
  getDatabaseConfig,
  getIdFromRequest,
} from "@/src/public/utils/factories";
import { z } from "zod";

const CreateKey = z.object({
  user_id: z.string(),
  expires: z.number().optional().default(60 * 24 * 30),
});

const DeleteKey = z.object({
  user_id: z.string(),
  token: z.string().min(16),
});

export async function GET(request: Request) {
  const id = getIdFromRequest(request);
  if (!id) {
    return generateServerResponses("Invalid User Request", 400);
  }

  try {
    await new AuthService(request).validateAuthMethod();

    const { db_url, db_name } = getDatabaseConfig();
    const apiClient = new APIClient(db_url, db_name);
    const tokens = await apiClient.getAllAPIKey(id);
    if (!tokens) {
      return generateServerResponses("No Tokens to Retrieve.", 404);
    }

    return generateServerResponses(tokens, 200);
  } catch (error) {
    console.log(`API Key Error: ${error}`);

    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized User Operations.", 403);
    }

    return generateServerResponses("Internal Server Error", 500);
  }
}

/** Create a new API Key (authenticated session). */
export async function POST(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const body = await request.json();
    const parsed = CreateKey.safeParse(body);
    if (!parsed.success) {
      return generateServerResponses("Invalid User Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const apiClient = new APIClient(db_url, db_name);
    const token = await apiClient.createAPIKey(
      parsed.data.user_id,
      parsed.data.expires
    );
    if (!token) {
      return generateServerResponses("Failed to Generate Token", 500);
    }

    return generateServerResponses(token, 201);
  } catch (error) {
    console.log(`API Key Error: ${error}`);
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized User Operations.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Deactivate/Delete APIKey */
export async function DELETE(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const res = await request.json();

    const credentials = DeleteKey.safeParse(res);
    if (!credentials.success) {
      return generateServerResponses("Invalid User Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const apiClient = new APIClient(db_url, db_name);

    const key = await apiClient.deleteAPIKey(
      credentials.data.user_id,
      credentials.data.token
    );
    if (!key) {
      return generateServerResponses("API Key Deletion Failed.", 500);
    }

    const data = APIKeyResponse.safeParse({
      ...key,
      createdAt:
        key.createdAt instanceof Date
          ? key.createdAt.toISOString()
          : key.createdAt,
      expiresAt:
        key.expiresAt instanceof Date
          ? key.expiresAt.toISOString()
          : key.expiresAt,
    });
    if (!data.success) {
      console.log(`API Key Error: ${data.error}`);
      return generateServerResponses("API Key Deletion Failed.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`API Key Error: ${error}`);

    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized API Key Operations.", 403);
    }

    return generateServerResponses("Internal Server Error.", 500);
  }
}
