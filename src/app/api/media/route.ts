import {
  generateServerResponses,
  getDatabaseConfig,
} from "@/src/public/utils/factories";
import { AuthService } from "@/src/public/models/auth";
import { AuthenticationError } from "@/src/public/errors/auth";
import { storeMedia } from "@/src/public/utils/media";
import { getRequestUserId } from "@/src/public/utils/request-user";
import {
  clientKey,
  rateLimit,
  rateLimitResponse,
} from "@/src/public/utils/rate-limit";

export const runtime = "nodejs";

/** Upload an image (multipart form field "file"). */
export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request, "media-upload"), 30, 15 * 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  try {
    await new AuthService(request).validateAuthMethod();
    const ownerId = await getRequestUserId(request);
    if (!ownerId) {
      return generateServerResponses("Unauthorized Media Operations.", 403);
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return generateServerResponses("No file uploaded.", 400);
    }

    if (!file.type.startsWith("image/")) {
      return generateServerResponses("Only image uploads are allowed.", 400);
    }

    if (file.size > 8 * 1024 * 1024) {
      return generateServerResponses("Image must be under 8MB.", 400);
    }

    getDatabaseConfig();

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeMedia(
      buffer,
      file.type,
      file.name || "upload",
      ownerId
    );

    return generateServerResponses(stored, 201);
  } catch (error) {
    console.error(`Media Error: ${error}`);
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized Media Operations.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}
