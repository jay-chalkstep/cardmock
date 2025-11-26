import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      // Redirect old /library routes to new routes
      {
        source: '/library',
        destination: '/brands',
        permanent: true,
      },
      {
        source: '/library/:path*',
        has: [{ type: 'query', key: 'tab', value: 'brands' }],
        destination: '/brands',
        permanent: true,
      },
      {
        source: '/library/:path*',
        has: [{ type: 'query', key: 'tab', value: 'templates' }],
        destination: '/templates',
        permanent: true,
      },
      {
        source: '/library/:path*',
        has: [{ type: 'query', key: 'tab', value: 'assets' }],
        destination: '/',
        permanent: true,
      },
      // Redirect old /projects routes to /brands
      {
        source: '/projects',
        destination: '/brands',
        permanent: true,
      },
      {
        source: '/projects/:id',
        destination: '/brands/:id',
        permanent: true,
      },
      // Redirect removed routes to home
      {
        source: '/gallery',
        destination: '/',
        permanent: true,
      },
      {
        source: '/trash',
        destination: '/',
        permanent: true,
      },
      {
        source: '/my-stage-reviews',
        destination: '/',
        permanent: true,
      },
      {
        source: '/admin/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },
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
};

export default nextConfig;
