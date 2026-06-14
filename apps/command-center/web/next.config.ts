import type { NextConfig } from 'next';

// The orchestrator (Fastify + Socket.IO) runs on :4100. The Socket.IO client
// connects directly (CORS allowlists :3000); REST calls go through Next rewrites
// so the browser can use same-origin relative `/api/*` URLs in dev + prod.
const ORCH_URL = process.env.ORCH_URL ?? 'http://127.0.0.1:4100';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `@command-center/shared` is a barrel of raw TS source with no build step —
  // Next must transpile it or the app won't compile.
  transpilePackages: ['@command-center/shared'],
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${ORCH_URL}/api/:path*` },
      // Socket.IO HTTP handshake fallback (the WS upgrade connects direct).
      { source: '/socket.io/:path*', destination: `${ORCH_URL}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
