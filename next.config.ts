import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: "export" for Vercel deployment
  // Vercel supports dynamic routing natively
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable experimental features that may be causing warnings
  experimental: {},
};

export default nextConfig;
