// options.js

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("optionsForm");
  const saveStatus = document.getElementById("saveStatus");

  // 保存済み値を復元
  chrome.storage.local.get([
    "dropboxAppKey",
    "dropboxAppSecret",
    "dropboxRedirectUri",
    "geminiApiKey",
    "notionApiKey",
    "notionDatabaseId"
  ], (items) => {
    form.dropboxAppKey.value = items.dropboxAppKey || "";
    form.dropboxAppSecret.value = items.dropboxAppSecret || "";
    form.dropboxRedirectUri.value = items.dropboxRedirectUri || "";
    form.geminiApiKey.value = items.geminiApiKey || "";
    form.notionApiKey.value = items.notionApiKey || "";
    form.notionDatabaseId.value = items.notionDatabaseId || "";
  });

  // 保存処理
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    chrome.storage.local.set({
      dropboxAppKey: form.dropboxAppKey.value,
      dropboxAppSecret: form.dropboxAppSecret.value,
      dropboxRedirectUri: form.dropboxRedirectUri.value,
      geminiApiKey: form.geminiApiKey.value,
      notionApiKey: form.notionApiKey.value,
      notionDatabaseId: form.notionDatabaseId.value
    }, () => {
      saveStatus.textContent = "保存しました";
      setTimeout(() => { saveStatus.textContent = ""; }, 1500);
    });
  });
});
