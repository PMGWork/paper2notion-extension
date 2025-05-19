// notion.js
// Notion APIで論文情報を送信

export async function sendToNotion(meta, summary, pdfUrl = null, pdfName = null, notionApiKey, notionDatabaseId) {
  if (!notionApiKey || !notionDatabaseId) {
    return { success: false, message: "Notion APIキーまたはデータベースIDが未設定です" };
  }

  // ブロック構造
  const children = [];
  if (pdfUrl) {
    children.push({
      object: "block",
      type: "file",
      file: {
        caption: [{ type: "text", text: { content: `Uploaded PDF: ${pdfName}` } }],
        type: "external",
        external: { url: pdfUrl }
      }
    });
  }
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

  // プロパティ
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

  if (pdfUrl) {
    properties["PDF"] = {
      files: [
        {
          type: "external",
          name: pdfName || "PDF Link",
          external: { url: pdfUrl }
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
      "Notion-Version": "2022-06-28",
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
