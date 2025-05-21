// options.js

import { restoreOptions, saveOptions, resetPrompt } from "./utils/optionsStorage.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("optionsForm");
  const saveStatus = document.getElementById("saveStatus");
  const nonReasoningOption = document.getElementById("nonReasoningOption");
  const modelSelect = document.getElementById("geminiModel");

  // 保存済み値を復元
  restoreOptions((options) => {
    form.geminiApiKey.value = options.geminiApiKey;

    // セレクトボックスの選択を設定
    const modelValue = options.geminiModel || "gemini-2.5-flash-preview-05-20";
    modelSelect.value = modelValue;

    form.notionApiKey.value = options.notionApiKey;
    form.notionDatabaseId.value = options.notionDatabaseId;
    form.customPrompt.value = options.customPrompt;
    form.useNonReasoning.checked = options.useNonReasoning;

    // モデル選択に応じてnon-reasoningオプションの表示/非表示を切り替え
    updateNonReasoningVisibility();
  });

  // モデル選択変更時の処理
  modelSelect.addEventListener('change', () => {
    updateNonReasoningVisibility();
  });

  // non-reasoningオプションの表示/非表示を切り替える関数
  function updateNonReasoningVisibility() {
    const selectedModel = modelSelect.value;
    // 2.5-Flashモデルの場合のみnon-reasoningオプションを表示
    if (selectedModel === "gemini-2.5-flash-preview-05-20") {
      nonReasoningOption.classList.remove("hidden");
    } else {
      nonReasoningOption.classList.add("hidden");
      // 2.5-Flash以外のモデルが選択された場合、non-reasoningオプションをオフにする
      form.useNonReasoning.checked = false;
    }
  }

  // 保存処理
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const options = {
      geminiApiKey: form.geminiApiKey.value,
      geminiModel: modelSelect.value,
      notionApiKey: form.notionApiKey.value,
      notionDatabaseId: form.notionDatabaseId.value,
      customPrompt: form.customPrompt.value,
      useNonReasoning: form.useNonReasoning.checked
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
