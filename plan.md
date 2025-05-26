# 計画: DOIがない場合のGeminiメタデータ送信

## 目的
DOIが存在しない場合でも、Geminiで生成したメタデータがNotionに正常に送信されるようにする。

## 問題点
現在の実装では、DOIが見つからない場合にNotionへのメタデータ送信が失敗する可能性がある。これは、Geminiが抽出するメタデータが不完全であるか、Notionデータベースのプロパティ設定が原因であると考えられる。

## 調査結果
- `background.js`: Geminiでメタデータを抽出し、その後Crossref/ArXivでDOIを含むメタデータを補完しようとしている。DOIが見つからない場合でもGeminiで抽出したメタデータは `meta` 変数に残るが、Notionへの送信時に問題が発生している可能性がある。
- `utils/crossref.js`: Crossref APIからDOIを含むメタデータを検索・取得する。
- `utils/gemini.js`: Gemini APIとの通信を担当し、スキーマ指定でJSON形式のメタデータを取得できる。
- `utils/notion.js`: Notion APIへのデータ送信を担当。`sendToNotion` 関数で `meta` オブジェクトをNotionのプロパティにマッピングしている。DOIプロパティは `meta.doi || null` で処理されるが、他の必須プロパティが空の場合にエラーとなる可能性がある。

## 提案する計画

### 1. `background.js` の変更
`processAndSendToNotion` 関数内で、Geminiから抽出した `meta` オブジェクトがNotionに送信される前に、Notionの必須プロパティが空でないことを確認し、もし空であれば適切なデフォルト値を設定するロジックを追加します。

**変更箇所:** `background.js` の `processAndSendToNotion` 関数内の `metaCrossref` が `null` の場合の `else` ブロック。

```javascript
// background.js の関連部分
// ...
if (metaCrossref) {
  if (!metaCrossref.abstract && meta.abstract) {
    metaCrossref.abstract = meta.abstract;
  }
  Object.assign(meta, metaCrossref);
  updateProcessingState({ currentStep: 'CrossrefまたはArXivからメタデータを取得し補完しました', progress: 40 });
} else {
  updateProcessingState({ currentStep: 'DOIが見つかりませんでした', progress: 40 });
  // DOIが見つからない場合でも、Geminiで抽出したメタデータがNotionに送信されるように、
  // 必須プロパティの欠落を防ぐための補完処理を追加
  meta.authors = meta.authors || "";
  meta.journal = meta.journal || "";
  meta.year = meta.year || null;
  meta.doi = meta.doi || null; // DOIがない場合はnullのまま
  meta.abstract = meta.abstract || "";
}
// ...
```

### 2. `utils/notion.js` の変更
`sendToNotion` 関数内で、`properties` オブジェクトを構築する際に、各プロパティの値がNotion APIの期待する形式に合致しているか、より堅牢なチェックを追加します。特に `select` プロパティで、空の値を適切に処理するように調整します。

**変更箇所:** `utils/notion.js` の `sendToNotion` 関数内の `properties` オブジェクトの構築部分。

```javascript
// utils/notion.js の関連部分
// ...
const properties = {
  "タイトル": {
    title: [{ text: { content: meta.title || "No Title" } }]
  },
  "著者": {
    multi_select: authorsList.map(a => ({ name: a }))
  },
  "発表年": {
    number: typeof meta.year === "number" ? meta.year : null
  },
  // ジャーナルが空の場合はselectプロパティ自体を省略するか、nameを空にする
  // Notion APIの挙動に合わせて調整
  // ここでは、journalが空文字列の場合にselectプロパティをname: ""として設定する
  "ジャーナル": journal ? { select: { name: journal } } : { select: { name: "" } },
  "DOI": {
    url: meta.doi || null
  },
  "アブスト": {
    rich_text: [{ text: { content: meta.abstract || "" } }]
  }
};
// ...
```

## 計画のフローチャート

```mermaid
graph TD
    A[処理開始] --> B{PDFファイル取得};
    B --> C[Geminiでメタデータ抽出];
    C --> D{タイトルが存在するか？};
    D -- No --> E[エラー: メタデータ取得失敗];
    D -- Yes --> F[DOI検索 (Crossref/ArXiv)];
    F --> G{DOIが見つかったか？};
    G -- Yes --> H[Crossref/ArXivメタデータで補完];
    G -- No --> I[Geminiメタデータを補完/整形];
    H --> J[アブストラクト翻訳];
    I --> J;
    J --> K[論文要約];
    K --> L[NotionにPDFアップロード];
    L --> M[Notionにメタデータと要約を送信];
    M --> N[処理完了];
    E --> N;