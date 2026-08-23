import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthButton } from "@/components/AuthButton";
import Image from "next/image";
import { PolicyRedirect } from "@/components/PolicyRedirect";

export const metadata: Metadata = {
  title: "Tannot",
  description: "音声付き英単語帳と間隔反復学習",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <PolicyRedirect />
        <a className="skip-link" href="#main-content">本文へ移動</a>
        <header className="site-header">
          <Link href="/" className="brand">
          <Image src="/images/logo.svg" alt="Tannot Logo" width={32} height={32} />
            Tannot
          </Link>
          <nav aria-label="メインナビゲーション">
            <Link className="button secondary" href="/pricing">料金</Link>
            <Link className="button secondary" href="/settings">プラン</Link>
            <Link className="button secondary" href="/dashboard">今日の復習</Link>
            <Link className="button" href="/books">単語帳</Link>
            <AuthButton />
          </nav>
        </header>
        <main className="container" id="main-content">{children}</main>
        <footer className="site-footer">
          <div>Dictionary data from EJDict, licensed under CC0 1.0 Universal.</div>
          <div>Example sentences from the <a href="https://tatoeba.org/" target="_blank" rel="noopener noreferrer">Tatoeba Project</a>, licensed under CC BY 2.0 FR.</div>
          <div className="footer-links"><Link href="/pricing">料金</Link><Link href="/support">お問い合わせ</Link><Link href="/legal/terms">利用規約</Link><Link href="/legal/privacy">プライバシーポリシー</Link><Link href="/legal/commercial-transactions">特定商取引法に基づく表記</Link><Link href="/licenses">OSS・データのライセンス</Link></div>
        </footer>
      </body>
    </html>
  );
}
