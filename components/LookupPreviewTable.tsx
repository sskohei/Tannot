"use client";

import { useEffect, useRef, useState } from "react";

export type LookupPreviewItem = {
  term: string;
  translation: string | null;
  sentence: string | null;
  existing?: boolean;
};

function TranslationPreview({ translation }: { translation: string }) {
  const translationRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandable, setExpandable] = useState(false);

  useEffect(() => {
    const element = translationRef.current;
    if (!element || expanded) return;

    const updateExpandable = () => {
      setExpandable(element.scrollHeight > element.clientHeight + 1);
    };

    updateExpandable();
    const observer = new ResizeObserver(updateExpandable);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, translation]);

  return <>
    <div ref={translationRef} className={`translation-preview${expanded ? " is-expanded" : ""}`}>
      {translation}
    </div>
    {expandable && <button
      className="translation-toggle"
      type="button"
      aria-expanded={expanded}
      onClick={() => setExpanded((current) => !current)}
    >{expanded ? "閉じる" : "続きを読む"}</button>}
  </>;
}

export function LookupPreviewTable({ items, showStatus = false }: { items: LookupPreviewItem[]; showStatus?: boolean }) {
  return <div className="preview-table-wrapper">
    <table className="preview-table">
      <caption>追加する単語の確認</caption>
      <thead><tr><th scope="col">英単語・熟語</th><th scope="col">日本語訳</th><th scope="col">例文</th>{showStatus && <th scope="col">状態</th>}</tr></thead>
      <tbody>{items.map((item) => <tr key={item.term}>
        <th scope="row">{item.term}</th>
        <td>{item.translation ? <TranslationPreview translation={item.translation} /> : "見つかりませんでした"}</td>
        <td>{item.sentence ?? "見つかりませんでした"}</td>
        {showStatus && <td>{item.existing ? <span className="badge">登録済み・スキップ</span> : "新規"}</td>}
      </tr>)}</tbody>
    </table>
  </div>;
}
