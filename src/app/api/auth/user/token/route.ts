import { APIClient } from "@/src/public/models/api_client";
import { JWTResponse, TokenGeneration } from "@/src/public/models/data_classes/auth";
import User from "@/src/public/models/users";
import {
  getDatabaseConfig,
  generateServerResponses,
} from "@/src/public/utils/factories";

/** Create a new JWT token after verifying credentials. */
export async function POST(request: Request) {
  try {
    const response = await request.json();
    const credentials = TokenGeneration.safeParse(response);
    if (!credentials.success) {
      return generateServerResponses("Invalid User Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);
    const login = await user.getUser({
      email: credentials.data.email,
      password: credentials.data.password,
    });
    if (!login || login.id !== credentials.data.user_id) {
      return generateServerResponses("Invalid credentials.", 401);
    }

    const apiClient = new APIClient(db_url, db_name);
    const token = await apiClient.createJWT({
      user_id: credentials.data.user_id,
      email: credentials.data.email,
    });
    if (!token) {
      return generateServerResponses("Token Generation Failed.", 500);
    }

    const data = JWTResponse.safeParse(token);
    if (!data.success) {
      console.log(`JWT Error: ${data.error}`);
      return generateServerResponses("Token Generation Failed.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`JWT Error: ${error}`);
    return generateServerResponses("Internal Server Error.", 500);
  }
}
