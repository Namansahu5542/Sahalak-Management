import GitHubProvider from "next-auth/providers/github";

const GitHub =
  typeof GitHubProvider === "function"
    ? GitHubProvider
    : GitHubProvider.default || GitHubProvider["module.exports"];

export default {
  secret: process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.role) token.role = user.role;
      if (!token.role) token.role = "user";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
