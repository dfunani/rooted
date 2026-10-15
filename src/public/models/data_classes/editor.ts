import { z } from "zod";

const objectIDRegex = /^[0-9a-fA-F]{24}$/;

const relationship = z.enum([
  "parent",
  "child",
  "spouse",
  "sibling",
  "partner",
  "related",
]);

const imageValue = z.union([
  z.string().url(),
  z.string().startsWith("/"),
  z.string().regex(/^data:image\/(png|jpg|jpeg|webp);base64,/),
  z.literal(""),
]);

const nodeData = z.object({
  name: z.string().min(1, "Invalid Name."),
  surname: z.string().min(1, "Invalid Surname."),
  dob: z.string().min(1, "Invalid Date Of Birth."),
  city: z.string().min(1, "Invalid City."),
  country: z.string().min(1, "Invalid Country"),
  image: imageValue.nullable(),
  label: z.string(),
});

const positionData = z.object({
  x: z.number(),
  y: z.number(),
});

const FetchNode = z.object({
  id: z.string(),
  position: positionData,
  type: z.string(),
  data: nodeData,
});

export const FetchEdge = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string().nullable().optional(),
  target: z.string(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(),
  label: z.string().optional(),
  data: z
    .object({
      relationship: relationship,
    })
    .optional(),
});

export const FetchEditor = z.object({
  id: z.string().regex(objectIDRegex).optional(),
  user_id: z.string(),
  nodes: z.array(FetchNode),
  edges: z.array(FetchEdge),
});

export const DeleteEditor = z.object({
  user_id: z.string(),
});
