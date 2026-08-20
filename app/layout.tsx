import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthButton } from "@/components/AuthButton";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Tannot",
  description: "音声付き英単語帳と間隔反復学習",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
          <Image src="/images/logo.svg" alt="Tannot Logo" width={32} height={32} />
            Tannot
          </Link>
          <nav><Link className="button" href="/books">単語帳</Link><AuthButton /></nav>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer"><div>Dictionary data from EJDict, licensed under CC0 1.0 Universal.</div><div>Example sentences from the <a href="https://tatoeba.org/" target="_blank" rel="noopener noreferrer">Tatoeba Project</a>, licensed under CC BY 2.0 FR.</div><div><Link href="/licenses">OSS・データのライセンス</Link></div></footer>
      </body>
    </html>
  );
}
