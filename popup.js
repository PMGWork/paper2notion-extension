// popup.js

import { getCurrentTabPdf, processLocalPdf } from "./utils/pdf.js";

document.addEventListener("DOMContentLoaded", () => {
  const sendToNotionBtn = document.getElementById("sendToNotionBtn");
  const progress = document.getElementById("progress");
  const result = document.getElementById("result");
  const pdfFileInput = document.getElementById("pdfFileInput");
  const browserFileInfo = document.getElementById("browser-file-info");
  const localFileInfo = document.getElementById("local-file-info");

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
  let currentSource = 'browser';

  // タブ機能の実装
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // タブの切り替え
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`${targetTab}-tab`).classList.add('active');

      // 現在のソースを更新
      currentSource = targetTab;
      selectedPdfFile = null; // ファイル選択をリセット

      // UI状態をリセット
      if (targetTab === 'browser') {
        loadBrowserPdf();
      } else {
        localFileInfo.textContent = "PDFファイルを選択してください";
        pdfFileInput.value = "";
      }
    });
  });

  // ローカルファイル選択の処理
  pdfFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      selectedPdfFile = await processLocalPdf(file, result, localFileInfo);
      if (selectedPdfFile) {
        const sizeInMB = (selectedPdfFile.size / (1024 * 1024)).toFixed(2);
        localFileInfo.textContent = `選択中: ${selectedPdfFile.name} (${sizeInMB}MB)`;
        result.textContent = ""; // エラーメッセージをクリア
      }
    } else {
      selectedPdfFile = null;
      localFileInfo.textContent = "PDFファイルを選択してください";
    }
  });

  // ブラウザPDFの読み込み
  async function loadBrowserPdf() {
    browserFileInfo.textContent = "現在のタブからPDFを取得しています...";

    // 現在のタブ情報を取得
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    // file://スキームの場合は特別な説明を表示
    if (activeTab && activeTab.url && activeTab.url.startsWith('file://')) {
      browserFileInfo.textContent = "ローカルファイル（file://）を検出しました。処理中...";
    }

    selectedPdfFile = await getCurrentTabPdf(result, browserFileInfo);
    if (selectedPdfFile) {
      const sizeInMB = (selectedPdfFile.size / (1024 * 1024)).toFixed(2);
      browserFileInfo.textContent = `選択中: ${selectedPdfFile.name} (${sizeInMB}MB)`;
      result.textContent = ""; // エラーメッセージをクリア
    } else if (activeTab && activeTab.url && activeTab.url.startsWith('file://')) {
      // file://スキームでエラーが発生した場合の追加説明
      if (!result.textContent.includes("ファイルのURLへのアクセスを許可する")) {
        result.textContent += "\n\n設定方法：\n1. chrome://extensions/ を開く\n2. Paper2Notionの「詳細」をクリック\n3. 「ファイルのURLへのアクセスを許可する」をONにする";
      }
    }
  }

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

  // 初期状態でブラウザPDFを読み込み
  loadBrowserPdf();

  sendToNotionBtn.addEventListener("click", async () => {
    // 現在のソースに応じてPDFファイルを取得
    if (currentSource === 'browser') {
      if (!selectedPdfFile) {
        selectedPdfFile = await getCurrentTabPdf(result, browserFileInfo);
      }
    } else if (currentSource === 'local') {
      if (!selectedPdfFile && pdfFileInput.files[0]) {
        selectedPdfFile = await processLocalPdf(pdfFileInput.files[0], result, localFileInfo);
      }
    }

    // PDFファイルの確認
    if (!selectedPdfFile) {
      if (currentSource === 'browser') {
        result.textContent = "PDFファイルが取得できませんでした。現在のタブがPDFであることを確認してください。";
      } else {
        result.textContent = "PDFファイルを選択してください。";
      }
      return;
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
