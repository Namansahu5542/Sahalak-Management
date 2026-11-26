/** @type {import('next').NextConfig} */
const supabaseHost = (() => {
  try { return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null; }
  catch { return null; }
})();

const nextConfig = {
  /* config options here */
  images: {
    qualities: [72, 75, 82],
    ...(supabaseHost
      ? { remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/shop-images/**" }] }
      : {}),
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
