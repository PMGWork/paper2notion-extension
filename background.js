// background.js

chrome.runtime.onInstalled.addListener(() => {
  // 初期化処理など
});

// popupやcontent scriptからのメッセージ受信
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DROPBOX_AUTH") {
    // TODO: Dropbox OAuth認証フロー開始
    sendResponse({ status: "not_implemented" });
  }
  // 他のAPI連携もここで処理予定
  return true; // 非同期応答を許可
});
