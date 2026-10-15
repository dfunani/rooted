import { z } from "zod";
import AuthTokenStore from "@/src/public/models/tokens";
import User from "@/src/public/models/users";
import {
  generateServerResponses,
  getDatabaseConfig,
} from "@/src/public/utils/factories";
import {
  clientKey,
  rateLimit,
  rateLimitResponse,
} from "@/src/public/utils/rate-limit";
import { sendPasswordResetEmail } from "@/src/public/utils/email";

const passwordRegex =
  /^(?=.*\d)(?=.*[!@#$%^&*()_+-])[A-Za-z\d!@#$%^&*()_+-]{8,}$/;

/** Request password reset email. */
export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "password-reset"), 5, 15 * 60 * 1000);
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

    if (row) {
      const tokens = new AuthTokenStore(db_url, db_name);
      await tokens.invalidateUserTokens("password_reset", row._id.toString());
      const { token } = await tokens.create({
        kind: "password_reset",
        userId: row._id.toString(),
        email: body.data.email,
        ttlMs: 60 * 60 * 1000,
      });
      await sendPasswordResetEmail(body.data.email, token);
    }

    return generateServerResponses(
      { sent: true, message: "If that account exists, a reset link was sent." },
      200
    );
  } catch (error) {
    console.error(error);
    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Complete password reset with token. */
export async function PUT(request: Request) {
  const limited = rateLimit(clientKey(request, "password-reset-put"), 10, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const body = z
      .object({
        token: z.string().min(16),
        password: z.string().regex(passwordRegex, "Invalid Password."),
      })
      .safeParse(await request.json());
    if (!body.success) {
      return generateServerResponses(
        "Invalid reset request. Password needs 8+ chars, a number, and a symbol.",
        400
      );
    }

    const { db_url, db_name } = getDatabaseConfig();
    const tokens = new AuthTokenStore(db_url, db_name);
    const record = await tokens.consume("password_reset", body.data.token);
    if (!record?.userId) {
      return generateServerResponses("Invalid or expired reset link.", 400);
    }

    const user = new User(db_url, db_name);
    await user.updatePassword(record.userId, body.data.password);
    return generateServerResponses({ reset: true }, 200);
  } catch (error) {
    console.error(error);
    return generateServerResponses("Internal Server Error.", 500);
  }
}
