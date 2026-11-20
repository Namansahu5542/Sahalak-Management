import NextAuthImport from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import authConfig from "./auth.config.js";
import { getDatabase } from "@/app/lib/db/mongodb";
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

    const db = await getDatabase();
    const user = await db.collection("users").findOne({ email, emailVerifiedAt: { $type: "date" } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return null;

    return { id: String(user._id), name: user.name, email: user.email, role: user.role || "user" };
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [...authConfig.providers, credentialsProvider],
});
