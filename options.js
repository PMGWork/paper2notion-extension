// options.js

import { restoreOptions, saveOptions, resetPrompt } from "./utils/optionsStorage.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("optionsForm");
  const saveStatus = document.getElementById("saveStatus");

  // 保存済み値を復元
  restoreOptions((options) => {
    const {
      geminiApiKey = "",
      notionApiKey = "",
      notionDatabaseId = "",
      customPrompt = ""
    } = options;

    form.geminiApiKey.value = geminiApiKey;
    form.notionApiKey.value = notionApiKey;
    form.notionDatabaseId.value = notionDatabaseId;
    form.customPrompt.value = customPrompt;
  });

  const statusMarkup = {
    success: `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>保存されました</span>
    `,
    error: `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span>保存に失敗しました</span>
    `
  };

  let hideStatusTimer = null;
  let clearStatusTimer = null;

  function showSaveStatus(success = true) {
    if (!saveStatus) {
      return;
    }

    if (hideStatusTimer) {
      clearTimeout(hideStatusTimer);
      hideStatusTimer = null;
    }
    if (clearStatusTimer) {
      clearTimeout(clearStatusTimer);
      clearStatusTimer = null;
    }

    saveStatus.innerHTML = success ? statusMarkup.success : statusMarkup.error;
    saveStatus.className = "flex items-center gap-2 font-medium transition-all duration-300 opacity-100";
    saveStatus.classList.add(success ? "text-green-600" : "text-red-600");

    hideStatusTimer = setTimeout(() => {
      saveStatus.classList.replace("opacity-100", "opacity-0");
      clearStatusTimer = setTimeout(() => {
        saveStatus.innerHTML = "";
        saveStatus.className = "";
      }, 300);
    }, 3000);
  }

  // 保存処理
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const options = {
      geminiApiKey: form.geminiApiKey.value,
      notionApiKey: form.notionApiKey.value,
      notionDatabaseId: form.notionDatabaseId.value,
      customPrompt: form.customPrompt.value
    };

    try {
      saveOptions(options, () => {
        showSaveStatus(true);
      });
    } catch (error) {
      console.error('保存エラー:', error);
      showSaveStatus(false);
    }
  });

  // リセットボタンの処理を追加
  const resetButton = document.getElementById("resetPrompt");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      resetPrompt(form);

      // リセット完了を表示
      const originalText = resetButton.textContent;
      resetButton.innerHTML = `
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        リセット完了
      `;
      resetButton.className = resetButton.className.replace('bg-slate-100', 'bg-green-100').replace('text-slate-700', 'text-green-700');

      setTimeout(() => {
        resetButton.textContent = originalText;
        resetButton.className = resetButton.className.replace('bg-green-100', 'bg-slate-100').replace('text-green-700', 'text-slate-700');
      }, 1500);
    });
  }
});
