# Paper2Notion Extension

📚 論文PDFからメタデータと要約を自動抽出し、Notionデータベースに保存するChrome拡張機能

![Paper2Notion Extension](icon.png)

## ✨ 主な機能

- **📄 メタデータ自動抽出**: タイトル、著者、ジャーナル、出版年、アブストラクトを自動取得
- **🤖 AI要約生成**: Gemini APIによる構造化された論文要約
- **🌐 多言語対応**: 英語・日本語論文、Readable形式PDFに対応
- **📚 Notion連携**: ワンクリックでNotionデータベースに保存

## 📋 必要な準備

### 1. Gemini API キーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 生成されたAPIキーをコピーして保存

### 2. Notion API の設定

#### Integration作成
1. [Notion Integrations](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 統合名を入力（例：Paper2Notion）
4. 「Submit」で作成
5. 「Internal Integration Token」をコピー保存

#### データベース作成
1. Notionで新しいデータベースを作成
2. 以下のプロパティを追加：
   - **Title** (タイトル型): 論文タイトル
   - **Authors** (マルチセレクト型): 著者
   - **Journal** (テキスト型): ジャーナル
   - **Year** (数値型): 出版年
   - **Abstract** (テキスト型): アブストラクト
   - **Summary** (テキスト型): 要約
   - **PDF** (ファイル型): PDFファイル

3. データベースにIntegrationを接続
   - データベースページで「...」→「Connections」→「Connect to」
   - 作成したIntegrationを選択

4. Database IDを取得
   - データベースURL: `https://www.notion.so/workspace/[Database ID]?v=...`
   - 32文字の英数字文字列をコピー

## 📥 インストール

1. このリポジトリをクローン
2. `chrome://extensions/` を開く
3. 「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」でフォルダを選択

## ⚙️ 設定

1. 拡張機能アイコンを右クリック→「オプション」
2. 各項目を入力：
   - **Gemini API Key**: 取得したAPIキー
   - **Notion Integration Token**: 取得したトークン
   - **Notion Database ID**: データベースID
3. 「設定を保存」をクリック

## 📖 使用方法

### 基本的な流れ

1. **拡張機能を起動**
   - Chromeツールバーの📄アイコンをクリック

2. **処理実行**
   - 「Notionに送信」をクリック
   - 処理状況が表示されます（通常1-5分）

3. **完了確認**
   - Notionデータベースに新しいページが作成されます

### 対応ファイル

- **標準PDF**: 一般的な学術論文
- **Readable形式**: 日英対訳PDF（`al-`で始まるファイル名）
- **ファイルサイズ**: 最大50MB

### 処理時間の目安

- 小さなPDF（<5MB）: 1-2分
- 中程度のPDF（5-20MB）: 2-5分
- 大きなPDF（20-50MB）: 5-10分

## 🔧 トラブルシューティング

### よくある問題

#### 「PDFファイルが取得できませんでした」
- ページを再読み込みしてから再試行
- PDFが完全に読み込まれるまで待機

#### 「API設定が不正です」
- APIキーとDatabase IDを再確認
- Notion IntegrationがデータベースにConnectされているか確認

#### ローカルファイルが選択できない
- ファイルサイズが50MB以下か確認
- PDFファイルが破損していないか確認

### file://権限設定（ローカルファイル用）
1. `chrome://extensions/` を開く
2. Paper2Notionの「詳細」をクリック
3. 「ファイルのURLへのアクセスを許可する」を有効化

## 🛠️ 開発者向け情報

### 開発環境セットアップ
```bash
git clone https://github.com/PMGWork/paper2notion-extension.git
cd paper2notion-extension
npm install
npm run build-css
```

### カスタマイズ
- **プロンプト**: `utils/prompts.js` を編集
- **Notionページ構造**: `utils/notion.js` の `createNotionPage` 関数を編集

---

**Paper2Notion Extension** - 論文管理をもっと効率的に 📚✨