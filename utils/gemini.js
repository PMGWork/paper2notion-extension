// gemini.js
// Gemini API（REST）でPDFとプロンプトを送信し、メタデータや要約を取得

// 動的にモデル名を使用するようにする
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

// Gemini APIキーをchrome.storage.localから取得して使う
export async function sendPrompt(pdfFile, prompt, schema = null) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["geminiApiKey", "geminiModel", "useNonReasoning"], async (items) => {
      const GEMINI_API_KEY = items.geminiApiKey || "";
      const GEMINI_MODEL = items.geminiModel && items.geminiModel.trim() !== ""
        ? items.geminiModel
        : "gemini-2.5-flash-preview-05-20";
      const USE_NON_REASONING = items.useNonReasoning === true;

      if (!GEMINI_API_KEY) {
        reject(new Error("Gemini APIキーが未設定です"));
        return;
      }

      // APIエンドポイントをモデル名に基づいて構築
      const apiUrl = `${GEMINI_BASE_URL}${GEMINI_MODEL}:generateContent`;

      const parts = [{ text: prompt }];

      if (pdfFile) {
        // PDFファイルをbase64化
        const pdfBase64 = await fileToBase64(pdfFile);
        if (pdfBase64) { // pdfBase64が空でないことを確認
          parts.unshift({ // 配列の先頭に追加
            inline_data: {
              mime_type: "application/pdf",
              data: pdfBase64
            }
          });
        }
      }

      // Gemini APIのリクエストボディ例
      const body = {
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {}
      };

      // スキーマが指定されている場合は追加
      if (schema) {
        body.generationConfig.responseMimeType = "application/json";
        body.generationConfig.responseSchema = schema;
      }

      // non-reasoningの設定を追加
      // Gemini 2.5 Flashモデルの場合のみ適用
      if (GEMINI_MODEL.includes("gemini-2.5-flash") && USE_NON_REASONING) {
        body.generationConfig.thinkingConfig = {
          thinkingBudget: 0 // 0に設定すると推論を無効化
        };
      }

      try {
        const resp = await fetch(apiUrl + `?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          reject(new Error("Gemini APIエラー: " + resp.status));
          return;
        }
        const data = await resp.json();
        console.log("Gemini API response:", data);

        // レスポンスからテキスト部分を抽出
        if (data.candidates && data.candidates.length > 0 &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0) {
          const textResponse = data.candidates[0].content.parts[0].text;

          // スキーマを指定した場合はJSONとしてパース
          if (schema) {
            try {
              const jsonResponse = JSON.parse(textResponse);
              resolve(jsonResponse);
            } catch (e) {
              console.error("JSONパースエラー:", e);
              resolve(textResponse); // パースできない場合はテキストとして返す
            }
          } else {
            resolve(textResponse); // スキーマなしの場合はテキストとして返す
          }
        } else {
          reject(new Error("Gemini APIから有効なレスポンスが返されませんでした"));
        }
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ファイル→base64変換
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    console.log("fileToBase64 input:", file, "type:", typeof file, "instanceof Blob:", file instanceof Blob);
    if (!file) { // fileがnullまたはundefinedの場合
      resolve(""); // 空文字列を返す
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
