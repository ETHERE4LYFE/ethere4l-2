import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---------------------------------------------------------
  // REVERSE PROXY: /api/* → Backend Container
  // ---------------------------------------------------------
  // All client-side requests to /api/* are rewritten to the
  // internal backend origin. Backend URL is never exposed to
  // the browser. In production, replace localhost with the
  // internal container name (e.g., http://backend:8080).
  // ---------------------------------------------------------
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/:path*',
      },
    ];
  },
};

export default nextConfig;
