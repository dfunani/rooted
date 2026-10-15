import User from "@/src/public/models/users";
import AuthTokenStore from "@/src/public/models/tokens";
import {
  UserProfile,
  PatchDetails,
  RegisterUser,
  FetchUser,
} from "@/src/public/models/data_classes/auth";
import {
  getDatabaseConfig,
  generateServerResponses,
  getIdFromRequest,
} from "@/src/public/utils/factories";
import { AuthenticationError } from "@/src/public/errors/auth";
import { AuthService } from "@/src/public/models/auth";
import {
  clientKey,
  rateLimit,
  rateLimitResponse,
} from "@/src/public/utils/rate-limit";
import { sendVerificationEmail } from "@/src/public/utils/email";

/** Get User profile. */
export async function GET(request: Request) {
  const id = getIdFromRequest(request);
  if (!id) return generateServerResponses("Invalid User Request.", 400);

  try {
    await new AuthService(request).validateAuthMethod();
    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);

    const profile = await user.getProfile(id);
    if (!profile)
      return generateServerResponses("User Profile Does Not Exist", 404);

    const data = UserProfile.safeParse(profile);
    if (!data.success) {
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized User Operations.", 403);
    }
    return generateServerResponses("Internal Server Error", 500);
  }
}

/** Create/Register a New User (public, rate-limited). */
export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "register"), 5, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    const cryptoKey = process.env.CRYPTO_KEY ?? "";
    if (Buffer.from(cryptoKey, "hex").length !== 32) {
      console.error("CRYPTO_KEY must be 64 hex characters (32 bytes).");
      return generateServerResponses(
        "Server misconfigured (CRYPTO_KEY). Check Vercel env vars.",
        503
      );
    }

    const res = await request.json();
    const registration = RegisterUser.safeParse(res);
    if (!registration.success) {
      console.error("Register validation:", registration.error.flatten());
      return generateServerResponses(
        "Invalid registration. Check email, password (8+ chars, number, symbol), and all profile fields.",
        400
      );
    }

    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);
    const registeredUser = await user.createUser(registration.data);
    if (!registeredUser) {
      return generateServerResponses("User Already Exists.", 409);
    }

    let emailQueued = true;
    let verifyUrl: string | null = null;
    let emailError: string | null = null;

    if (!registeredUser.emailVerified) {
      try {
        const tokens = new AuthTokenStore(db_url, db_name);
        const { token } = await tokens.create({
          kind: "email_verify",
          userId: registeredUser.id,
          email: registeredUser.plainEmail,
          ttlMs: 24 * 60 * 60 * 1000,
        });
        const sent = await sendVerificationEmail(
          registeredUser.plainEmail,
          token
        );
        verifyUrl = sent.url;
        emailQueued = sent.queued;
        if (!sent.queued) {
          emailError = sent.error ?? "Email provider rejected the message";
          console.error("Verification email failed:", emailError);
          // Always log the link so ops can recover accounts when Resend is misconfigured
          console.info(`[rooted:verify-fallback] ${verifyUrl}`);
        }
      } catch (error) {
        emailQueued = false;
        emailError =
          error instanceof Error ? error.message : "Email send failed";
        console.error("Verification email exception:", error);
      }
    }

    const data = FetchUser.safeParse({ id: registeredUser.id });
    if (!data.success) {
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(
      {
        ...data.data,
        emailVerificationRequired: !registeredUser.emailVerified,
        emailQueued,
        emailError,
        // Fallback link when inbox delivery fails (e.g. invalid RESEND_API_KEY)
        verifyUrl: !emailQueued ? verifyUrl : null,
      },
      201
    );
  } catch (error) {
    console.error(`User Error: ${error}`);
    const message =
      error instanceof Error ? error.message : "Internal Server Error.";
    if (message.includes("Database") || message.includes("Invalid Application")) {
      return generateServerResponses(
        "Database unavailable. Check DB_URL / DB_NAME and Atlas network access.",
        503
      );
    }
    return generateServerResponses(
      "Registration failed. Please try again in a moment.",
      500
    );
  }
}

/** Update User profiles. */
export async function PATCH(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const res = await request.json();

    const patchDetails = PatchDetails.safeParse(res);
    if (!patchDetails.success) {
      return generateServerResponses("Invalid User Update Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);

    const updatedUser = await user.updateUser(
      patchDetails.data.id,
      patchDetails.data
    );

    if (!updatedUser) {
      return generateServerResponses("Invalid User Request.", 500);
    }

    const data = FetchUser.safeParse(updatedUser);
    if (!data.success) {
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized User Operations.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Delete Existing User. */
export async function DELETE(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const res = await request.json();

    const deleteUser = FetchUser.safeParse(res);
    if (!deleteUser.success) {
      return generateServerResponses("Invalid User Request.", 500);
    }
    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);

    const deletedUser = await user.delete(deleteUser.data.id);
    if (!deletedUser) {
      return generateServerResponses("Invalid User Request.", 500);
    }

    const data = FetchUser.safeParse(deletedUser);
    if (!data.success) {
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized User Operations.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}
