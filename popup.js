import { getCurrentTabPdf } from "./utils/pdf.js";
import {
  META_EXTRACTION_PROMPT,
  PAPER_META_SCHEMA,
  ABSTRACT_TRANSLATION_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  READABLE_META_EXTRACTION_PROMPT,
  READABLE_SUMMARY_PROMPT
} from "./utils/prompts.js";

// popup.js

document.addEventListener("DOMContentLoaded", () => {
  const sendToNotionBtn = document.getElementById("sendToNotionBtn");
  const progress = document.getElementById("progress");
  const result = document.getElementById("result");

  let selectedPdfFile = null;

  // ページロード時に現在のタブからPDFを取得
  getCurrentTabPdf(result, progress).then(file => {
    selectedPdfFile = file;
  });

  sendToNotionBtn.addEventListener("click", async () => {
    // PDFがまだ取得されていない場合、再取得を試みる
    if (!selectedPdfFile) {
      selectedPdfFile = await getCurrentTabPdf(result, progress);
      if (!selectedPdfFile) {
        result.textContent = "PDFファイルが取得できませんでした。現在のタブがPDFであることを確認してください。";
        return;
      }
    }

    progress.textContent = "Notion送信処理を開始します...";
    result.textContent = "";

    // PDFがReadable形式かどうかを判定（ファイル名が"al-"で始まる場合）
    const isReadableFormat = selectedPdfFile.name.startsWith("al-");

    // 使用するプロンプトを選択
    const metaExtractionPrompt = isReadableFormat ? READABLE_META_EXTRACTION_PROMPT : META_EXTRACTION_PROMPT;
    const summaryPromptDefault = isReadableFormat ? READABLE_SUMMARY_PROMPT : DEFAULT_SUMMARY_PROMPT;

    // 設定値取得
    chrome.storage.local.get([
      "geminiApiKey",
      "notionApiKey",
      "notionDatabaseId",
      "customPrompt"
    ], async (config) => {
      try {
        // 1. メタデータ抽出: Geminiでメタデータ抽出
        progress.textContent = "Geminiでメタデータ抽出中...";
        const { sendPrompt } = await import("./utils/gemini.js");

        let metaRaw = await sendPrompt(selectedPdfFile, metaExtractionPrompt, PAPER_META_SCHEMA);
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

        // 2. DOIとメタデータの補完: Crossref/arXivでDOI検索・補完
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
            progress.textContent = "Crossrefからメタデータを取得し補完しました";
          } else {
            progress.textContent = "タイトル類似度が低いためDOIを採用しませんでした";
          }
        } else {
          progress.textContent = "CrossrefでDOIが見つかりませんでした";
        }

        // 3. アブストラクトの翻訳
        if (meta.abstract && meta.abstract.trim()) {
          if (!meta.isJapanese) {
            // 日本語でない場合、Geminiで翻訳
            progress.textContent = "アブストラクトの翻訳中...";
            try {
              // 元のアブストラクトを保存
              meta.originalAbstract = meta.abstract;

              // 翻訳実行
              meta.abstract = await sendPrompt(null, ABSTRACT_TRANSLATION_PROMPT(meta.abstract));
              progress.textContent = "アブストラクトの翻訳が完了しました";
            } catch (e) {
              progress.textContent = "アブストラクトの翻訳に失敗しました: " + e.message;
            }
          }
        }

        // 4. 論文要約: Geminiで要約取得
        progress.textContent = "Geminiで論文要約中...";
        let summary = "";
        try {
          // カスタムプロンプトがあればそれを使用、なければデフォルトプロンプトを使用
          const summaryPrompt = config.customPrompt || summaryPromptDefault;
          summary = await sendPrompt(selectedPdfFile, summaryPrompt);
          progress.textContent = "論文内容の要約が完了しました";
        } catch (e) {
          result.textContent = "Gemini APIから要約を取得できませんでした。" + e.message;
          progress.textContent = "";
          return;
        }

        // journals（ジャーナル名）が100文字を超える場合は切り詰め
        if (meta.journals && typeof meta.journals === "string" && meta.journals.length > 100) {
          meta.journals = meta.journals.slice(0, 100);
        }

        // 5. Notionへの送信: PDFアップロード、メタデータ・要約を送信
        progress.textContent = "NotionにPDFアップロード中...";
        const { uploadFileToNotion } = await import("./utils/notion.js");
        const pdfBytes = await selectedPdfFile.arrayBuffer();
        const pdfName = selectedPdfFile.name;
        const pdfContentType = selectedPdfFile.type || "application/pdf";

        let pdfFileUploadId = null;
        if (config.notionApiKey) {
          try {
            const uploadResult = await uploadFileToNotion(pdfBytes, pdfName, pdfContentType, config.notionApiKey);
            if (!uploadResult.success) {
              result.textContent = "NotionへのPDFアップロードに失敗しました: " + uploadResult.message;
              progress.textContent = "";
              return;
            }
            pdfFileUploadId = uploadResult.fileUploadId;
            progress.textContent = "PDFのアップロードが完了しました";
          } catch (e) {
            result.textContent = "NotionへのPDFアップロードに失敗しました: " + (e.message || e);
            progress.textContent = "";
            return;
          }
        } else {
          progress.textContent = "Notion APIキーが未設定のため、PDFはアップロードされません。";
          result.textContent = "オプションでNotion APIキーを設定してください。";
          return;
        }

        progress.textContent = "メタデータと要約をNotionに送信中...";
        const { sendToNotion } = await import("./utils/notion.js");
        const notionResult = await sendToNotion(meta, summary, pdfFileUploadId, pdfName, config.notionApiKey, config.notionDatabaseId);

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

  // 設定画面を開く
  const openOptionsBtn = document.getElementById("openOptions");
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
});
