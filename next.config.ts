import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // React 19 is stable in Next.js 15 — no flag needed
  },
  // Ensure server-only modules don't leak to client bundle
  serverExternalPackages: ['postgres', 'drizzle-orm', 'pdf-parse'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;
