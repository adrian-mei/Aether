import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disables the X-Powered-By header for security and cleaner headers
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'https://talks-dresses-incidents-bars.trycloudflare.com/:path*',
      },
    ]
  },
};

export default nextConfig;
