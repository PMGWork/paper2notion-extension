// ArXiv API関連の処理

// ArXiv IDからDOI URLを生成する関数
function generateArxivDoiUrl(arxivId) {
  if (!arxivId) return null;

  // ArXiv URLから論文IDを抽出 (例: http://arxiv.org/abs/1234.5678v1)
  let paperIdMatch = arxivId.match(/arxiv\.org\/abs\/([^\/\?]+)/i);
  if (paperIdMatch) {
    const paperId = paperIdMatch[1].replace(/v\d+$/, ''); // バージョン番号を削除
    return `https://doi.org/10.48550/arXiv.${paperId}`;
  }

  // 直接ID形式 (例: 1234.5678v1 または 2107.12345)
  paperIdMatch = arxivId.match(/^(\d{4}\.\d{4,5})(?:v\d+)?$/);
  if (paperIdMatch) {
    return `https://doi.org/10.48550/arXiv.${paperIdMatch[1]}`;
  }

  // URLの末尾から抽出 (例: /abs/1234.5678)
  paperIdMatch = arxivId.match(/\/([^\/]+)$/);
  if (paperIdMatch) {
    const paperId = paperIdMatch[1].replace(/v\d+$/, ''); // バージョン番号を削除
    // 数字.数字の形式かチェック
    if (/^\d{4}\.\d{4,5}$/.test(paperId)) {
      return `https://doi.org/10.48550/arXiv.${paperId}`;
    }
  }

  return null;
}

// ArXivからタイトルに一致する論文を検索
export async function searchArxivByTitle(title) {
  const url = "https://export.arxiv.org/api/query";
  const params = new URLSearchParams({
    "search_query": `ti:"${title}"`,
    "max_results": 1,
    "sortBy": "relevance"
  });

  try {
    const resp = await fetch(`${url}?${params}`);
    if (!resp.ok) return null;

    const xml = await resp.text();

    // 正規表現でXMLを解析
    const entry = parseArxivXml(xml);
    if (!entry) return null;

    // ArXiv DOI URLを生成
    const doiUrl = generateArxivDoiUrl(entry.id);

    // DOI生成に失敗した場合は元のArXiv URLを使用
    const finalDoi = doiUrl || entry.id;

    return {
      title: entry.title,
      authors: entry.authors,
      journal: "arXiv",
      year: entry.year,
      doi: finalDoi,
      abstract: entry.summary
    };
  } catch (error) {
    console.error("ArXiv search error:", error);
    return null;
  }
}

// DOIからArXivメタデータを取得
export async function getArxivMetadata(arxivDoi) {
  const arxivId = arxivDoi.split(":")[1];
  const url = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const xml = await resp.text();

  // 正規表現でXMLを解析
  const entry = parseArxivXml(xml);
  if (!entry) return null;

  // ArXiv DOI URLを生成
  const doiUrl = generateArxivDoiUrl(entry.id);

  // DOI生成に失敗した場合は元のArXiv URLを使用
  const finalDoi = doiUrl || entry.id;

  return {
    title: entry.title,
    authors: entry.authors,
    journal: "arXiv",
    year: entry.year,
    doi: finalDoi,
    abstract: entry.summary
  };
}

function parseArxivXml(xml) {
  try {
    // <entry>タグが存在するかチェック
    if (!xml.includes('<entry>')) {
      return null;
    }

    // タイトルを抽出
    const titleMatch = xml.match(/<title[^>]*>(.*?)<\/title>/s);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : "";

    // 著者を抽出
    const authorMatches = xml.match(/<author>[\s\S]*?<name[^>]*>(.*?)<\/name>[\s\S]*?<\/author>/g);
    const authors = authorMatches
      ? authorMatches.map(match => {
          const nameMatch = match.match(/<name[^>]*>(.*?)<\/name>/);
          return nameMatch ? nameMatch[1].trim() : "";
        }).filter(name => name).join(", ")
      : "";

    // 要約を抽出
    const summaryMatch = xml.match(/<summary[^>]*>(.*?)<\/summary>/s);
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : "";

    // 公開日を抽出して年のみを取得
    let year = null;

    // published日付を最優先でチェック
    const publishedMatch = xml.match(/<published[^>]*>(.*?)<\/published>/);
    if (publishedMatch) {
      const published = publishedMatch[1].trim();
      // 日付の形式: 2023-01-15T12:34:56Z など、最初の4桁が年
      const yearMatch = published.match(/^(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      }
    }

    // publishedが取得できない場合はupdated日付をチェック
    if (!year) {
      const updatedMatch = xml.match(/<updated[^>]*>(.*?)<\/updated>/);
      if (updatedMatch) {
        const updated = updatedMatch[1].trim();
        const yearMatch = updated.match(/^(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
        }
      }
    }

    // IDを抽出
    const idMatch = xml.match(/<id[^>]*>(.*?)<\/id>/);
    const id = idMatch ? idMatch[1].trim() : "";

    if (!title) return null;

    return {
      title,
      authors,
      summary,
      year,
      id
    };
  } catch (error) {
    console.error("ArXiv XML parsing error:", error);
    return null;
  }
}