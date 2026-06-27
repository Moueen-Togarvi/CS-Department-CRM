import type { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      image?: string | null;
    };
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          throw new Error("Account is deactivated. Contact admin.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.userId = user.id!;
        token.role = user.role || "STUDENT";
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
        session.user.email = token.email || "";
        session.user.name = token.name || "";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET || "cs-department-secret-key-change-in-production",
};

/**
 * Get the current authenticated session from a server request
 */
export async function getAuthSession(request?: NextRequest) {
  // getServerSession works with cookies automatically
  return getServerSession(authOptions);
}

/**
 * Require authentication - throws error if not logged in
 */
export async function requireAuth(request: NextRequest) {
  const session = await getAuthSession(request);

  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please log in to continue");
  }

  return session;
}

/**
 * Require specific role(s) - throws error if user doesn't have required role
 */
export async function requireRole(
  request: NextRequest,
  roles: string | string[]
) {
  const session = await requireAuth(request);

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(session.user.role)) {
    throw new Error(
      `Forbidden: Required role(s): ${allowedRoles.join(", ")}`
    );
  }

  return session;
}