import { betterAuth } from "better-auth";
import type { Bindings } from "@/lib/types";

export function getEnvValue(env: Bindings, key: keyof Bindings): string | undefined {
  const value = env[key];
  if (typeof value === "string" && value.length > 0) return value;

  // `next dev` loads `.env.local` into Next.js' process environment, while
  // OpenNext's local Cloudflare context may not expose those values on env.
  return process.env[key] || undefined;
}

export function createAuth(env: Bindings) {
  return betterAuth({
    database: env.DB,
    secret: getEnvValue(env, "BETTER_AUTH_SECRET"),
    baseURL: getEnvValue(env, "BETTER_AUTH_URL"),
    trustedOrigins: [getEnvValue(env, "BETTER_AUTH_URL")].filter((value): value is string => Boolean(value)),
    socialProviders: {
      google: {
        clientId: getEnvValue(env, "GOOGLE_CLIENT_ID") ?? "",
        clientSecret: getEnvValue(env, "GOOGLE_CLIENT_SECRET") ?? "",
      },
    },
    advanced: {
      useSecureCookies: getEnvValue(env, "BETTER_AUTH_URL")?.startsWith("https://") ?? false,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
