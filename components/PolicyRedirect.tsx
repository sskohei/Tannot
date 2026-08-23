"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

const protectedPrefixes = ["/books", "/dashboard", "/study", "/settings"];

export function PolicyRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || !session || !protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) return;
    let cancelled = false;
    void fetch("/api/me").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as {
        policyAcceptance?: { terms_version: string | null; privacy_version: string | null; eligibility_confirmed_at: string | null } | null;
        currentPolicies?: { termsVersion: string; privacyVersion: string };
      };
      const current = data.policyAcceptance?.terms_version === data.currentPolicies?.termsVersion
        && data.policyAcceptance?.privacy_version === data.currentPolicies?.privacyVersion
        && Boolean(data.policyAcceptance?.eligibility_confirmed_at);
      if (!cancelled && !current) router.replace("/onboarding");
    }).catch(() => {
      // Each destination page keeps its own recoverable API error UI.
    });
    return () => { cancelled = true; };
  }, [isPending, pathname, router, session]);

  return null;
}
