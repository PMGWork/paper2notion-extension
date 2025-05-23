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

    // モデル選択に応じて非推論オプションの表示/非表示を切り替え
    updateNonReasoningVisibility();
  });

  // モデル選択変更時の処理
  modelSelect.addEventListener('change', () => {
    updateNonReasoningVisibility();
  });

  // 非推論オプションの表示/非表示を切り替える関数
  function updateNonReasoningVisibility() {
    const selectedModel = modelSelect.value;
    // 2.5-Flashモデルの場合のみ非推論オプションを表示
    if (selectedModel === "gemini-2.5-flash-preview-05-20") {
      nonReasoningOption.classList.remove("hidden");
    } else {
      nonReasoningOption.classList.add("hidden");
      // 2.5-Flash以外のモデルが選択された場合、非推論オプションをオフにする
      form.useNonReasoning.checked = false;
    }
  }

  // 保存ステータスを表示する関数
  function showSaveStatus(success = true) {
    if (success) {
      saveStatus.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>保存されました</span>
      `;
      saveStatus.className = "flex items-center gap-2 text-green-600 font-medium opacity-100 transition-all duration-300";
    } else {
      saveStatus.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <span>保存に失敗しました</span>
      `;
      saveStatus.className = "flex items-center gap-2 text-red-600 font-medium opacity-100 transition-all duration-300";
    }

    // 3秒後にフェードアウト
    setTimeout(() => {
      saveStatus.className = saveStatus.className.replace('opacity-100', 'opacity-0');
      // さらに1秒後にテキストをクリア
      setTimeout(() => {
        saveStatus.innerHTML = "";
      }, 300);
    }, 3000);
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
