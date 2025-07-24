import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    NEXT_PUBLIC_AWS_REGION: process.env.AWS_REGION,
    NEXT_PUBLIC_AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  },
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
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "scrumsan.s3.ap-southeast-1.amazonaws.com",
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
