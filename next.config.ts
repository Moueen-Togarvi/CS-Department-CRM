import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactStrictMode: false,
  turbopack: {},
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        ...(config.watchOptions?.ignored || []),
        '**/public/uploads/**',
      ],
    }
    return config
  },
};

export default nextConfig;
