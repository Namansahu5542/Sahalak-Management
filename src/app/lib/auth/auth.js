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

// Ask GitHub whether this email address is verified on the user's GitHub account.
async function isGithubEmailVerified(accessToken, email) {
  if (!accessToken || !email) return false;
  try {
    const response = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "sahalak",
      },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const emails = await response.json();
    return (
      Array.isArray(emails) &&
      emails.some((item) => item?.verified === true && String(item.email).toLowerCase() === email)
    );
  } catch {
    return false;
  }
}

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

    // Runs right after GitHub or the password check succeeds, before the session exists.
    async signIn({ account, user }) {
      if (account?.provider === "github") {
        const email = user?.email?.trim().toLowerCase();
        return isGithubEmailVerified(account.access_token, email);
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // 1) Sign-in moment: tie this login to exactly one row in our users table.
      if (account && user) {
        if (account.provider === "github") {
          const email = user.email.trim().toLowerCase();
          const [row] = await sql`
            insert into users (email, name, email_verified_at)
            values (${email}, ${user.name || ""}, now())
            on conflict (email) do update
              set email_verified_at = coalesce(users.email_verified_at, now())
            returning id, role`;
          token.sub = row.id;
          token.role = row.role;
        } else {
          // Password login: authorize() already returned our database id and role.
          token.sub = user.id;
          token.role = user.role || "user";
        }
        return token;
      }

      // 2) After a role change (for example, becoming an owner), reload the role.
      if (trigger === "update" && token.sub) {
        const [row] = await sql`select role from users where id = ${token.sub} limit 1`;
        if (row) token.role = row.role;
      }

      if (!token.role) token.role = "user";
      return token;
    },
  },
});