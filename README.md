# Paper2Notion Extension

このChrome拡張機能は、閲覧中の論文PDFからメタデータと要約を抽出し、Notionデータベースに自動で保存するツールです。

## 機能

-   **論文メタデータ抽出**: 論文PDFからタイトル、著者、ジャーナル、出版年、アブストラクトなどのメタデータを抽出します（Gemini APIを使用）。
-   **論文要約生成**: 論文の内容に基づいて要約を生成します（Gemini APIを使用）。
-   **Readable形式PDF対応**: ファイル名が `al-` で始まるReadableで翻訳されたPDFの形式に対応し、日本語訳と英語原文を考慮した情報抽出・要約を行います。
-   **Gemini 2.5 Flash Non-reasoningモード**: Gemini 2.5 Flashモデル使用時に、より高速な応答のためのNon-reasoningモードを選択できます。
-   **Notion連携**: 抽出したメタデータ、生成した要約、および論文PDFファイルを指定したNotionデータベースに保存します。

## インストール

この拡張機能はChromeウェブストアでは公開されていません。以下の手順で手動でインストールしてください。

1.  このリポジトリをクローンまたはダウンロードします。
2.  Chromeブラウザを開き、アドレスバーに `chrome://extensions` と入力して拡張機能ページを開きます。
3.  ページの右上にある「デベロッパーモード」をオンにします。
4.  「パッケージ化されていない拡張機能を読み込む」ボタンをクリックします。
5.  クローンまたはダウンロードしたリポジトリのフォルダを選択します。
6.  拡張機能が読み込まれ、Chromeのツールバーにアイコンが表示されます。

## 設定

拡張機能を使用するには、Gemini APIとNotion APIの設定が必要です。

1.  Chromeのツールバーにある拡張機能アイコンをクリックします。
2.  表示されるポップアップの右下にある「設定を開く」ボタンをクリックします。
3.  設定ページで以下の情報を入力します。
    -   **Gemini API Key**: Google AI Studioで取得したAPIキー。
        -   [Google AI StudioでAPIキーを取得](https://makersuite.google.com/app/apikey)
    -   **Gemini モデル**: 使用するGeminiモデルを選択します。
    -   **Non-reasoningモードを使用する**: Gemini 2.5 Flash選択時のみ表示されます。高速化したい場合にチェックを入れます。
    -   **Notion API Key**: Notion Integrationで取得したAPIキー。
        -   [Notion Integrationを作成](https://www.notion.so/my-integrations)
    -   **Notion Database ID**: 情報を保存したいNotionデータベースのID。
        -   NotionデータベースのURL (`https://www.notion.so/workspace/[ここがDatabase ID]?v=...`) から取得できます。
    -   **カスタムプロンプト（論文要約用）**: 論文要約に使用する独自のプロンプトを指定できます。空白の場合はデフォルトのプロンプトが使用されます。
4.  入力後、「設定を保存」ボタンをクリックします。

## 使用方法

1.  ブラウザで論文PDFを開きます。
2.  Chromeのツールバーにある拡張機能アイコンをクリックします。
3.  PDFが認識されると、ポップアップに情報が表示されます。
4.  「Notionに送信」ボタンをクリックすると、設定したNotionデータベースに論文のメタデータ、要約、およびPDFファイルが保存されます。

## 開発者向け情報

-   `utils/prompts.js`: Gemini APIに送信するプロンプトを管理します。Readable形式用のプロンプトも含まれます。
-   `utils/gemini.js`: Gemini APIとの通信を担当します。PDFの内容をBase64エンコードして送信し、レスポンスを処理します。
-   `utils/notion.js`: Notion APIとの通信を担当します。ファイルのアップロードやページの作成を行います。
-   `options.html`, `options.js`, `utils/optionsStorage.js`: 拡張機能の設定画面と、設定値の保存・読み込みを扱います。
-   `popup.html`, `popup.js`: 拡張機能のポップアップUIと、Notion送信処理のメインロジックを扱います。

## ライセンス

[TODO: プロジェクトのライセンスを記載]

## 貢献

[TODO: 貢献方法を記載（必要な場合）]