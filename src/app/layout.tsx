import "@/src/app/globals.css";

import { CSSProperties, ReactNode } from "react";
import { getServerSession } from "next-auth";
import { Fraunces, Source_Sans_3 } from "next/font/google";

import Providers from "@/src/app/providers";
import { authOptions } from "@/src/app/api/auth/[...nextauth]/options";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-loaded",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body-loaded",
});

export const metadata = {
  title: "Rooted — Family Tree Builder",
  description:
    "Build and share your family tree. Drag, drop, connect, and grow your roots.",
  icons: {
    icon: "/favicon.ico",
  },
};

type Props = {
  children: ReactNode;
};

export default async function RootLayout(props: Props) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body
        style={
          {
            "--font-display": "var(--font-display-loaded), Georgia, serif",
            "--font-body": "var(--font-body-loaded), sans-serif",
          } as CSSProperties
        }
      >
        <Providers session={session}>{props.children}</Providers>
      </body>
    </html>
  );
}
