import NextAuthImport from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import authConfig from "./auth.config.js";
import { connectMongoose } from "@/app/lib/db/mongoose";
import User from "@/app/lib/models/User";
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

    await connectMongoose();
    const user = await User.findOne({ email, emailVerifiedAt: { $type: "date" } }).lean();
    if (!user || !(await verifyPassword(password, user.passwordHash))) return null;

    return { id: String(user._id), name: user.name, email: user.email, role: user.role || "user" };
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
        await connectMongoose();
        const account = await User.findOne({ email }).select({ role: 1 }).lean();
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
