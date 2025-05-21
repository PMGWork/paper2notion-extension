// background.js

chrome.runtime.onInstalled.addListener(() => {
  // 初期化処理など
});

// popupやcontent scriptからのメッセージ受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // API連携など必要に応じて処理を実装
  return true; // 非同期応答を許可
});
