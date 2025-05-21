// utils/optionsStorage.js

const DEFAULT_PROMPT = "#与えられた論文のPDF資料をもとに、以下の内容のみを出力してください。\n" +
  "### 背景\n" +
  "背景の要約文を入力する\n" +
  "### 目的\n" +
  "目的の要約文を入力する\n" +
  "### 実装・実験方法（提案）\n" +
  "実装・実験方法（提案）の要約文を入力する\n" +
  "### 結果\n" +
  "結果の要約文を入力する\n" +
  "### 結論\n" +
  "結論の要約文を入力する\n" +
  "### 議論\n" +
  "議論の要約文を入力する";

const OPTION_KEYS = [
  "dropboxAppKey",
  "dropboxAppSecret",
  "dropboxRedirectUri",
  "geminiApiKey",
  "geminiModel",
  "notionApiKey",
  "notionDatabaseId",
  "customPrompt"
];

export function getDefaultOptions() {
  return {
    dropboxAppKey: "",
    dropboxAppSecret: "",
    dropboxRedirectUri: "",
    geminiApiKey: "",
    geminiModel: "gemini-2.5-flash-preview-04-17",
    notionApiKey: "",
    notionDatabaseId: "",
    customPrompt: DEFAULT_PROMPT
  };
}

export function restoreOptions(callback) {
  chrome.storage.local.get(OPTION_KEYS, (items) => {
    const defaults = getDefaultOptions();
    const options = { ...defaults, ...items };
    callback(options);
  });
}

export function saveOptions(options, callback) {
  chrome.storage.local.set(options, callback);
}

export function resetPrompt(form) {
  form.customPrompt.value = DEFAULT_PROMPT;
}
