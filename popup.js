// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const pdfInput = document.getElementById("pdfInput");
  const dropboxAuthBtn = document.getElementById("dropboxAuthBtn");
  const sendToNotionBtn = document.getElementById("sendToNotionBtn");
  const progress = document.getElementById("progress");
  const result = document.getElementById("result");
  const dropboxStatus = document.getElementById("dropboxStatus");

  let selectedPdfFile = null;

  pdfInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      selectedPdfFile = e.target.files[0];
      progress.textContent = `選択中: ${selectedPdfFile.name}`;
      result.textContent = "";
    } else {
      selectedPdfFile = null;
      progress.textContent = "";
    }
  });

  dropboxAuthBtn.addEventListener("click", async () => {
    progress.textContent = "Dropbox認証処理を開始します...";
    // Dropbox OAuth認証処理
    const { getAuthUrl, getAccessToken } = await import("./utils/dropbox.js");
    const authUrl = await getAuthUrl();

    // chrome.identity.launchWebAuthFlowでOAuthフローを実行
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true
      },
      async (redirectUrl) => {
        if (chrome.runtime.lastError || !redirectUrl) {
          progress.textContent = "Dropbox認証に失敗しました";
          return;
        }
        // ?code=... を抽出
        const urlObj = new URL(redirectUrl);
        const code = urlObj.searchParams.get("code");
        if (!code) {
          progress.textContent = "Dropbox認証コードが取得できませんでした";
          return;
        }
        progress.textContent = "Dropboxアクセストークン取得中...";
        const accessToken = await getAccessToken(code);
        if (accessToken) {
          chrome.storage.local.set({ dropboxAccessToken: accessToken }, () => {
            dropboxStatus.textContent = "Dropbox認証済み";
            progress.textContent = "Dropbox認証が完了しました";
          });
        } else {
          progress.textContent = "Dropboxアクセストークン取得に失敗しました";
        }
      }
    );
  });

  sendToNotionBtn.addEventListener("click", async () => {
    if (!selectedPdfFile) {
      result.textContent = "PDFファイルを選択してください。";
      return;
    }
    progress.textContent = "Notion送信処理を開始します...";
    result.textContent = "";

    // 設定値取得
    chrome.storage.local.get([
      "geminiApiKey",
      "notionApiKey",
      "notionDatabaseId",
      "dropboxAppKey",
      "dropboxAppSecret",
      "dropboxRedirectUri"
    ], async (config) => {
      try {
        // 1. Geminiでメタデータ抽出
        progress.textContent = "Geminiでメタデータ抽出中...";
        const { sendPrompt } = await import("./utils/gemini.js");

        const metaPrompt = "この論文PDFから以下の情報を取得し、JSON形式で出力してください。'title', 'authors', 'journals', 'year', 'abstract'";

        const paperMetaSchema = {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            authors: { type: "STRING" },
            journals: { type: "STRING" },
            year: { type: "INTEGER" },
            abstract: { type: "STRING" }
          },
        };

        let metaRaw = await sendPrompt(selectedPdfFile, metaPrompt, paperMetaSchema);
        let meta = {};
        try {
          if (typeof metaRaw === "string") {
            meta = JSON.parse(metaRaw);
          } else if (typeof metaRaw === "object") {
            meta = metaRaw;
          }
        } catch (e) {
          meta = {};
        }
        if (!meta.title) {
          result.textContent = "Gemini APIからメタデータを取得できませんでした。";
          progress.textContent = "";
          return;
        }

        // 2. Crossref/arXivでDOI検索・補完
        progress.textContent = "CrossrefでDOI検索中...";
        const { searchDoiByTitle, getMetadataFromDoi, isSimilar } = await import("./utils/metadata.js");
        let doi = null;
        if (meta && meta.title) {
          doi = await searchDoiByTitle(meta.title);
        }
        let metaCrossref = null;
        if (doi) {
          metaCrossref = await getMetadataFromDoi(doi);
          if (metaCrossref && isSimilar(meta.title, metaCrossref.title, 0.8)) {
            // Crossrefのabstractが空ならGemini抽出値を維持
            if (!metaCrossref.abstract && meta.abstract) {
              metaCrossref.abstract = meta.abstract;
            }
            Object.assign(meta, metaCrossref);
          }
        }

        // 3. Dropboxアップロード
        progress.textContent = "DropboxにPDFアップロード中...";
        const { uploadAndGetSharedLink } = await import("./utils/dropbox.js");
        const pdfBytes = await selectedPdfFile.arrayBuffer();
        const pdfName = selectedPdfFile.name;
        const dropboxFolder = "Paper2Notion_Uploads";

        let pdfPublicUrl = null;
        const tokenResponse = await new Promise(resolve => chrome.storage.local.get("dropboxAccessToken", resolve));
        const dropboxAccessToken = tokenResponse.dropboxAccessToken;

        if (dropboxAccessToken) {
          try {
            pdfPublicUrl = await uploadAndGetSharedLink(pdfBytes, pdfName, dropboxFolder, dropboxAccessToken);
          } catch (e) {
            result.textContent = "DropboxへのPDFアップロードに失敗しました: " + (e.message || e);
            progress.textContent = "";
            return;
          }
          if (!pdfPublicUrl) {
            result.textContent = "DropboxへのPDFアップロードに失敗しました。アクセストークンが有効か確認してください。";
            progress.textContent = "";
            return;
          }
        } else {
          progress.textContent = "Dropbox未認証のため、PDFはアップロードされません。";
          result.textContent = "Dropboxに認証してください。";
        }

        // 4. Geminiで要約取得
        progress.textContent = "Geminiで論文要約中...";
        const summaryPrompt = (
          "#与えられた論文のPDF資料をもとに、以下の内容のみを出力してください。\n" +
          "### 背景\n" +
          "背景の要約文を入力する\n" +
          "### 目的\n" +
          "目的の要約文を入力する\n" +
          "### 実装・実験方法（提案）\n" +
          "実装・実験方法（提案）の要約文を入力する\n" +
          "### 結果\n" +
          "結果の要約文を入力する\n" +
          "### 結論\n" +
          "結論の要約文を入力する\n" +
          "### 議論\n" +
          "議論の要約文を入力する\n"
        );
        let summary = "";
        try {
          summary = await sendPrompt(selectedPdfFile, summaryPrompt);
        } catch (e) {
          result.textContent = "Gemini APIから要約を取得できませんでした。" + e.message;
          // progress.textContent = ""; // 要約取得失敗でもNotion送信は試みる場合、コメントアウト
        }

        // 5. Notion送信
        // journals（ジャーナル名）が100文字を超える場合は切り詰め
        if (meta.journals && typeof meta.journals === "string" && meta.journals.length > 100) {
          meta.journals = meta.journals.slice(0, 100);
        }
        progress.textContent = "Notionに送信中...";
        const { sendToNotion } = await import("./utils/notion.js");
        const notionResult = await sendToNotion(meta, summary, pdfPublicUrl, pdfName, config.notionApiKey, config.notionDatabaseId);

        if (notionResult.success) {
          progress.textContent = "";
          result.textContent = "Notionへの送信に成功しました";
        } else {
          progress.textContent = "";
          result.textContent = notionResult.message;
        }
      } catch (e) {
        progress.textContent = "";
        result.textContent = "エラー: " + e.message;
      }
    });
  });
});
