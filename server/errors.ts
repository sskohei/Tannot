import { HTTPException } from "hono/http-exception";
import { ValidationError } from "@/lib/validation";

export function jsonError(code: string, message: string, status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof HTTPException) return error.getResponse();
  if (error instanceof ValidationError) return jsonError(error.code, error.message, 400);
  console.error("request_failed", error instanceof Error ? error.message : "unknown error");
  return jsonError("INTERNAL_ERROR", "時間をおいて再度お試しください", 500);
}
