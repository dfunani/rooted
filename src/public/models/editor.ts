import Model from "@/src/public/models/model";
import { EditorType } from "../types/editor";

export default class Editor extends Model {
  constructor(db_uri: string, db_name: string) {
    super(db_uri, db_name, "nodes");
  }

  async get(user_id: string): Promise<EditorType | null> {
    const collection = await this.getCollection();
    const response = await collection.findOne({ user_id: user_id });
    if (!response) return null;

    return {
      id: response._id.toString(),
      user_id: response.user_id,
      edges: response.edges,
      nodes: response.nodes,
    };
  }

  async update(user_id: string, data: Omit<EditorType, "id">) {
    const collection = await this.getCollection();
    await collection.updateOne(
      { user_id: user_id },
      { $set: data },
      { upsert: true }
    );
    return { user_id: user_id };
  }

  async delete(user_id: string) {
    const collection = await this.getCollection();
    const response = await collection.findOne({ user_id: user_id });
    if (!response) return null;

    await collection.deleteOne({ user_id: user_id });
    return { user_id: user_id };
  }
}
