import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
