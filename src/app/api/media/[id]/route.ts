import { readGridFS } from "@/src/public/utils/media";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** Serve a GridFS-stored image by id. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const file = await readGridFS(id);
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
    console.log(`Media GET Error: ${error}`);
    return new Response("Internal Server Error", { status: 500 });
  }
}
