import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `ws` (used by the neon-serverless driver for real transactions) ships
  // native optional deps (bufferutil/utf-8-validate); bundling it produces
  // a broken stub ("bufferUtil.mask is not a function"). Server code runs
  // in Node directly, so there's no bundling benefit anyway — require it
  // natively instead.
  serverExternalPackages: ["ws", "@neondatabase/serverless"],
};

export default nextConfig;
