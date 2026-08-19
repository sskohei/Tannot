import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") initOpenNextCloudflareForDev();
