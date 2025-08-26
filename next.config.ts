import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Disable experimental features that may be causing warnings
  experimental: {},
  // No basePath needed when using custom domain
  // basePath: process.env.NODE_ENV === 'production' ? '/party-journal' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/party-journal/' : '',
};

export default nextConfig;
