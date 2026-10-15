import AuthTokenStore from "@/src/public/models/tokens";
import Editor from "@/src/public/models/editor";
import Security from "@/src/public/utils/cryptography";
import {
  generateServerResponses,
  getDatabaseConfig,
  getIdFromRequest,
} from "@/src/public/utils/factories";
import { getRequestUserId } from "@/src/public/utils/request-user";
import { AuthService } from "@/src/public/models/auth";
import { AuthenticationError } from "@/src/public/errors/auth";

/** Accept a collaborator invite (must be signed in). */
export async function POST(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const userId = await getRequestUserId(request);
    if (!userId) return generateServerResponses("Unauthorized.", 403);

    const body = await request.json().catch(() => ({}));
    const token =
      (body as { token?: string }).token ||
      getIdFromRequest(request, "token");
    if (!token) return generateServerResponses("Missing invite token.", 400);

    const { db_url, db_name } = getDatabaseConfig();
    const tokens = new AuthTokenStore(db_url, db_name);
    const record = await tokens.consume("share_invite", token);
    if (!record?.ownerId || !record.email) {
      return generateServerResponses("Invalid or expired invite.", 400);
    }

    const emailHash = new Security().hash(record.email.toLowerCase());
    const editor = new Editor(db_url, db_name);
    const accepted = await editor.acceptCollaborator(
      record.ownerId,
      emailHash,
      userId
    );

    return generateServerResponses(
      {
        accepted: Boolean(accepted),
        ownerId: record.ownerId,
        role: record.role ?? "view",
      },
      200
    );
  } catch (error) {
    console.error(error);
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}
