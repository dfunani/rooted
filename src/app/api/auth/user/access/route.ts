import { AuthenticationError } from "@/src/public/errors/auth";
import { AuthService } from "@/src/public/models/auth";
import { LoginUser, Credentials } from "@/src/public/models/data_classes/auth";
import User from "@/src/public/models/users";
import Security from "@/src/public/utils/cryptography";
import {
  getDatabaseConfig,
  generateServerResponses,
} from "@/src/public/utils/factories";

/** Retrieves Login Details. */
export async function POST(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const res = await request.json();

    const credentials = Credentials.safeParse(res);
    if (!credentials.success) {
      return generateServerResponses("Invalid User Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);

    const logins = await user.getUser(credentials.data);
    if (!logins) return generateServerResponses("User Does Not Exist", 404);

    const data = LoginUser.safeParse(logins);
    if (!data.success) {
      console.log(`Invalid User Response: ${data.error}`);
      return generateServerResponses("Invalid User Response.", 500);
    }

    const client = new Security();
    data.data.email = client.decrypt(data.data.email);
    data.data.password = "**********";

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`User Error: ${error}`);

    if (error instanceof AuthenticationError)
      return generateServerResponses("Unauthorized User Operation.", 403);

    return generateServerResponses("Internal Server Error.", 500);
  }
}
