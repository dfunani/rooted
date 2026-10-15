import { z } from "zod";
import Editor from "@/src/public/models/editor";
import AuthTokenStore from "@/src/public/models/tokens";
import User from "@/src/public/models/users";
import Security from "@/src/public/utils/cryptography";
import {
  generateServerResponses,
  getDatabaseConfig,
  getIdFromRequest,
} from "@/src/public/utils/factories";
import { getRequestUserId } from "@/src/public/utils/request-user";
import { AuthService } from "@/src/public/models/auth";
import { AuthenticationError } from "@/src/public/errors/auth";
import { sendShareInviteEmail } from "@/src/public/utils/email";
import {
  clientKey,
  rateLimit,
  rateLimitResponse,
} from "@/src/public/utils/rate-limit";

/** Public read of a tree via share link token. */
export async function GET(request: Request) {
  const token = getIdFromRequest(request, "token");
  if (!token) return generateServerResponses("Missing share token.", 400);

  try {
    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);
    const tree = await editor.getByShareToken(token);
    if (!tree) return generateServerResponses("Share link not found.", 404);

    const owner = await new User(db_url, db_name).getProfile(tree.user_id);

    return generateServerResponses(
      {
        nodes: tree.nodes,
        edges: tree.edges,
        ownerName: owner ? `${owner.name} ${owner.surname}` : "Someone",
        shareToken: token,
      },
      200
    );
  } catch (error) {
    console.error(error);
    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Manage share link / invites (authenticated owner). */
export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "share"), 20, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    await new AuthService(request).validateAuthMethod();
    const userId = await getRequestUserId(request);
    if (!userId) return generateServerResponses("Unauthorized.", 403);

    const body = z
      .object({
        action: z.enum([
          "enable_link",
          "disable_link",
          "invite",
          "list",
        ]),
        email: z.string().email().optional(),
        role: z.enum(["view", "edit"]).optional(),
      })
      .safeParse(await request.json());

    if (!body.success) {
      return generateServerResponses("Invalid share request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);
    const profile = await new User(db_url, db_name).getProfile(userId);
    const inviterName = profile
      ? `${profile.name} ${profile.surname}`.trim()
      : "A Rooted user";

    if (body.data.action === "list") {
      const tree = await editor.get(userId);
      return generateServerResponses(
        {
          visibility: tree?.visibility ?? "private",
          shareToken: tree?.shareToken ?? null,
          shareUrl: tree?.shareToken
            ? `${process.env.NEXTAUTH_URL?.replace(/\/$/, "")}/share/${tree.shareToken}`
            : null,
          collaborators: tree?.collaborators ?? [],
        },
        200
      );
    }

    if (body.data.action === "enable_link") {
      const token = await editor.enableShareLink(userId);
      return generateServerResponses(
        {
          shareToken: token,
          shareUrl: `${process.env.NEXTAUTH_URL?.replace(/\/$/, "")}/share/${token}`,
        },
        200
      );
    }

    if (body.data.action === "disable_link") {
      await editor.disableShareLink(userId);
      return generateServerResponses({ disabled: true }, 200);
    }

    if (body.data.action === "invite") {
      if (!body.data.email) {
        return generateServerResponses("Email required.", 400);
      }
      const role = body.data.role ?? "view";
      const emailHash = new Security().hash(body.data.email.toLowerCase());
      await editor.upsertCollaborator(userId, {
        email: body.data.email.toLowerCase(),
        emailHash,
        role,
        invitedAt: new Date().toISOString(),
        acceptedAt: null,
        userId: null,
      });

      const tokens = new AuthTokenStore(db_url, db_name);
      const { token } = await tokens.create({
        kind: "share_invite",
        ownerId: userId,
        email: body.data.email,
        role,
        ttlMs: 7 * 24 * 60 * 60 * 1000,
      });
      await sendShareInviteEmail(body.data.email, inviterName, token, role);
      return generateServerResponses({ invited: true }, 200);
    }

    return generateServerResponses("Unknown action.", 400);
  } catch (error) {
    console.error(error);
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}
