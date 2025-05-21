// Gemini APIに送信するプロンプトを管理するファイル

// メタデータ抽出用のスキーマ
export const PAPER_META_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    authors: { type: "STRING" },
    journals: { type: "STRING" },
    year: { type: "INTEGER" },
    abstract: { type: "STRING" },
    isJapanese: { type: "BOOLEAN" }
  },
};

// メタデータ抽出用のプロンプト
export const META_EXTRACTION_PROMPT = `
この論文PDFから以下の情報を取得し、JSON形式で出力してください。各項目には以下の内容を含めてください。
- 'title': 論文の正確なタイトル
- 'authors': 全ての著者の氏名をカンマ区切りで列挙
- 'journals': 掲載されているジャーナルまたは会議名
- 'year': 出版年（西暦）
- 'abstract': アブストラクトの全文
- 'isJapanese': 論文が日本語で記述されている場合は true、そうでない場合は false
`;

// アブストラクト翻訳用のプロンプト
export const ABSTRACT_TRANSLATION_PROMPT = (abstract) => `
以下のアブストラクトを、論文の文脈に沿った自然な日本語に翻訳してください。
翻訳されたアブストラクトの文章のみを出力し、元の文章の段落分けや改行を可能な限り維持してください。
${abstract}
`;

// 要約用のデフォルトプロンプト
export const DEFAULT_SUMMARY_PROMPT = `
与えられた論文のPDF資料の内容のみに基づき、以下の見出しに対応する内容をそれぞれ簡潔に要約してください。
各セクションの要約文のみを出力し、指定された見出し（###）のMarkdown形式を完全に維持してください。
PDF資料中に対応するセクションが明確に存在しない場合は、その見出しと空の要約文を出力してください。

### 背景
論文の背景や研究の動機に関する要約文。
### 目的
研究の目的や問いに関する要約文。
### 実装・実験方法（提案）
提案手法、実験設定、データセットなどに関する要約文。
### 結果
主要な実験結果や発見に関する要約文。
### 結論
論文の結論や貢献に関する要約文。
### 議論
結果の考察、限界、今後の展望などに関する要約文。
`;