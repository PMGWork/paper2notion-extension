// optionsStorage.js
// オプションの保存と取得を行う

import { DEFAULT_SUMMARY_PROMPT } from "./prompts.js";

const OPTION_KEYS = [
  "geminiApiKey",
  "geminiModel",
  "notionApiKey",
  "notionDatabaseId",
  "customPrompt",
  "useNonReasoning"
];

// オプションの初期値
const defaultOptions = {
  geminiApiKey: "",
  geminiModel: "gemini-2.5-flash-preview-05-20",
  notionApiKey: "",
  notionDatabaseId: "",
  customPrompt: DEFAULT_SUMMARY_PROMPT,
  useNonReasoning: true
};

// 保存されたオプションを取得
export function restoreOptions(callback) {
  chrome.storage.local.get(OPTION_KEYS, (items) => {
    const options = { ...defaultOptions, ...items };
    callback(options);
  });
}

// オプションを保存
export function saveOptions(options, callback) {
  chrome.storage.local.set(options, callback);
}

// プロンプトをデフォルト値にリセット
export function resetPrompt(form) {
  form.customPrompt.value = DEFAULT_SUMMARY_PROMPT;
}
