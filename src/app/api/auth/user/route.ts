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
    const res = await request.json();
    const registration = RegisterUser.safeParse(res);
    if (!registration.success) {
      return generateServerResponses("Invalid User Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const user = new User(db_url, db_name);
    const registeredUser = await user.createUser(registration.data);
    if (!registeredUser) {
      return generateServerResponses("User Already Exists.", 409);
    }

    if (!registeredUser.emailVerified) {
      const tokens = new AuthTokenStore(db_url, db_name);
      const { token } = await tokens.create({
        kind: "email_verify",
        userId: registeredUser.id,
        email: registeredUser.plainEmail,
        ttlMs: 24 * 60 * 60 * 1000,
      });
      await sendVerificationEmail(registeredUser.plainEmail, token);
    }

    const data = FetchUser.safeParse({ id: registeredUser.id });
    if (!data.success) {
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(
      {
        ...data.data,
        emailVerificationRequired: !registeredUser.emailVerified,
      },
      201
    );
  } catch (error) {
    console.error(`User Error: ${error}`);
    return generateServerResponses("Internal Server Error.", 500);
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
