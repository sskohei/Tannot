"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthButton } from "@/components/AuthButton";

export function SiteHeaderNav() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    function closeOnDesktop() {
      if (window.innerWidth > 600) setIsOpen(false);
    }
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);

  return <>
    <button className={`menu-toggle${isOpen ? " is-open" : ""}`} type="button" aria-expanded={isOpen} aria-controls="site-navigation" aria-label={isOpen ? "メニューを閉じる" : "メニューを開く"} onClick={() => setIsOpen((open) => !open)}>
      <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
    </button>
    <nav id="site-navigation" className={`site-nav${isOpen ? " is-open" : ""}`} aria-label="メインナビゲーション" onClick={() => setIsOpen(false)}>
      <Link className="button secondary" href="/settings">設定</Link>
      <Link className="button secondary" href="/stats">学習統計</Link>
      <Link className="button secondary" href="/dashboard">今日の復習</Link>
      <Link className="button" href="/books">単語帳</Link>
      <AuthButton />
    </nav>
  </>;
}
