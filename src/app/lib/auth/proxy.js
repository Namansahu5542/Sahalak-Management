import NextAuth from "next-auth";
import authConfig from "./auth.config.js";

export const { auth: proxy } = NextAuth(authConfig);