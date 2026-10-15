import AuthTokenStore from "@/src/public/models/tokens";
import User from "@/src/public/models/users";
import {
  generateServerResponses,
  getDatabaseConfig,
  getIdFromRequest,
} from "@/src/public/utils/factories";
import {
  clientKey,
  rateLimit,
  rateLimitResponse,
} from "@/src/public/utils/rate-limit";
import { sendVerificationEmail } from "@/src/public/utils/email";
import { z } from "zod";

/** Confirm email verification token. */
export async function GET(request: Request) {
  const limited = rateLimit(clientKey(request, "verify"), 30, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const token = getIdFromRequest(request, "token");
  if (!token) return generateServerResponses("Missing token.", 400);

  try {
    const { db_url, db_name } = getDatabaseConfig();
    const tokens = new AuthTokenStore(db_url, db_name);
    const record = await tokens.consume("email_verify", token);
    if (!record?.userId) {
      return generateServerResponses("Invalid or expired verification link.", 400);
    }

    const user = new User(db_url, db_name);
    await user.markEmailVerified(record.userId);
    return generateServerResponses({ verified: true }, 200);
  } catch (error) {
    console.error(error);
    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Resend verification email. */
export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "verify-resend"), 5, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = z
      .object({ email: z.string().email() })
      .safeParse(await request.json());
    if (!body.success) {
      return generateServerResponses("Invalid email.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);
    const row = await user.findByEmailHash(body.data.email);

    // Always return success to avoid email enumeration
    if (!row || row.emailVerified) {
      return generateServerResponses({ sent: true }, 200);
    }

    const tokens = new AuthTokenStore(db_url, db_name);
    await tokens.invalidateUserTokens("email_verify", row._id.toString());
    const { token } = await tokens.create({
      kind: "email_verify",
      userId: row._id.toString(),
      email: body.data.email,
      ttlMs: 24 * 60 * 60 * 1000,
    });
    await sendVerificationEmail(body.data.email, token);
    return generateServerResponses({ sent: true }, 200);
  } catch (error) {
    console.error(error);
    return generateServerResponses("Internal Server Error.", 500);
  }
}
