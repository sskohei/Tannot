export type LookupPreviewItem = {
  term: string;
  translation: string | null;
  sentence: string | null;
  existing?: boolean;
};

export function LookupPreviewTable({ items, showStatus = false }: { items: LookupPreviewItem[]; showStatus?: boolean }) {
  return <div className="preview-table-wrapper">
    <table className="preview-table">
      <caption>追加する単語の確認</caption>
      <thead><tr><th scope="col">英単語・熟語</th><th scope="col">日本語訳</th><th scope="col">例文</th>{showStatus && <th scope="col">状態</th>}</tr></thead>
      <tbody>{items.map((item) => <tr key={item.term}>
        <th scope="row">{item.term}</th>
        <td>{item.translation ?? "見つかりませんでした"}</td>
        <td>{item.sentence ?? "見つかりませんでした"}</td>
        {showStatus && <td>{item.existing ? <span className="badge">登録済み・スキップ</span> : "新規"}</td>}
      </tr>)}</tbody>
    </table>
  </div>;
}
