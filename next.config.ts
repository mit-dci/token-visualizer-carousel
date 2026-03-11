import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/token-visualizer-carousel",
  images: { unoptimized: true },
};

export default nextConfig;
