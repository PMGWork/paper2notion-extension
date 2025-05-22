// background.js
// Service Workerとして動作し、バックグラウンドでPDF処理とNotion送信を行う

// 必要なモジュールを静的にインポート
import { getCurrentTabPdf } from "./utils/pdf.js";
import {
  META_EXTRACTION_PROMPT,
  PAPER_META_SCHEMA,
  ABSTRACT_TRANSLATION_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  READABLE_META_EXTRACTION_PROMPT,
  READABLE_SUMMARY_PROMPT
} from "./utils/prompts.js";
import { sendPrompt } from "./utils/gemini.js";
import { searchDoiByTitle, getMetadataFromDoi, isSimilar } from "./utils/metadata.js";
import { uploadFileToNotion, sendToNotion } from "./utils/notion.js";

// グローバル変数で処理状態を管理
let processingState = {
  isProcessing: false,
  currentStep: '',
  progress: 0,
  result: '',
  error: null,
  notionPageUrl: null,
  pdfFileName: null
};

// 処理状態を更新する関数
async function updateProcessingState(update) {
  const prevState = { ...processingState };
  processingState = { ...processingState, ...update };

  // 処理状態をchrome.storage.localに保存
  try {
    await chrome.storage.local.set({ processingState: processingState });
  } catch (e) {
    console.error('処理状態の保存に失敗しました:', e);
  }

  // 処理状態が変わった場合、ツールバーアイコンを更新
  if (prevState.isProcessing !== processingState.isProcessing) {
    const iconPath = processingState.isProcessing ?
      {
        16: 'icons/icon16_processing.png',
        32: 'icons/icon32_processing.png',
        48: 'icons/icon48_processing.png',
        128: 'icons/icon128_processing.png'
      } :
      {
        16: 'icons/icon16.png',
        32: 'icons/icon32.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png'
      };
    chrome.action.setIcon({
      path: iconPath
    });
  }

  // ポップアップが開いていれば状態を通知
  chrome.runtime.sendMessage({
    type: 'processingStateUpdate',
    state: processingState
  }).catch(() => {
    // ポップアップが閉じている場合はエラーが発生するが無視
    console.log('ポップアップが閉じているため状態更新メッセージを送信できませんでした');
  });

  // 重要な状態変化があればユーザーに通知
  if (update.currentStep && update.currentStep !== processingState.currentStep) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon.png'),
      title: 'Paper2Notion',
      message: update.currentStep
    });
  }

  // エラーがあれば通知
  if (update.error) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon.png'),
      title: 'Paper2Notion - エラー',
      message: update.error
    });
  }

  // 完了したら通知
  if (update.isProcessing === false && prevState.isProcessing === true) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon.png'),
      title: 'Paper2Notion',
      message: '処理が完了しました',
      buttons: [
        { title: 'Notionページを開く' }
      ]
    });
  }
}

// 通知のボタンクリックイベント
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0 && processingState.notionPageUrl) {
    chrome.tabs.create({ url: processingState.notionPageUrl });
  }
});

// PDFファイルの取得
async function getPdfFromTab() {
  try {
    return await getCurrentTabPdf(null, null);
  } catch (e) {
    console.error('PDFファイルの取得に失敗しました:', e);
    return null;
  }
}

// メイン処理関数
async function processAndSendToNotion(pdfFile) {
  try {
    updateProcessingState({
      isProcessing: true,
      currentStep: 'Notion送信処理を開始します...',
      progress: 0,
      error: null,
      result: '',
      notionPageUrl: null,
      pdfFileName: pdfFile.name
    });

    // 設定を取得
    const config = await new Promise((resolve) => {
      chrome.storage.local.get([
        "geminiApiKey",
        "notionApiKey",
        "notionDatabaseId",
        "customPrompt",
        "geminiModel"
      ], (result) => resolve(result));
    });

    if (!config.geminiApiKey) {
      throw new Error('Gemini APIキーが設定されていません');
    }

    if (!config.notionApiKey || !config.notionDatabaseId) {
      throw new Error('Notion APIキーまたはデータベースIDが設定されていません');
    }

    // PDFがReadable形式かどうかを判定
    const isReadableFormat = pdfFile.name.startsWith("al-");

    // 使用するプロンプトを選択
    const metaExtractionPrompt = isReadableFormat ? READABLE_META_EXTRACTION_PROMPT : META_EXTRACTION_PROMPT;
    const summaryPromptDefault = isReadableFormat ? READABLE_SUMMARY_PROMPT : DEFAULT_SUMMARY_PROMPT;

    // 1. メタデータ抽出
    updateProcessingState({ currentStep: 'Geminiでメタデータ抽出中...', progress: 10 });
    let metaRaw = await sendPrompt(pdfFile, metaExtractionPrompt, PAPER_META_SCHEMA);
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
      throw new Error("Gemini APIからメタデータを取得できませんでした。");
    }

    // 2. DOIとメタデータの補完
    updateProcessingState({ currentStep: 'CrossrefでDOI検索中...', progress: 30 });
    let doi = null;
    if (meta && meta.title) {
      doi = await searchDoiByTitle(meta.title);
    }

    let metaCrossref = null;
    if (doi) {
      metaCrossref = await getMetadataFromDoi(doi);
      if (metaCrossref && isSimilar(meta.title, metaCrossref.title, 0.8)) {
        if (!metaCrossref.abstract && meta.abstract) {
          metaCrossref.abstract = meta.abstract;
        }
        Object.assign(meta, metaCrossref);
        updateProcessingState({ currentStep: 'Crossrefからメタデータを取得し補完しました', progress: 40 });
      } else {
        updateProcessingState({ currentStep: 'タイトル類似度が低いためDOIを採用しませんでした', progress: 40 });
      }
    } else {
      updateProcessingState({ currentStep: 'CrossrefでDOIが見つかりませんでした', progress: 40 });
    }

    // 3. アブストラクトの翻訳
    if (meta.abstract && meta.abstract.trim()) {
      if (!meta.isJapanese) {
        updateProcessingState({ currentStep: 'アブストラクトの翻訳中...', progress: 50 });
        try {
          meta.originalAbstract = meta.abstract;
          meta.abstract = await sendPrompt(null, ABSTRACT_TRANSLATION_PROMPT(meta.abstract));
          updateProcessingState({ currentStep: 'アブストラクトの翻訳が完了しました', progress: 60 });
        } catch (e) {
          updateProcessingState({ currentStep: 'アブストラクトの翻訳に失敗しました: ' + e.message, progress: 60 });
        }
      }
    }

    // 4. 論文要約
    updateProcessingState({ currentStep: 'Geminiで論文要約中...', progress: 70 });
    const summaryPrompt = config.customPrompt || summaryPromptDefault;
    const summary = await sendPrompt(pdfFile, summaryPrompt);
    updateProcessingState({ currentStep: '論文内容の要約が完了しました', progress: 80 });

    // journal（ジャーナル名）が100文字を超える場合は切り詰め
    if (meta.journal && typeof meta.journal === "string" && meta.journal.length > 100) {
      meta.journal = meta.journal.slice(0, 100);
    }

    // 5. Notionへの送信
    updateProcessingState({ currentStep: 'NotionにPDFアップロード中...', progress: 90 });
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfName = pdfFile.name;
    const pdfContentType = pdfFile.type || "application/pdf";

    let pdfFileUploadId = null;
    const uploadResult = await uploadFileToNotion(pdfBytes, pdfName, pdfContentType, config.notionApiKey);
    if (!uploadResult.success) {
      if (uploadResult.skipFile) {
        // ファイルサイズが大きすぎる場合はアップロードをスキップし、メタデータのみ送信する
        console.warn("ファイルサイズが大きすぎるため、メタデータのみ送信します:", uploadResult.message);
        updateProcessingState({ currentStep: uploadResult.message, progress: 95 });
      } else {
        // その他のエラーの場合は処理を中止する
        throw new Error("NotionへのPDFアップロードに失敗しました: " + uploadResult.message);
      }
    } else {
      pdfFileUploadId = uploadResult.fileUploadId;
      updateProcessingState({ currentStep: 'PDFのアップロードが完了しました', progress: 95 });
    }

    updateProcessingState({ currentStep: 'メタデータと要約をNotionに送信中...', progress: 98 });
    const notionResult = await sendToNotion(meta, summary, pdfFileUploadId, pdfName, config.notionApiKey, config.notionDatabaseId);

    if (notionResult.success) {
      updateProcessingState({
        isProcessing: false,
        currentStep: '',
        progress: 100,
        result: 'Notionへの送信に成功しました',
        notionPageUrl: notionResult.pageUrl || null,
        pdfFileName: pdfFile.name
      });
    } else {
      throw new Error(notionResult.message);
    }
  } catch (e) {
    console.error('処理エラー:', e);
    updateProcessingState({
      isProcessing: false,
      currentStep: '',
      error: `エラー: ${e.message}`,
      progress: 0,
      pdfFileName: pdfFile ? pdfFile.name : null
    });
  }
}

// Service Worker初期化
chrome.runtime.onInstalled.addListener(() => {
  console.log('Paper2Notion Service Worker がインストールされました');
  // インストール時にprocessingStateをリセット（または初期化）
  chrome.storage.local.set({
    processingState: {
      isProcessing: false,
      currentStep: '',
      progress: 0,
      result: '',
      error: null,
      notionPageUrl: null,
      pdfFileName: null
    }
  }).catch(e => console.error('初期状態の保存に失敗しました:', e));
});

// Service Workerが起動したときに状態を読み込む必要はない
// getProcessingStateメッセージが来たときにストレージから読み込む

// メッセージリスナー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('メッセージを受信:', message);

  if (message.type === 'startProcessing') {
    if (processingState.isProcessing) {
      sendResponse({ success: false, error: '既に処理が実行中です' });
      return true;
    }

    if (message.pdfFile) {
      // Base64形式のPDFファイルをBlobに変換
      const binaryString = atob(message.pdfFile.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const file = new File([blob], message.pdfFile.name, { type: 'application/pdf' });

      // 処理開始
      processAndSendToNotion(file);
      sendResponse({ success: true });
    } else {
      // 現在のタブからPDFを取得して処理
      getPdfFromTab().then(file => {
        if (file) {
          processAndSendToNotion(file);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'PDFファイルが取得できませんでした' });
        }
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    }
    return true;
  }

  if (message.type === 'getProcessingState') {
    // 最新のprocessingStateを返す
    // Service Workerが停止して再起動した場合に備え、ストレージから最新の状態を読み込む
    chrome.storage.local.get('processingState', (data) => {
      processingState = data.processingState || processingState;
      sendResponse({ state: processingState });
    });
    return true; // 非同期応答のためtrueを返す
  }

  if (message.type === 'getCurrentTabPdf') {
    getPdfFromTab().then(file => {
      if (file) {
        sendResponse({ success: true, file: {
          name: file.name,
          size: file.size,
          type: file.type
        }});
      } else {
        sendResponse({ success: false, error: 'PDFが取得できませんでした' });
      }
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  return false;
});

// Keep alive - Service Workerが5分以上アイドル状態になると自動的に停止するため、
// 処理中は定期的にping（自己メッセージ）を送信して活性状態を維持
let keepAliveInterval = null;

function startKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  keepAliveInterval = setInterval(() => {
    if (processingState.isProcessing) {
      console.log('Keep alive ping');
      chrome.runtime.sendMessage({ type: 'keepAlive' }).catch(() => {
        // エラーは無視
      });
    } else {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
  }, 25000); // 25秒ごとにpingを送信
}

// 処理状態が変わったらkeep aliveを開始/停止
chrome.storage.onChanged.addListener((changes) => {
  if (changes.processingState) {
    const newState = changes.processingState.newValue;
    if (newState && newState.isProcessing) {
      startKeepAlive();
    } else {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    }
  }
});
