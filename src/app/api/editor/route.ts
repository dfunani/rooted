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

/** Get the Editor Nodes/Edges. */
export async function GET(request: Request) {
  const id = getIdFromRequest(request);
  if (!id) return generateServerResponses("Invalid Editor Request.", 400);

  try {
    await new AuthService(request).validateAuthMethod();
    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);

    const newEditor = await editor.get(id);
    if (!newEditor) {
      return generateServerResponses("No Editor Data Found.", 404);
    }

    const data = FetchEditor.safeParse(newEditor);
    if (!data.success) {
      console.log(`Editor Error: ${data.error}`);
      return generateServerResponses("Invalid Editor Data.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`Editor Error: ${error}`);

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
      console.log(`Editor Error: ${editorData.error}`);
      return generateServerResponses("Invalid Editor Request.", 400);
    }

    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);

    const updatedEditor = await editor.update(
      editorData.data.user_id,
      editorData.data
    );
    if (!updatedEditor) {
      return generateServerResponses("Invalid Editor Request.", 400);
    }

    const data = DeleteEditor.safeParse(updatedEditor);
    if (!data.success) {
      console.log(`Invalid Editor Respone: ${data.error}`);
      return generateServerResponses("Invalid Editor Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`Editor Error: ${error}`);

    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }

    return generateServerResponses("Internal Server Error.", 500);
  }
}

/** Delete Editor Nodes/Edges. */
export async function DELETE(request: Request) {
  try {
    await new AuthService(request).validateAuthMethod();
    const res = await request.json();

    const deleteEditor = DeleteEditor.safeParse(res);
    if (!deleteEditor.success) {
      console.log(`Editor Error: ${deleteEditor.error}`);
      return generateServerResponses("Invalid Editor Request.", 400);
    }
    const { db_url, db_name } = getDatabaseConfig();
    const editor = new Editor(db_url, db_name);

    const deletedEditor = await editor.delete(deleteEditor.data.user_id);
    if (!deletedEditor) {
      return generateServerResponses("Invalid Editor Request.", 400);
    }

    const data = DeleteEditor.safeParse(deletedEditor);
    if (!data.success) {
      console.log(`Invalid Editor Response: ${data.error}`);
      return generateServerResponses("Invalid Editor Response.", 500);
    }

    return generateServerResponses(data.data, 200);
  } catch (error) {
    console.log(`Editor Error: ${error}`);

    if (error instanceof AuthenticationError) {
      return generateServerResponses("Unauthorized Editor Operations.", 403);
    }

    return generateServerResponses("Internal Server Error.", 500);
  }
}
