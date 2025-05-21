// optionsStorage.js

import { DEFAULT_SUMMARY_PROMPT } from "./prompts.js";

const OPTION_KEYS = [
  "geminiApiKey",
  "geminiModel",
  "notionApiKey",
  "notionDatabaseId",
  "notionApiVersion",
  "customPrompt"
];

// オプションの初期値
const defaultOptions = {
  geminiApiKey: "",
  geminiModel: "gemini-pro-vision",
  notionApiKey: "",
  notionDatabaseId: "",
  notionApiVersion: "2022-06-28",
  customPrompt: DEFAULT_SUMMARY_PROMPT
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
