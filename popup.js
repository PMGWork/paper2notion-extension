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

  // 進捗バーを作成
  const progressBar = document.createElement("progress");
  progressBar.id = "progressBar";
  progressBar.max = 100;
  progressBar.value = 0;
  progressBar.style.width = "100%";
  progressBar.style.marginTop = "10px";
  progressBar.style.display = "none";
  progress.parentNode.insertBefore(progressBar, progress.nextSibling);

  let selectedPdfFile = null;
  let processingState = null;

  // 処理状態の更新を反映
  function updateUI(state) {
    processingState = state;

    if (state.isProcessing) {
      sendToNotionBtn.disabled = true;
      sendToNotionBtn.textContent = "処理中...";
      progressBar.style.display = "block";
      progressBar.value = state.progress;
      progress.textContent = state.currentStep;
      if (state.pdfFileName) {
        progress.textContent += `\n処理中のファイル: ${state.pdfFileName}`;
      }
      result.textContent = "";
    } else {
      sendToNotionBtn.disabled = false;
      sendToNotionBtn.textContent = "Notionに送信";

      if (state.progress === 100) {
        progressBar.style.display = "block";
        progressBar.value = state.progress;
      } else {
        progressBar.style.display = "none";
      }

      progress.textContent = "";

      if (state.error) {
        result.textContent = state.error;
        if (state.pdfFileName) {
          result.textContent += `\nファイル: ${state.pdfFileName}`;
        }
      } else if (state.result) {
        result.textContent = state.result;
        if (state.pdfFileName) {
          result.textContent += `\nファイル: ${state.pdfFileName}`;
        }
      }
    }
  }

  // バックグラウンドから処理状態を取得
  chrome.runtime.sendMessage({ type: 'getProcessingState' }, (response) => {
    if (response && response.state) {
      updateUI(response.state);
    }
  });

  // バックグラウンドからの状態更新メッセージをリッスン
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'processingStateUpdate') {
      updateUI(message.state);
    }
    return true;
  });

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
    progressBar.style.display = "block";
    progressBar.value = 0;

    // PDFファイルをBase64に変換
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];

      // バックグラウンドに処理を依頼
      chrome.runtime.sendMessage({
        type: 'startProcessing',
        pdfFile: {
          name: selectedPdfFile.name,
          data: base64
        }
      }, (response) => {
        if (response && response.success) {
          progress.textContent = "バックグラウンドで処理を開始しました";
          result.textContent = "拡張機能を閉じても処理は継続されます";
        } else if (response && response.error) {
          result.textContent = response.error;
          progress.textContent = "";
          progressBar.style.display = "none";
        } else {
          result.textContent = "処理の開始に失敗しました";
          progress.textContent = "";
          progressBar.style.display = "none";
        }
      });
    };
    reader.readAsDataURL(selectedPdfFile);
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
