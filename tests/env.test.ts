import { afterEach, describe, expect, it } from "vitest";
import type { Bindings } from "@/lib/types";
import { getEnvValue } from "@/server/auth";

const originalStripePriceId = process.env.STRIPE_PRICE_ID;

afterEach(() => {
  if (originalStripePriceId === undefined) delete process.env.STRIPE_PRICE_ID;
  else process.env.STRIPE_PRICE_ID = originalStripePriceId;
});

describe("getEnvValue", () => {
  it("prefers a Cloudflare string binding", () => {
    process.env.STRIPE_PRICE_ID = "price_from_process";
    const env = { STRIPE_PRICE_ID: "price_from_binding" } as Bindings;
    expect(getEnvValue(env, "STRIPE_PRICE_ID")).toBe("price_from_binding");
  });

  it("falls back to the Next.js process environment", () => {
    process.env.STRIPE_PRICE_ID = "price_from_process";
    expect(getEnvValue({} as Bindings, "STRIPE_PRICE_ID")).toBe("price_from_process");
  });
});
