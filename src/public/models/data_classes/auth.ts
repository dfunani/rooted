import { z } from "zod";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex =
  /^(?=.*\d)(?=.*[!@#$%^&*()_+-])[A-Za-z\d!@#$%^&*()_+-]{8,}$/;
const dobRegex = /^\d{4}-\d{2}-\d{2}$/;
const systemDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const objectIDRegex = /^[0-9a-fA-F]{24}$/;
const imageValue = z.union([
  z.string().url(),
  z.string().startsWith("/"),
  z.string().regex(/^data:image\/(png|jpg|jpeg|webp);base64,/),
  z.literal(""),
  z.null(),
]);

export const LoginUser = z.object({
  id: z.string().regex(objectIDRegex),
  email: z.string(),
  password: z.string(),
  createdAt: z.string().regex(systemDateRegex),
  updatedAt: z.string().regex(systemDateRegex),
});

export const Credentials = z.object({
  email: z.string().email().regex(emailRegex, "Invalid Email."),
  password: z.string().regex(passwordRegex, "Invalid Password."),
});

export const TokenGeneration = z.object({
  user_id: z.string().regex(objectIDRegex),
  email: z.string().email().regex(emailRegex, "Invalid Email."),
  password: z.string().regex(passwordRegex, "Invalid Password."),
  expires: z.number().optional().default(3600),
});

export const APIKeyGeneration = z.object({
  user_id: z.string().regex(objectIDRegex),
  token: z.string().min(16),
  email: z.string().email().regex(emailRegex, "Invalid Email."),
  password: z.string().regex(passwordRegex, "Invalid Password."),
});

export const UserProfile = z.object({
  name: z.string().min(1, "Invalid Name.").max(255),
  surname: z.string().min(1, "Invalid Surname.").max(255),
  dob: z.string().regex(dobRegex, "Invalid Date Of Birth."),
  city: z.string().min(1, "Invalid City.").max(255),
  country: z.string().min(1, "Invalid Country").max(255),
  image: imageValue,
});

export const FetchUser = z.object({
  id: z.string().regex(objectIDRegex, "Invalid User ID."),
});

export const RegisterUser = z.object({
  email: z.string().email().regex(emailRegex, "Invalid Email."),
  password: z.string().regex(passwordRegex, "Invalid Password."),
  name: z.string().min(1, "Invalid Name.").max(255),
  surname: z.string().min(1, "Invalid Surname.").max(255),
  dob: z.string().regex(dobRegex, "Invalid Date Of Birth."),
  city: z.string().min(1, "Invalid City.").max(255),
  country: z.string().min(1, "Invalid Country").max(255),
  image: imageValue,
});

export const PatchDetails = z.object({
  id: z.string().regex(objectIDRegex),
  name: z.string().min(1, "Invalid Name.").max(255),
  surname: z.string().min(1, "Invalid Surname.").max(255),
  dob: z.string().regex(dobRegex, "Invalid Date Of Birth."),
  city: z.string().min(1, "Invalid City.").max(255),
  country: z.string().min(1, "Invalid Country").max(255),
  image: imageValue,
});

export const JWTPayload = z.object({
  sub: z.string(),
  user_id: z.string().regex(objectIDRegex),
  email: z.string().email().regex(emailRegex, "Invalid Email."),
  iat: z.number(),
  exp: z.number(),
});

export const JWTResponse = z.object({
  token: z.string(),
  expires: z.number(),
  expiresAt: z.string().regex(systemDateRegex),
  createdAt: z.string().regex(systemDateRegex),
});

export const APIKeyResponse = z.object({
  user_id: z.string().regex(objectIDRegex),
  apiKey: z.string(),
  active: z.boolean(),
  createdAt: z.string().regex(systemDateRegex),
  expiresAt: z.string().regex(systemDateRegex),
});
