// gemini.js
// Gemini API（REST）でドキュメントとプロンプトを送信し、メタデータや要約を取得

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const DOCUMENT_CONTEXT_PREAMBLE = "You are given the content of an academic paper split into <document index=\"n\"> blocks. Base every response only on that content.";

// Gemini APIにプロンプトを送信
export async function sendPrompt({
  prompt,
  schema = null,
  pdfFile = null,
  pdfBase64 = null,
  pdfMimeType = "application/pdf",
  textChunks = null,
  signal = null,
  apiKey,
  model,
  generationConfig = null
}) {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("prompt is required");
  }

  const geminiApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!geminiApiKey) {
    throw new Error("Gemini APIキーが未設定です");
  }

  const geminiModel = typeof model === "string" ? model.trim() : "";
  if (!geminiModel) {
    throw new Error("Geminiモデルが未設定です");
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const apiUrl = `${GEMINI_BASE_URL}${geminiModel}:generateContent`;
  const parts = [];

  if (Array.isArray(textChunks) && textChunks.length > 0) {
    textChunks.forEach((chunk, index) => {
      if (typeof chunk === "string" && chunk.trim().length > 0) {
        parts.push({ text: `<document index="${index + 1}">\n${chunk}\n</document>` });
      }
    });
  } else if (typeof pdfBase64 === "string" && pdfBase64.length > 0) {
    parts.push({
      inline_data: {
        mime_type: pdfMimeType || "application/pdf",
        data: pdfBase64
      }
    });
  } else if (pdfFile) {
    const encoded = await fileToBase64(pdfFile);
    if (encoded) {
      parts.push({
        inline_data: {
          mime_type: "application/pdf",
          data: encoded
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

  if (generationConfig && typeof generationConfig === "object") {
    Object.assign(body.generationConfig, generationConfig);
  }

  if (Object.keys(body.generationConfig).length === 0) {
    delete body.generationConfig;
  }

  const resp = await fetch(`${apiUrl}?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal
  });

  if (!resp.ok) {
    throw new Error("Gemini APIエラー: " + resp.status);
  }

  const data = await resp.json();
  console.log("Gemini API response:", data);

  if (data.candidates && data.candidates.length > 0 &&
      data.candidates[0].content && data.candidates[0].content.parts &&
      data.candidates[0].content.parts.length > 0) {
    const textResponse = data.candidates[0].content.parts[0].text;

    if (!schema) {
      return textResponse;
    }

    try {
      return JSON.parse(textResponse);
    } catch (error) {
      console.error("JSONパースエラー:", error);
      return textResponse;
    }
  }

  throw new Error("Gemini APIから有効なレスポンスが返されませんでした");
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
