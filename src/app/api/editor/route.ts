import Editor from "@/src/public/models/editor";
import {
  generateServerResponses,
  getDatabaseConfig,
  getIdFromRequest,
} from "@/src/public/utils/factories";
import {
  DeleteEditor,
  FetchEditor,
} from "@/src/public/models/data_classes/editor";
import { AuthService } from "@/src/public/models/auth";
import { AuthenticationError } from "@/src/public/errors/auth";
import { getRequestUserId } from "@/src/public/utils/request-user";
import Security from "@/src/public/utils/cryptography";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/options";

async function resolveAccess(treeOwnerId: string, request: Request) {
  const requesterId = await getRequestUserId(request);
  const session = await getServerSession(authOptions);
  const emailHash = session?.user?.email
    ? new Security().hash(session.user.email.toLowerCase())
    : null;
  const { db_url, db_name } = getDatabaseConfig();
  const editor = new Editor(db_url, db_name);
  return editor.canAccess(treeOwnerId, requesterId, emailHash);
}

/** Get the Editor Nodes/Edges. */
export async function GET(request: Request) {
  const id = getIdFromRequest(request);
  if (!id) return generateServerResponses("Invalid Editor Request.", 400);

  try {
    await new AuthService(request).validateAuthMethod();
    const access = await resolveAccess(id, request);
    if (!access) {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);
    const newEditor = await editor.get(id);
    if (!newEditor) {
      return generateServerResponses("No Editor Data Found.", 404);
    }

    const data = FetchEditor.safeParse({
      user_id: newEditor.user_id,
      nodes: newEditor.nodes,
      edges: newEditor.edges,
      id: newEditor.id,
    });
    if (!data.success) {
      return generateServerResponses("Invalid Editor Data.", 500);
    }

    return generateServerResponses(
      { ...data.data, access, visibility: newEditor.visibility },
      200
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Save Editor Nodes/Edges. */
export async function POST(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const res = await request.json();

    const editorData = FetchEditor.safeParse(res);
    if (!editorData.success) {
      return generateServerResponses("Invalid Editor Request.", 400);
    }

    const access = await resolveAccess(editorData.data.user_id, request);
    if (access !== "owner" && access !== "edit") {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);

    const updatedEditor = await editor.update(editorData.data.user_id, {
      nodes: editorData.data.nodes,
      edges: editorData.data.edges,
    });
    if (!updatedEditor) {
      return generateServerResponses("Invalid Editor Request.", 400);
    }

    const data = DeleteEditor.safeParse(updatedEditor);
    if (!data.success) {
      return generateServerResponses("Invalid Editor Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Delete Editor Nodes/Edges (owner only). */
export async function DELETE(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const res = await request.json();

    const deleteEditor = DeleteEditor.safeParse(res);
    if (!deleteEditor.success) {
      return generateServerResponses("Invalid Editor Request.", 400);
    }

    const access = await resolveAccess(deleteEditor.data.user_id, request);
    if (access !== "owner") {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);

    const deletedEditor = await editor.delete(deleteEditor.data.user_id);
    if (!deletedEditor) {
      return generateServerResponses("Invalid Editor Request.", 400);
    }

    const data = DeleteEditor.safeParse(deletedEditor);
    if (!data.success) {
      return generateServerResponses("Invalid Editor Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }
    return generateServerResponses("Internal Server Error.", 500);
  }
}
