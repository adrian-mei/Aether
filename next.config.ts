import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disables the X-Powered-By header for security and cleaner headers
  poweredByHeader: false,
};

export default nextConfig;
