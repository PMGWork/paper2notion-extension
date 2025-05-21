// options.js

import { restoreOptions, saveOptions, resetPrompt } from "./utils/optionsStorage.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("optionsForm");
  const saveStatus = document.getElementById("saveStatus");

  // 保存済み値を復元
  restoreOptions((options) => {
    form.dropboxAppKey.value = options.dropboxAppKey;
    form.dropboxAppSecret.value = options.dropboxAppSecret;
    form.dropboxRedirectUri.value = options.dropboxRedirectUri;
    form.geminiApiKey.value = options.geminiApiKey;
    form.geminiModel.value = options.geminiModel;
    form.notionApiKey.value = options.notionApiKey;
    form.notionDatabaseId.value = options.notionDatabaseId;
    form.customPrompt.value = options.customPrompt;
  });

  // 保存処理
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const options = {
      dropboxAppKey: form.dropboxAppKey.value,
      dropboxAppSecret: form.dropboxAppSecret.value,
      dropboxRedirectUri: form.dropboxRedirectUri.value,
      geminiApiKey: form.geminiApiKey.value,
      geminiModel: form.geminiModel.value,
      notionApiKey: form.notionApiKey.value,
      notionDatabaseId: form.notionDatabaseId.value,
      customPrompt: form.customPrompt.value
    };
    saveOptions(options, () => {
      saveStatus.textContent = "保存しました";
      setTimeout(() => { saveStatus.textContent = ""; }, 1500);
    });
  });

  // リセットボタンの処理を追加
  const resetButton = document.getElementById("resetPrompt");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetPrompt(form);
    });
  }
});
