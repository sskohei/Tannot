"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function StartLearningLink({ label = "無料で始める" }: { label?: string }) {
  const { data: session } = authClient.useSession();
  return <Link className="button" href={session ? "/books" : "/login"}>{label} <span aria-hidden="true">↗</span></Link>;
}
