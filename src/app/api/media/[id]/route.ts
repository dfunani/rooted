import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/options";
import { readGridFS } from "@/src/public/utils/media";
import Editor from "@/src/public/models/editor";
import { getDatabaseConfig, getIdFromRequest } from "@/src/public/utils/factories";
import Security from "@/src/public/utils/cryptography";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function canViewMedia(ownerId: string | null, request: Request) {
  // Legacy files without owner remain readable to authenticated users only
  const session = await getServerSession(authOptions);
  if (!ownerId) return Boolean(session?.user?.id);

  if (session?.user?.id && session.user.id === ownerId) return true;

  const share = getIdFromRequest(request, "share");
  if (share) {
    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);
    const tree = await editor.getByShareToken(share);
    if (tree && tree.user_id === ownerId) return true;
  }

  if (session?.user?.id || session?.user?.email) {
    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);
    const emailHash = session.user.email
      ? new Security().hash(session.user.email.toLowerCase())
      : null;
    const access = await editor.canAccess(
      ownerId,
      session.user.id ?? null,
      emailHash
    );
    if (access) return true;
  }

  return false;
}

/** Serve a GridFS-stored image by id (owner, collaborator, or share link). */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const file = await readGridFS(id);
    if (!file) {
      return new Response("Not found", { status: 404 });
    }

    const allowed = await canViewMedia(file.ownerId, request);
    if (!allowed) {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(`Media GET Error: ${error}`);
    return new Response("Internal Server Error", { status: 500 });
  }
}
