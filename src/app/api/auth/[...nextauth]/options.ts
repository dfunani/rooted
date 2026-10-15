import Credentials from "next-auth/providers/credentials";
import User from "@/src/public/models/users";
import Security from "@/src/public/utils/cryptography";
import { SessionProps, TokenProps } from "@/src/public/types/auth";
import { LoginUser } from "@/src/public/models/data_classes/auth";
import { getDatabaseConfig } from "@/src/public/utils/factories";

export const authOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials || !credentials.email || !credentials.password)
          return null;

        const { db_url, db_name } = getDatabaseConfig();
        const user = new User(db_url, db_name);
        const newUser = await user.getUser({
          email: credentials.email,
          password: credentials.password,
        });
        if (!newUser) return null;

        const data = LoginUser.safeParse(newUser);
        if (!data.success) return null;

        return data.data;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: TokenProps) {
      if (token.email) {
        const client = new Security();
        token.accessToken = client.hash(token.email);
      }

      if (user && "updatedAt" in user && "createdAt" in user) {
        token.isNewUser = user.createdAt == user.updatedAt;
      }

      if (user?.id) token.id = user.id;

      return token;
    },

    async session({ session, token }: SessionProps) {
      if (session.user?.email) {
        const client = new Security();
        try {
          session.user.email = client.decrypt(session.user.email);
        } catch {
          // already plaintext
        }
      }

      session.user.isNewUser = token?.isNewUser as boolean;
      session.user.id = token?.id as string;

      return session;
    },
  },
  pages: {
    signIn: "/auth/user/login",
  },
};
