import User from "@/src/public/models/users";
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
      console.log(`User Error: ${data.error}`);
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`User Error: ${error}`);

    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized User Operations.", 403);
    }
    return generateServerResponses("Internal Server Error", 500);
  }
}

/** Create/Register a New User (public). */
export async function POST(request: Request) {
  try {
    const res = await request.json();

    const registration = RegisterUser.safeParse(res);
    if (!registration.success) {
      console.log(`Invalid User Request: ${registration.error}`);
      return generateServerResponses("Invalid User Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();

    const user = new User(db_url, db_name);
    const registeredUser = await user.createUser(registration.data);
    if (!registeredUser) {
      return generateServerResponses("User Already Exists.", 409);
    }

    const data = FetchUser.safeParse(registeredUser);
    if (!data.success) {
      console.log(`Invalid User Response: ${data.error}`);
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(data.data, 201);
  } catch (error) {
    console.log(`User Error: ${error}`);
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
      console.log(`Invalid User Request: ${patchDetails.error}`);
      return generateServerResponses("Invalid User Update Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const user = await new User(db_url, db_name);

    const updatedUser = await user.updateUser(
      patchDetails.data.id,
      patchDetails.data
    );

    if (!updatedUser) {
      return generateServerResponses("Invalid User Request.", 500);
    }

    const data = FetchUser.safeParse(updatedUser);
    if (!data.success) {
      console.log(`Invalid User Response: ${data.error}`);
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`User Error: ${error}`);

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
      console.log(`Invalid User Request: ${deleteUser.error}`);
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
      console.log(`User Error: ${data.error}`);
      return generateServerResponses("Invalid User Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`User Error: ${error}`);

    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized User Operations.", 403);
    }

    return generateServerResponses("Internal Server Error.", 500);
  }
}
