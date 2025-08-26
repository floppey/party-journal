import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // No basePath needed when using custom domain
  // basePath: process.env.NODE_ENV === 'production' ? '/party-journal' : '',
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/party-journal/' : '',
};

export default nextConfig;
