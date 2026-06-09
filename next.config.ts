import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {
    root: '/home/z/my-project', 
  },
  allowedDevOrigins: [
    '.space-z.ai',
    '.space.chatglm.site',
    '.chatglm.site',
  ],
};

export default nextConfig;
