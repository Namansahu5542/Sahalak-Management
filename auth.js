import Github from "next-auth/providers/github";

export const authOptions = {
  secret: process.env.BETTER_AUTH_SECRET,
  providers: [
    Github({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
};