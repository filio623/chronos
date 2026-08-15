import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    // process.cwd() is this repo when launched via `npm run dev`.
    // __dirname is unreliable after Next bundles next.config.ts.
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
