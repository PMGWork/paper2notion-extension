// popup.js

import { getCurrentTabPdf } from "./utils/pdf.js";

document.addEventListener("DOMContentLoaded", () => {
  const sendToNotionBtn = document.getElementById("sendToNotionBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const progress = document.getElementById("progress");
  const result = document.getElementById("result");
  const browserFileInfo = document.getElementById("browser-file-info");

  let selectedPdfFile = null;
  let processingState = null;

  // ブラウザPDFの読み込み
  async function loadBrowserPdf() {
    // ローディング状態を表示
    browserFileInfo.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>現在のタブからPDFを取得しています...</span>
      </div>
    `;
    browserFileInfo.className = "bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 min-h-[3rem] flex items-center";

    // 現在のタブ情報を取得
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    // file://スキームの場合は特別な説明を表示
    if (activeTab && activeTab.url && activeTab.url.startsWith('file://')) {
      browserFileInfo.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          <span>ローカルファイル（file://）を検出しました。処理中...</span>
        </div>
      `;
    }

    selectedPdfFile = await getCurrentTabPdf(browserFileInfo, browserFileInfo);
    if (selectedPdfFile) {
      const sizeInMB = (selectedPdfFile.size / (1024 * 1024)).toFixed(2);
      browserFileInfo.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <div class="font-medium text-green-700">${selectedPdfFile.name}</div>
            <div class="text-xs text-green-600">${sizeInMB}MB</div>
          </div>
        </div>
      `;
      browserFileInfo.className = "bg-green-50 border border-green-200 rounded-lg p-3 text-sm min-h-[3rem] flex items-center";

      // エラーメッセージをクリア
      result.textContent = "";
      result.className = "min-h-[1.5rem]";
    } else {
      // エラーの場合、browserFileInfoにエラー状態を表示
      browserFileInfo.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm min-h-[3rem] flex items-center";
    }
  }

  function updateUI(state) {
    processingState = state;
    const isProcessing = state.isProcessing === true;

    if (sendToNotionBtn) {
      sendToNotionBtn.classList.toggle('hidden', isProcessing);
      sendToNotionBtn.disabled = isProcessing;
    }
    if (cancelBtn) {
      cancelBtn.classList.toggle('hidden', !isProcessing);
    }

    let progressMarkup = '';
    let progressClass = "mb-3 min-h-[1.5rem]";

    if (isProcessing) {
      if (cancelBtn) {
        const waiting = !!state.cancelRequested;
        cancelBtn.disabled = waiting;
        cancelBtn.classList.toggle('text-slate-600', !waiting);
        cancelBtn.classList.toggle('text-red-600', waiting);
        cancelBtn.classList.toggle('border-red-300', waiting);
        cancelBtn.innerHTML = waiting
          ? `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"/>
            </svg>
            <span>キャンセル処理中...</span>
          `
          : `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span>キャンセル</span>
          `;
      }

      const stepText = state.currentStep || '処理中です...';
      const fileLine = state.pdfFileName
        ? `<div class="text-xs text-blue-700 mt-2">処理中のファイル: ${state.pdfFileName}</div>`
        : '';
      progressMarkup = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>${stepText}</span>
        </div>
        ${fileLine}
      `;
      progressClass = "mb-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3 min-h-[1.5rem]";

      result.textContent = "";
      result.className = "min-h-[1.5rem]";
    } else {
      if (cancelBtn) {
        cancelBtn.disabled = true;
        cancelBtn.classList.remove('text-red-600', 'border-red-300');
        cancelBtn.classList.add('text-slate-600');
        cancelBtn.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <span>キャンセル</span>
        `;
      }

      let message = '';
      let iconClass = '';
      let iconPath = '';
      let bgClass = '';

      if (state.sendStatus === 'cancelled') {
        message = '処理をキャンセルしました';
        iconClass = 'text-slate-600';
        iconPath = 'M18 12H6';
        bgClass = 'text-slate-600 bg-slate-100 border border-slate-200';
      } else if (state.sendStatus === 'file_skipped') {
        message = 'ファイルサイズ超過のためメタデータのみ送信しました';
        iconClass = 'text-yellow-600';
        iconPath = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
        bgClass = 'text-yellow-600 bg-yellow-50 border border-yellow-200';
      } else if (state.sendStatus === 'failed') {
        message = '';
      } else if (state.result) {
        message = state.result;
        iconClass = 'text-green-600';
        iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
        bgClass = 'text-green-600 bg-green-50 border border-green-200';
      } else if (state.progress === 100) {
        message = '処理が完了しました';
        iconClass = 'text-green-600';
        iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
        bgClass = 'text-green-600 bg-green-50 border border-green-200';
      }

      if (message) {
        progressMarkup = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${iconClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
            </svg>
            <span>${message}</span>
          </div>
        `;
        progressClass = `mb-3 text-sm ${bgClass} rounded-lg p-3 flex items-center gap-2 min-h-[1.5rem]`;
      }

      if (state.error) {
        result.innerHTML = `
          <div class="flex items-start gap-2">
            <svg class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <div class="break-all whitespace-pre-line">${state.error}</div>
              ${state.pdfFileName ? `<div class="text-xs mt-1 opacity-75">ファイル: ${state.pdfFileName}</div>` : ''}
            </div>
          </div>
        `;
        result.className = "text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 min-h-[1.5rem]";
      } else {
        result.textContent = "";
        result.className = "min-h-[1.5rem]";
      }
    }

    if (progressMarkup) {
      progress.innerHTML = progressMarkup.trim();
      progress.className = progressClass;
    } else {
      progress.textContent = "";
      progress.className = "mb-3 min-h-[1.5rem]";
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

  if (cancelBtn) {
    cancelBtn.disabled = true;
    cancelBtn.classList.add('hidden');
  }

  sendToNotionBtn.addEventListener("click", async () => {
    // ブラウザからPDFファイルを取得
    if (!selectedPdfFile) {
      selectedPdfFile = await getCurrentTabPdf(browserFileInfo, browserFileInfo);
    }

    // PDFファイルの確認
    if (!selectedPdfFile) {
      browserFileInfo.innerHTML = `
        <div class="flex items-start gap-2">
          <svg class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>PDFファイルが取得できませんでした。現在のタブがPDFであることを確認してください。</div>
        </div>
      `;
      browserFileInfo.className = "text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 min-h-[3rem] flex items-center";
      return;
    }

    if (sendToNotionBtn) {
      sendToNotionBtn.classList.add('hidden');
      sendToNotionBtn.disabled = true;
    }
    if (cancelBtn) {
      cancelBtn.classList.remove('hidden');
    }

    // プログレス表示を開始
    progress.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <span>Notion送信処理を開始します...</span>
      </div>
    `;
    progress.className = "mb-3 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 min-h-[1.5rem]";

    result.textContent = "";
    result.className = "min-h-[1.5rem]";

    if (cancelBtn) {
      cancelBtn.disabled = false;
      cancelBtn.classList.remove('text-red-600', 'border-red-300');
      cancelBtn.classList.add('text-slate-600');
      cancelBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        <span>キャンセル</span>
      `;
    }

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
          result.textContent = "";
          result.className = "min-h-[1.5rem]";
        } else {
          if (sendToNotionBtn) {
            sendToNotionBtn.classList.remove('hidden');
            sendToNotionBtn.disabled = false;
          }
          if (cancelBtn) {
            cancelBtn.classList.add('hidden');
            cancelBtn.disabled = true;
          }
          progress.textContent = "";
          progress.className = "mb-3 min-h-[1.5rem]";
          result.innerHTML = `
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div>PDFファイルが取得できませんでした</div>
            </div>
          `;
          result.className = "text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 min-h-[1.5rem]";
        }
      });
    };
    reader.readAsDataURL(selectedPdfFile);
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (cancelBtn.disabled) {
        return;
      }
      cancelBtn.disabled = true;
      cancelBtn.classList.remove('text-slate-600');
      cancelBtn.classList.add('text-red-600', 'border-red-300');
      cancelBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"/>
        </svg>
        <span>キャンセル処理中...</span>
      `;

      progress.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"/>
          </svg>
          <span>キャンセル処理をリクエストしています...</span>
        </div>
      `;
      progress.className = "mb-3 text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg p-3 min-h-[1.5rem]";

      chrome.runtime.sendMessage({ type: 'cancelProcessing' }, (response) => {
        if (!response || !response.success) {
          cancelBtn.disabled = false;
          cancelBtn.classList.remove('text-red-600', 'border-red-300');
          cancelBtn.classList.add('text-slate-600');
          cancelBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span>キャンセル</span>
          `;
          result.innerHTML = `
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="break-all whitespace-pre-line">キャンセルに失敗しました${response && response.error ? `: ${response.error}` : ''}</div>
            </div>
          `;
          result.className = "text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 min-h-[1.5rem]";
        }
      });
    });
  }

  // 設定画面を開く
  const openOptionsBtn = document.getElementById("openOptions");
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
});
