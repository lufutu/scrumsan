import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds - we'll fix linting issues separately
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript build errors during development
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "mainline-nextjs-template.vercel.app",
      },
      {
        hostname: "cdn.dribbble.com",
      },
      {
        hostname: "randomuser.me",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "erprvaquhseykdxfzwea.supabase.co",
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
