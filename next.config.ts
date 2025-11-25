import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disables the X-Powered-By header for security and cleaner headers
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://159.54.180.60:3002/:path*',
      },
    ]
  },
};

export default nextConfig;
