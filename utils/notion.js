// notion.js
// Notion APIで論文情報を送信

// Notionに直接ファイルをアップロードする関数
export async function uploadFileToNotion(fileData, fileName, contentType, notionApiKey) {
  const notionApiVersion = "2022-06-28";

  if (!notionApiKey) {
    return { success: false, message: "Notion APIキーが未設定です" };
  }

  try {
    // Step 1: ファイルアップロードオブジェクトを作成
    const createUploadResp = await fetch("https://api.notion.com/v1/file_uploads", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionApiKey}`,
        "Notion-Version": notionApiVersion,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (!createUploadResp.ok) {
      const error = await createUploadResp.text();
      return { success: false, message: `ファイルアップロード準備エラー: ${createUploadResp.status} - ${error}` };
    }

    const uploadData = await createUploadResp.json();
    const fileUploadId = uploadData.id;
    const uploadUrl = uploadData.upload_url;

    // Step 2: 実際のファイルをアップロード
    const formData = new FormData();
    // Blobとしてファイルデータを追加（fileDataがArrayBufferの場合）
    const blob = new Blob([fileData], { type: contentType });
    formData.append('file', blob, fileName);

    const uploadResp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionApiKey}`,
        "Notion-Version": notionApiVersion
      },
      body: formData
    });

    if (!uploadResp.ok) {
      const error = await uploadResp.text();
      return { success: false, message: `ファイルアップロードエラー: ${uploadResp.status} - ${error}` };
    }

    // アップロードが成功した場合、fileUploadIdを返す
    return {
      success: true,
      fileUploadId: fileUploadId,
      message: "ファイルのアップロードに成功しました"
    };
  } catch (e) {
    return { success: false, message: `ファイルアップロード例外: ${e.message}` };
  }
}

export async function sendToNotion(meta, summary, pdfFileUploadId = null, pdfName = null, notionApiKey, notionDatabaseId) {
  const notionApiVersion = "2022-06-28";

  if (!notionApiKey || !notionDatabaseId) {
    return { success: false, message: "Notion APIキーまたはデータベースIDが未設定です" };
  }

  const children = [];

  if (summary) {
    const lines = summary.split("\n");
    let currentParagraph = [];
    for (const line of lines) {
      const stripped = line.trim();
      if (stripped.startsWith("### ")) {
        if (currentParagraph.length > 0) {
          children.push({
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: currentParagraph.join("\n").trim() } }]
            }
          });
          currentParagraph = [];
        }
        children.push({
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [{ type: "text", text: { content: stripped.replace("### ", "") } }]
          }
        });
      } else if (stripped || currentParagraph.length > 0) {
        currentParagraph.push(line);
      }
    }
    if (currentParagraph.length > 0) {
      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: currentParagraph.join("\n").trim() } }]
        }
      });
    }
  }

  const authorsList = (meta.authors || "").split(",").map(a => a.trim()).filter(Boolean);
  const journalsList = (meta.journals || "").split(",").map(j => j.trim()).filter(Boolean);

  const properties = {
    "タイトル": {
      title: [{ text: { content: meta.title || "No Title" } }]
    },
    "著者": {
      multi_select: authorsList.map(a => ({ name: a }))
    },
    "発表年": {
      number: typeof meta.year === "number" ? meta.year : null
    },
    "ジャーナル": {
      multi_select: journalsList.map(j => ({ name: j }))
    },
    "DOI": {
      url: meta.doi || null
    },
    "アブスト": {
      rich_text: [{ text: { content: meta.abstract || "" } }]
    }
  };

  if (pdfFileUploadId && pdfName) {
    properties["PDF"] = {
      files: [
        {
          type: "file_upload",
          name: pdfName,
          file_upload: {
            id: pdfFileUploadId
          }
        }
      ]
    };
  }

  const data = {
    parent: { database_id: notionDatabaseId },
    properties,
    children
  };

  const resp = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${notionApiKey}`,
      "Notion-Version": notionApiVersion,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (resp.status === 200 || resp.status === 201) {
    return { success: true, message: "Notionへの送信に成功しました" };
  } else {
    const text = await resp.text();
    return { success: false, message: `Notion送信エラー: ${resp.status} - ${text}` };
  }
}
