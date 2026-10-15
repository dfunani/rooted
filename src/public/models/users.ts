import * as crypto from "crypto";
import Security from "@/src/public/utils/cryptography";
import {
  CredentialsType,
  ProfileType,
  RegistrationType,
  UserType,
} from "@/src/public/types/user";
import { ObjectId } from "mongodb";
import Model from "@/src/public/models/model";
import { isDataUrl, storeDataUrl } from "@/src/public/utils/media";

export default class User extends Model {
  constructor(db_uri: string, db_name: string) {
    super(db_uri, db_name, "users");
  }

  async getUser(credentials: CredentialsType): Promise<UserType | null> {
    const collection = await this.getCollection();
    const client = new Security();
    const emailLookup = client.hash(credentials.email.toLowerCase());

    let response = await collection.findOne({ emailHash: emailLookup });

    if (!response) {
      // Legacy rows: email was AES with fixed IV
      const legacyEmail = (() => {
        try {
          const key = Buffer.from(process.env.CRYPTO_KEY ?? "", "hex");
          if (key.length !== 32) return null;
          const iv = Buffer.alloc(16, 0);
          const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
          const encrypted = Buffer.concat([
            cipher.update(credentials.email, "utf-8"),
            cipher.final(),
          ]);
          return encrypted.toString("hex");
        } catch {
          return null;
        }
      })();

      if (legacyEmail) {
        response = await collection.findOne({ email: legacyEmail });
        if (response) {
          await collection.updateOne(
            { _id: response._id },
            {
              $set: {
                email: client.encrypt(credentials.email),
                emailHash: emailLookup,
              },
            }
          );
        }
      }
    }

    if (!response) return null;

    const { ok, needsRehash } = await client.verifyPassword(
      credentials.password,
      response.password
    );
    if (!ok) return null;

    if (needsRehash) {
      const hashed = await client.hashPassword(credentials.password);
      await collection.updateOne(
        { _id: response._id },
        { $set: { password: hashed, updatedAt: new Date().toISOString() } }
      );
      response.password = hashed;
    }

    return {
      id: response._id.toString(),
      email: response.email,
      password: response.password,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  async getProfile(id: string): Promise<ProfileType | null> {
    const collection = await this.getCollection();

    const response = await collection.findOne({
      _id: ObjectId.createFromHexString(id),
    });

    if (!response) return null;

    return {
      name: response.name,
      surname: response.surname,
      dob: response.dob,
      city: response.city,
      country: response.country,
      image: response.image,
    };
  }

  async createUser(registration: RegistrationType) {
    const collection = await this.getCollection();
    const client = new Security();

    const emailHash = client.hash(registration.email.toLowerCase());
    const existing = await collection.findOne({ emailHash });
    if (existing) return null;

    // Legacy conflict check
    const legacyExisting = await collection.findOne({
      email: registration.email,
    });
    if (legacyExisting) return null;

    let image = registration.image as string | null;
    if (image && isDataUrl(image)) {
      const stored = await storeDataUrl(image);
      image = stored.url;
    }

    const password = await client.hashPassword(registration.password);
    const email = client.encrypt(registration.email);

    const now = new Date();
    const document = await collection.insertOne({
      ...registration,
      email,
      emailHash,
      password,
      image,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });

    return { id: document.insertedId.toString() };
  }

  async updateUser(id: string, profile: ProfileType) {
    const collection = await this.getCollection();

    const existing_user = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing_user) return null;

    let image = profile.image as string | null;
    if (image && isDataUrl(image)) {
      const stored = await storeDataUrl(image);
      image = stored.url;
    }

    const now = new Date();
    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...profile,
          image,
          updatedAt: now.toISOString(),
        },
      }
    );
    return { id };
  }

  async delete(id: string) {
    const collection = await this.getCollection();

    const existing_user = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing_user) return null;

    await collection.deleteOne({ _id: new ObjectId(id) });
    return { id };
  }
}
