import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  typescript: {
    // Dangerously allow production builds to complete even with type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint during builds as well
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
