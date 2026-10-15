import { ConfigurationError } from "@/src/public/errors/config";
import { ImageFactoryResponse } from "@/src/public/types/images";
import { StatusCodes } from "@/src/public/types/responses";

const AVATARS = {
  "person-1": "/avatars/person-1.svg",
  "person-2": "/avatars/person-2.svg",
  "person-3": "/avatars/person-3.svg",
  "person-4": "/avatars/person-4.svg",
  "person-5": "/avatars/person-5.svg",
  "person-6": "/avatars/person-6.svg",
} as const;

export function generateImages(): ImageFactoryResponse {
  return { ...AVATARS };
}

export function buildDate(date: Date): string {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayOfWeek = daysOfWeek[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayOfWeek}, ${day} ${month} ${year}`;
}

export function getDatabaseConfig() {
  const db_url = process.env.DB_URL;
  const db_name = process.env.DB_NAME;

  if (!db_url || !db_name)
    throw new ConfigurationError("Invalid Application Environments.");

  return {
    db_url,
    db_name,
  };
}

export function generateServerResponses<T>(data: T, statusCode: StatusCodes) {
  try {
    const timestamp = new Date().toISOString();
    return Response.json({ message: data, timestamp }, { status: statusCode });
  } catch {
    return Response.json(
      { message: "Internal Server Error. Please Try Again Later." },
      { status: 500 }
    );
  }
}

export function getIdFromRequest(request: Request, param: string = "id") {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get(param);
    if (!id) return null;
    return id;
  } catch {
    return null;
  }
}
