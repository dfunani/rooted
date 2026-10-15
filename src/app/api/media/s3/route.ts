import { readS3 } from "@/src/public/utils/media";
import { getIdFromRequest } from "@/src/public/utils/factories";

export const runtime = "nodejs";

/** Proxy-read an S3 object when no public bucket URL is configured. */
export async function GET(request: Request) {
  try {
    const key = getIdFromRequest(request, "key");
    if (!key) {
      return new Response("Missing key", { status: 400 });
    }

    const file = await readS3(key);
    if (!file) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.log(`S3 Media Error: ${error}`);
    return new Response("Internal Server Error", { status: 500 });
  }
}
