import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ["10.100.100.112"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/impact",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
