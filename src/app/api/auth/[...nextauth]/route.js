import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Meme Account",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "xQc" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials.username || !credentials.password) return null;
        
        let user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        if (!user) {
          // Auto-register logic for MVP simplicity
          user = await prisma.user.create({
            data: {
              username: credentials.username,
              password_hash: credentials.password, // No real hash for MVP speed
              meme_coins: 500,
              elo: 1200,
              avatar: "🧠"
            }
          });
        } else {
          // Check password
          if (user.password_hash !== credentials.password) {
            throw new Error("Invalid password");
          }
        }

        return { id: user.id, name: user.username, image: user.avatar };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      session.user.id = token.sub;
      session.user.name = token.name;
      session.user.image = token.picture;
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "SUPER_SECRET_MEME_KEY",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
