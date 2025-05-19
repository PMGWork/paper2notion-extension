// gemini.js
// Gemini API（REST）でPDFとプロンプトを送信し、メタデータや要約を取得

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent";

// Gemini APIキーをchrome.storage.localから取得して使う
export async function sendPrompt(pdfFile, prompt, schema = null) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("geminiApiKey", async (items) => {
      const GEMINI_API_KEY = items.geminiApiKey || "";
      if (!GEMINI_API_KEY) {
        reject(new Error("Gemini APIキーが未設定です"));
        return;
      }

      // PDFファイルをbase64化
      const pdfBase64 = await fileToBase64(pdfFile);

      // Gemini APIのリクエストボディ例
      const body = {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: pdfBase64
                }
              },
              { text: prompt }
            ]
          }
        ]
      };
      if (schema) {
        body.generationConfig = {
          responseMimeType: "application/json",
          responseSchema: schema
        };
      }

      try {
        const resp = await fetch(GEMINI_API_URL + `?key=${GEMINI_API_KEY}`, {
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
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
