"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Me = {
  user: { id: string } | null;
  policyAcceptance: {
    terms_version: string | null;
    privacy_version: string | null;
    eligibility_confirmed_at: string | null;
  } | null;
  currentPolicies: { termsVersion: string; privacyVersion: string };
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [acceptedEligibility, setAcceptedEligibility] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      setChecking(false);
      return;
    }
    fetch("/api/me").then(async (response) => {
      const data = await response.json() as Me & { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "登録状態を確認できませんでした");
      const current = data.policyAcceptance?.terms_version === data.currentPolicies.termsVersion
        && data.policyAcceptance?.privacy_version === data.currentPolicies.privacyVersion
        && Boolean(data.policyAcceptance?.eligibility_confirmed_at);
      if (current) router.replace("/dashboard");
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "登録状態を確認できませんでした"))
      .finally(() => setChecking(false));
  }, [isPending, router, session]);

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/account/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termsAccepted: acceptedPolicies, eligibilityAccepted: acceptedEligibility }),
      });
      const data = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? "確認内容を保存できませんでした");
      router.replace("/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "確認内容を保存できませんでした");
      setLoading(false);
    }
  }

  if (isPending || checking) return <p className="muted" role="status">登録状態を確認中…</p>;
  if (!session) return <section className="panel pop-shadow stack"><h1>利用を始める</h1><p>確認を続けるにはログインしてください。</p><Link className="button" href="/login">ログイン画面へ</Link></section>;

  return <section className="panel pop-shadow stack onboarding-panel">
    <p className="eyebrow">ONE MORE STEP</p>
    <h1>Tannotを始める前に</h1>
    <p className="muted">年齢条件と現在の規約をご確認ください。同意した規約の版と日時をアカウントに記録します。</p>
    <label className="consent"><input type="checkbox" checked={acceptedEligibility} onChange={(event) => setAcceptedEligibility(event.target.checked)} /> <span>私は13歳以上です。18歳未満の場合は、本サービスの利用について保護者の同意を得ています。</span></label>
    <label className="consent"><input type="checkbox" checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} /> <span><Link href="/legal/terms" target="_blank">利用規約</Link>と<Link href="/legal/privacy" target="_blank">プライバシーポリシー</Link>を確認し、同意します。</span></label>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="button" type="button" disabled={loading || !acceptedPolicies || !acceptedEligibility} onClick={() => void complete()}>{loading ? "保存中…" : "同意して利用を始める"}</button>
  </section>;
}
