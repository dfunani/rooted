import { GridFSBucket, ObjectId } from "mongodb";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { v4 as uuid4 } from "uuid";
import { getMongoClient } from "@/src/public/utils/database";
import { getDatabaseConfig } from "@/src/public/utils/factories";

export type StoredMedia = {
  url: string;
  key: string;
  provider: "gridfs" | "s3";
  contentType: string;
  ownerId?: string;
};

function s3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

async function compressImage(
  buffer: Buffer,
  contentType: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const isImage = contentType.startsWith("image/");
  if (!isImage) return { buffer, contentType };

  const compressed = await sharp(buffer)
    .rotate()
    .resize(512, 512, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return { buffer: compressed, contentType: "image/webp" };
}

async function uploadGridFS(
  buffer: Buffer,
  contentType: string,
  filename: string,
  ownerId?: string
): Promise<StoredMedia> {
  const { db_url, db_name } = getDatabaseConfig();
  const client = await getMongoClient(db_url);
  const bucket = new GridFSBucket(client.db(db_name), { bucketName: "media" });

  const id = new ObjectId();
  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openUploadStreamWithId(id, filename, {
      contentType,
      metadata: {
        uploadedAt: new Date().toISOString(),
        ownerId: ownerId ?? null,
      },
    });
    stream.on("finish", () => resolve());
    stream.on("error", reject);
    stream.end(buffer);
  });

  const key = id.toHexString();
  return {
    key,
    provider: "gridfs",
    contentType,
    ownerId,
    url: `/api/media/${key}`,
  };
}

async function uploadS3(
  buffer: Buffer,
  contentType: string,
  filename: string,
  ownerId?: string
): Promise<StoredMedia> {
  const bucket = process.env.S3_BUCKET!;
  const key = `rooted/${ownerId ? `${ownerId}/` : ""}${uuid4()}-${filename}`;
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: ownerId ? { ownerid: ownerId } : undefined,
    })
  );

  const publicBase = process.env.S3_PUBLIC_URL;
  const url = publicBase
    ? `${publicBase.replace(/\/$/, "")}/${key}`
    : `/api/media/s3?key=${encodeURIComponent(key)}`;

  return { key, provider: "s3", contentType, ownerId, url };
}

export async function storeMedia(
  input: Buffer,
  contentType: string,
  filename = "upload.webp",
  ownerId?: string
): Promise<StoredMedia> {
  const { buffer, contentType: type } = await compressImage(input, contentType);
  if (s3Configured()) {
    return uploadS3(
      buffer,
      type,
      filename.replace(/\.[^.]+$/, ".webp"),
      ownerId
    );
  }
  return uploadGridFS(
    buffer,
    type,
    filename.replace(/\.[^.]+$/, ".webp"),
    ownerId
  );
}

export async function storeDataUrl(
  dataUrl: string,
  ownerId?: string
): Promise<StoredMedia> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL");
  }
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  return storeMedia(buffer, contentType, "upload.webp", ownerId);
}

export async function getGridFSMeta(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const { db_url, db_name } = getDatabaseConfig();
  const client = await getMongoClient(db_url);
  const bucket = new GridFSBucket(client.db(db_name), { bucketName: "media" });
  const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
  if (!files.length) return null;
  return {
    contentType: files[0].contentType ?? "application/octet-stream",
    ownerId: (files[0].metadata?.ownerId as string | null) ?? null,
  };
}

export async function readGridFS(
  id: string
): Promise<{ buffer: Buffer; contentType: string; ownerId: string | null } | null> {
  const meta = await getGridFSMeta(id);
  if (!meta) return null;

  const { db_url, db_name } = getDatabaseConfig();
  const client = await getMongoClient(db_url);
  const bucket = new GridFSBucket(client.db(db_name), { bucketName: "media" });

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openDownloadStream(new ObjectId(id));
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });

  return {
    buffer: Buffer.concat(chunks),
    contentType: meta.contentType,
    ownerId: meta.ownerId,
  };
}

export async function readS3(
  key: string
): Promise<{ buffer: Buffer; contentType: string; ownerId: string | null } | null> {
  if (!s3Configured()) return null;
  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
    })
  );
  if (!response.Body) return null;
  const bytes = await response.Body.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentType: response.ContentType ?? "application/octet-stream",
    ownerId: response.Metadata?.ownerid ?? null,
  };
}

export async function deleteMedia(
  key: string,
  provider: "gridfs" | "s3"
): Promise<void> {
  if (provider === "s3" && s3Configured()) {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
      })
    );
    return;
  }

  if (!ObjectId.isValid(key)) return;
  const { db_url, db_name } = getDatabaseConfig();
  const client = await getMongoClient(db_url);
  const bucket = new GridFSBucket(client.db(db_name), { bucketName: "media" });
  try {
    await bucket.delete(new ObjectId(key));
  } catch {
    // already gone
  }
}

export function isDataUrl(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith("data:image"));
}
