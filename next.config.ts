import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Required for Docker/standalone deployment
  output: 'standalone',
};

export default nextConfig;
