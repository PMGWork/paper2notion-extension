# Paper2Notion Extension

論文PDFからメタデータと要約を自動抽出し、Notionデータベースに保存するChrome拡張機能です。

![Paper2Notion Extension](icon.png)

## 🚀 主な機能

- **📄 論文メタデータ自動抽出**: タイトル、著者、ジャーナル、出版年、アブストラクトを自動抽出
- **🤖 AI要約生成**: Gemini APIを使用した高品質な論文要約の生成
- **🌐 多言語対応**: 日本語翻訳版PDF（Readable形式）にも対応
- **📚 Notion連携**: 抽出データとPDFファイルを自動でNotionデータベースに保存
- **⚡ 高速処理**: Gemini 2.5 Flash Non-reasoningモードによる高速処理
- **🔧 カスタマイズ可能**: 要約プロンプトのカスタマイズが可能

## 📋 必要な準備

### 1. APIキーの取得

#### Gemini API Key
1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 生成されたAPIキーをコピーして保存

#### Notion API Key
1. [Notion Integrations](https://www.notion.so/my-integrations)にアクセス
2. 「New integration」をクリック
3. 統合名を入力（例：Paper2Notion）
4. ワークスペースを選択
5. 「Submit」をクリック
6. 生成された「Internal Integration Token」をコピーして保存

### 2. Notionデータベースの準備

1. Notionで新しいデータベースを作成
2. 以下のプロパティを追加（推奨）：
   - **Title**（タイトル）: タイトル
   - **Authors**（マルチセレクト）: 著者
   - **Journal**（テキスト）: ジャーナル
   - **Year**（数値）: 出版年
   - **Abstract**（テキスト）: アブストラクト
   - **Summary**（テキスト）: 要約
   - **PDF**（ファイル）: PDFファイル
3. データベースページで「...」→「Connections」→「Connect to」から作成したIntegrationを追加
4. データベースURLからDatabase IDを取得
   ```
   https://www.notion.so/workspace/[ここがDatabase ID]?v=...
   ```

## 🔧 インストール方法

### ステップ1: ソースコードの取得

```bash
# GitHubからクローン
git clone https://github.com/your-username/paper2notion-extension.git

# または、ZIPファイルをダウンロードして解凍
```

### ステップ2: Chrome拡張機能として読み込み

1. **Chromeブラウザを開く**

2. **拡張機能ページにアクセス**
   - アドレスバーに `chrome://extensions` と入力してEnter
   - または、Chrome メニュー → その他のツール → 拡張機能

3. **デベロッパーモードを有効化**
   - ページ右上の「デベロッパーモード」トグルをONにする

4. **拡張機能を読み込み**
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - ダウンロードした `paper2notion-extension` フォルダを選択
   - 「フォルダーを選択」をクリック

5. **インストール完了**
   - Chromeツールバーに📄アイコンが表示されます
   - 拡張機能一覧に「Paper2Notion」が追加されます

## ⚙️ 初期設定

### ステップ1: 設定画面を開く

1. Chromeツールバーの📄アイコンをクリック
2. ポップアップ右下の「設定を開く」ボタンをクリック

### ステップ2: API設定

1. **Gemini API Key**
   - 取得したGemini APIキーを入力
   - 使用するモデルを選択（推奨：gemini-2.0-flash-exp）
   - 高速化したい場合は「Non-reasoningモードを使用する」にチェック

2. **Notion API Key**
   - 取得したNotion Integration Tokenを入力

3. **Notion Database ID**
   - 準備したNotionデータベースのIDを入力

4. **カスタムプロンプト（オプション）**
   - 要約生成用の独自プロンプトを設定可能
   - 空白の場合はデフォルトプロンプトを使用

5. **「設定を保存」をクリック**

## 📖 使用方法

### 基本的な使い方

1. **論文PDFを開く**
   - Chromeブラウザで論文PDFファイルを開く
   - arXiv、Google Scholar、大学のリポジトリなど、どのサイトでもOK

2. **拡張機能を起動**
   - Chromeツールバーの📄アイコンをクリック
   - PDFが認識されると、ファイル名が表示されます

3. **Notionに送信**
   - 「Notionに送信」ボタンをクリック
   - 処理が開始され、進捗が表示されます

4. **処理完了を確認**
   - 処理完了後、Notionデータベースに新しいページが作成されます
   - 抽出されたメタデータ、要約、PDFファイルが保存されます

### 処理の流れ

```
📄 PDF読み込み → 🤖 メタデータ抽出 → 📝 要約生成 → 📚 Notion保存
```

1. **PDFファイル解析**（約10-20秒）
2. **メタデータ抽出**（約15-30秒）
3. **要約生成**（約20-40秒）
4. **Notion保存**（約5-10秒）

### 対応ファイル形式

- **標準PDF**: 一般的な論文PDF
- **Readable形式**: ファイル名が `al-` で始まる日本語翻訳PDF
  - 日本語訳と英語原文の両方を考慮した処理

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 「PDFファイルが取得できませんでした」
- **原因**: PDFが正しく読み込まれていない
- **解決方法**:
  - ページを再読み込みしてから再試行
  - PDFが完全に読み込まれるまで待機
  - 別のPDFで試してみる

#### 「API設定が不正です」
- **原因**: APIキーまたはDatabase IDが間違っている
- **解決方法**:
  - 設定画面でAPIキーを再確認
  - Database IDが正しいか確認
  - Notion IntegrationがデータベースにConnectされているか確認

#### 「処理がタイムアウトしました」
- **原因**: PDFが大きすぎるか、APIの応答が遅い
- **解決方法**:
  - 小さなPDFで試してみる
  - しばらく時間をおいてから再試行
  - Non-reasoningモードを有効にして高速化

#### 「Notionデータベースにアクセスできません」
- **原因**: Integration権限の設定不備
- **解決方法**:
  - Notionデータベースの「Connections」設定を確認
  - Integrationが正しく追加されているか確認
  - Database IDが正確か再確認

## 🛠️ 開発者向け情報

### プロジェクト構造

```
paper2notion-extension/
├── manifest.json          # 拡張機能の設定
├── popup.html             # ポップアップUI
├── popup.js               # ポップアップロジック
├── options.html           # 設定画面UI
├── options.js             # 設定画面ロジック
├── background.js          # バックグラウンド処理
├── icons/                 # アイコンファイル
└── utils/                 # ユーティリティモジュール
    ├── gemini.js          # Gemini API通信
    ├── notion.js          # Notion API通信
    ├── pdf.js             # PDF処理
    ├── prompts.js         # AIプロンプト管理
    ├── metadata.js        # メタデータ処理
    └── optionsStorage.js  # 設定保存
```

### 主要ファイルの説明

- **`utils/prompts.js`**: Gemini APIに送信するプロンプトテンプレート
- **`utils/gemini.js`**: Gemini APIとの通信、PDFのBase64エンコード処理
- **`utils/notion.js`**: Notion APIとの通信、ファイルアップロード、ページ作成
- **`background.js`**: バックグラウンドでの非同期処理管理

### カスタマイズ

#### プロンプトのカスタマイズ
`utils/prompts.js`を編集することで、メタデータ抽出や要約生成のプロンプトをカスタマイズできます。

#### Notionデータベース構造のカスタマイズ
`utils/notion.js`の`createNotionPage`関数を編集することで、Notionページの構造をカスタマイズできます。

## 📄 ライセンス

MIT License

## 🤝 貢献

プルリクエストやイシューの報告を歓迎します。

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

問題が発生した場合は、[Issues](https://github.com/your-username/paper2notion-extension/issues)で報告してください。

---

**Paper2Notion Extension** - 論文管理をもっと効率的に 📚✨