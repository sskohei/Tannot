import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: ["**/.next/**", "**/.open-next/**", "node_modules/**", "next-env.d.ts"] },
  ...nextConfig,
];

export default config;
