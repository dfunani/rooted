import jwt from "jsonwebtoken";
import Model from "@/src/public/models/model";
import Security from "@/src/public/utils/cryptography";
import { JWTPayload } from "@/src/public/models/data_classes/auth";
import User from "@/src/public/models/users";
import { AuthenticationError } from "@/src/public/errors/auth";
import { JWTPayloadType } from "@/src/public/types/user";
import { WithId } from "mongodb";

export class APIClient extends Model {
  secret: string;

  constructor(db_uri: string, db_name: string) {
    super(db_uri, db_name, "tokens");
    this.secret = process.env.JWT_SECRET ?? "secret";
  }

  async createAPIKey(user_id: string, expires: number = 30) {
    const collection = await this.getCollection();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expires * 60 * 1000);
    const security = new Security();
    const active = true;
    const apiKey = security.hash(
      JSON.stringify({
        user_id: user_id,
        insertedAt: now,
        expiresAt: expiresAt,
      })
    );

    const doc = {
      user_id,
      apiKey,
      active,
      createdAt: now,
      expiresAt,
    };
    const response = await collection.insertOne({ ...doc });
    if (!response) return null;

    return {
      user_id,
      apiKey,
      active,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  async createJWT(credentials: Pick<JWTPayloadType, "user_id" | "email">) {
    const now = new Date();
    const expires = 30 * 60;
    const exp = now.getTime() + expires * 1000;
    const expiresAt = new Date(exp);

    const payload = {
      sub: process.env.DB_NAME ?? this.db_name,
      user_id: credentials.user_id,
      email: credentials.email,
      iat: now.getTime(),
      exp: exp,
    };

    const token = jwt.sign(payload, this.secret);
    if (!token) return null;

    return {
      token,
      expires,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    };
  }

  async validateAPIKey(key: string) {
    const collection = await this.getCollection();

    const response = await collection.findOne({
      apiKey: key,
    });

    if (!response)
      throw new AuthenticationError(
        "Invalid User API response. API key Doesn't Exist."
      );

    if (!response.active)
      throw new AuthenticationError("Invalid User API Key. API key Inactive.");

    if (!response.expiresAt || response.expiresAt < new Date())
      throw new AuthenticationError("Invalid User API Key. API key Expired.");
  }

  async validateJWT(token: string) {
    const bearer = token?.startsWith("Bearer ")
      ? token.split(" ")[1]
      : token;
    const verify = jwt.verify(bearer, this.secret) as JWTPayloadType;
    const now = new Date().getTime();
    const user = new User(this.db_uri, this.db_name);

    if (
      !verify ||
      verify.exp < now ||
      verify.iat > now ||
      verify.sub !== process.env.DB_NAME
    )
      throw new AuthenticationError("Invalid User Token. Token Expired.");

    const validToken = JWTPayload.safeParse(verify);
    if (!validToken.success) {
      throw new AuthenticationError("Invalid User Token. Invalid Payload.");
    }

    const resultProfile = await user.getProfile(validToken.data.user_id);
    if (!resultProfile)
      throw new AuthenticationError("Invalid User Token. Invalid Profile.");
  }

  async deleteAPIKey(user_id: string, key: string | undefined) {
    const collection = await this.getCollection();

    const response = await collection.findOne({
      user_id: user_id,
      apiKey: key,
    });
    if (!response) return null;

    const createdAt = response.createdAt.toISOString();
    const expiresAt = response.expiresAt.toISOString();

    const deleted = await collection.updateOne(
      { user_id: user_id, apiKey: key },
      { $set: { active: false } }
    );
    if (!deleted) return null;

    return {
      user_id: user_id,
      apiKey: key,
      active: false,
      createdAt: createdAt,
      expiresAt: expiresAt,
    };
  }

  async getAllAPIKey(user_id: string) {
    const collection = await this.getCollection();

    const response = await collection
      .find({
        user_id: user_id,
      })
      .toArray();
    if (!response) return null;

    return response.map((data: WithId<Record<string, unknown>>) => {
      const createdAt =
        data.createdAt instanceof Date
          ? data.createdAt.toISOString()
          : String(data.createdAt ?? "");
      const expiresAt =
        data.expiresAt instanceof Date
          ? data.expiresAt.toISOString()
          : String(data.expiresAt ?? "");
      return {
        user_id: data.user_id,
        apiKey: data.apiKey,
        active: data.active,
        createdAt,
        expiresAt,
      };
    });
  }
}
