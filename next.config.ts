import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    // Wildcard patterns for preview subdomains
    // These match any subdomain of space-z.ai and chatglm.site
    '.space-z.ai',
    '.space.chatglm.site',
    '.chatglm.site',
  ],
};

export default nextConfig;
