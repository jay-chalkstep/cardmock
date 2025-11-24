import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Configure for server-side package handling
  serverExternalPackages: ['@clerk/nextjs', '@clerk/shared'],
};

export default nextConfig;
