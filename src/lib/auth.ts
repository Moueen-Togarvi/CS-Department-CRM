import type { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { JWT } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { AuthError } from "@/lib/auth-error";
import {
  clientIp,
  LOGIN_RATE_LIMIT,
  loginRateLimitKey,
  rateLimit,
  resetRateLimit,
} from "@/lib/rate-limit";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      image?: string | null;
      semester?: number | null;
    };
  }
  interface User {
    role?: string;
    semester?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
    semester?: number | null;
  }
}

/**
 * Session JWTs are signed with this. The previous hardcoded fallback shipped in
 * the repo, so anyone with the source could forge an admin session on a deploy
 * that forgot to set the variable. Development still gets a fallback; production
 * refuses to run without a real secret.
 */
function resolveAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Refusing to sign sessions with a public fallback secret."
    )
  }
  console.warn(
    "[auth] NEXTAUTH_SECRET is not set — using an insecure development-only secret."
  )
  return "dev-only-insecure-secret";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Throttle before the database lookup. Without this an attacker gets
        // unlimited password guesses against any known email address.
        const ip = clientIp(new Headers((req?.headers ?? {}) as Record<string, string>));
        const rateKey = loginRateLimitKey(ip, credentials.email);
        if (!rateLimit(rateKey, LOGIN_RATE_LIMIT).allowed) {
          throw new Error("Too many sign-in attempts. Please try again later.");
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: { student: true }
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

        // Successful sign-in — don't hold earlier typos against this user.
        resetRateLimit(rateKey);

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
          semester: user.student ? user.student.currentSemester : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.userId = user.id!;
        token.role = user.role || "STUDENT";
        token.semester = user.semester;
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
        session.user.semester = token.semester;
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
  secret: resolveAuthSecret(),
};



