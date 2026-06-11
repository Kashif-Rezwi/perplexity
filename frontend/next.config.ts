import type { NextConfig } from "next";
import { BACKEND_URL } from "./src/lib/api/constants";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
