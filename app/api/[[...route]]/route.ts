import { getCloudflareContext } from "@opennextjs/cloudflare";
import { app } from "@/server/app";
import type { Bindings } from "@/lib/types";

async function handle(request: Request) {
  const { env } = getCloudflareContext() as unknown as { env: Bindings };
  return app.fetch(request, env);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
