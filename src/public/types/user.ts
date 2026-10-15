import { StaticImageData } from "next/image";

export type CredentialsType = {
  email: string;
  password: string;
};

export type RegistrationType = CredentialsType & {
  name: string;
  surname: string;
  dob: string;
  city: string;
  country: string;
  image: string | null | StaticImageData;
};


export type UserType = Pick<RegistrationType, "email" | "password"> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type UserStateType = {
  email: string | null;
  id: string | null;
  isNewUser: boolean | null;
};

export type ProfileType = Omit<RegistrationType, "email" | "password">;

export type ProfileStateType = {
  name: string | null;
  surname: string | null;
  dob: string | null;
  city: string | null;
  country: string | null;
  image: string | null;
};

export type JWTPayloadType = {
  sub: string;
  user_id: string;
  email: string;
  password?: string;
  iat: number;
  exp: number;
};
