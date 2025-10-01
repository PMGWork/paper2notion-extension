// gemini.js
// Gemini API（REST）でドキュメントとプロンプトを送信し、メタデータや要約を取得

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const DOCUMENT_CONTEXT_PREAMBLE = "You are given the content of an academic paper split into <document index=\"n\"> blocks. Base every response only on that content.";

// Gemini APIにプロンプトを送信
export async function sendPrompt({ prompt, schema = null, pdfFile = null, textChunks = null, signal = null }) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("prompt is required");
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["geminiApiKey", "geminiModel"], async (items) => {
      const GEMINI_API_KEY = items.geminiApiKey || "";
      const GEMINI_MODEL = typeof items.geminiModel === "string" ? items.geminiModel.trim() : "";

      if (!GEMINI_API_KEY) {
        reject(new Error("Gemini APIキーが未設定です"));
        return;
      }

      if (!GEMINI_MODEL) {
        reject(new Error("Geminiモデルが未設定です"));
        return;
      }

      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const apiUrl = `${GEMINI_BASE_URL}${GEMINI_MODEL}:generateContent`;
      const parts = [];

      if (Array.isArray(textChunks) && textChunks.length > 0) {
        textChunks.forEach((chunk, index) => {
          if (typeof chunk === "string" && chunk.trim().length > 0) {
            parts.push({ text: `<document index="${index + 1}">\n${chunk}\n</document>` });
          }
        });
      } else if (pdfFile) {
        const pdfBase64 = await fileToBase64(pdfFile);
        if (pdfBase64) {
          parts.push({
            inline_data: {
              mime_type: "application/pdf",
              data: pdfBase64
            }
          });
        }
      }

      const finalPrompt = (Array.isArray(textChunks) && textChunks.length > 0)
        ? `${DOCUMENT_CONTEXT_PREAMBLE}\n\n${prompt}`
        : prompt;
      parts.push({ text: finalPrompt });

      const body = {
        contents: [
          {
            parts
          }
        ],
        generationConfig: {}
      };

      if (schema) {
        body.generationConfig.responseMimeType = "application/json";
        body.generationConfig.responseSchema = schema;
      }

      try {
        const resp = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal
        });

        if (!resp.ok) {
          reject(new Error("Gemini APIエラー: " + resp.status));
          return;
        }

        const data = await resp.json();
        console.log("Gemini API response:", data);

        if (data.candidates && data.candidates.length > 0 &&
            data.candidates[0].content && data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0) {
          const textResponse = data.candidates[0].content.parts[0].text;

          if (schema) {
            try {
              const jsonResponse = JSON.parse(textResponse);
              resolve(jsonResponse);
            } catch (error) {
              console.error("JSONパースエラー:", error);
              resolve(textResponse);
            }
          } else {
            resolve(textResponse);
          }
        } else {
          reject(new Error("Gemini APIから有効なレスポンスが返されませんでした"));
        }
      } catch (error) {
        reject(error);
      }
    });
  });
}

// ファイルをBase64エンコード
async function fileToBase64(file) {
  if (!file) {
    return "";
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const [, base64 = ""] = result.split(",");
        resolve(base64);
      } else {
        resolve("");
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
