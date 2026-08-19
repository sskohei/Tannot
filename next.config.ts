import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  // OpenNext intentionally does not pass Next.js `.env*` values to the
  // Cloudflare context by default. Load the local-only bindings as well so
  // server code using `getCloudflareContext().env` sees the same values as
  // the Next.js runtime during `next dev`.
  initOpenNextCloudflareForDev({ envFiles: [".env.local"] });
}
