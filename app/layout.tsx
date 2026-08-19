import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AuthButton } from "@/components/AuthButton";

export const metadata: Metadata = {
  title: "Tannot",
  description: "音声付き英単語帳と間隔反復学習",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">Tannot</Link>
          <nav><Link href="/books">単語帳</Link><AuthButton /></nav>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">EJDict（CC0）・Tatoeba（CC BY 2.0 FR）・Kokoroの出典情報を保持しています。</footer>
      </body>
    </html>
  );
}
