import NextAuthImport from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import authConfig from "./auth.config.js";
import { sql } from "@/app/lib/db";
import { verifyPassword } from "@/app/lib/auth/password";

const NextAuth =
  typeof NextAuthImport === "function"
    ? NextAuthImport
    : NextAuthImport.default || NextAuthImport["module.exports"];

const Credentials =
  typeof CredentialsProvider === "function"
    ? CredentialsProvider
    : CredentialsProvider.default || CredentialsProvider["module.exports"];

const credentialsProvider = Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
    const password = typeof credentials?.password === "string" ? credentials.password : "";
    if (!email || !password) return null;

    const [user] = await sql`
      select id, name, email, role, password_hash
      from users
      where email = ${email} and email_verified_at is not null
      limit 1`;
    if (!user || !(await verifyPassword(password, user.passwordHash))) return null;

    return { id: user.id, name: user.name, email: user.email, role: user.role || "user" };
  },
});

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, credentialsProvider],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      const email = (user?.email || (trigger === "update" ? token.email : ""))?.trim().toLowerCase();
      if (email) {
        const [account] = await sql`select role from users where email = ${email} limit 1`;
        token.role = account?.role || user?.role || token.role || "user";
      } else if (user?.role) {
        token.role = user.role;
      } else if (!token.role) {
        token.role = "user";
      }
      return token;
    },
  },
});