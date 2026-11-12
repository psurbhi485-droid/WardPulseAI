import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Enable strict mode for better React development */
  reactStrictMode: true,
  /* Allow images from common sources */
  images: {
    domains: [],
  },
};

export default nextConfig;
