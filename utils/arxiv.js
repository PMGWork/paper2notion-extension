// ArXiv API関連の処理

/**
 * arXiv API用 AND検索クエリ生成関数
 * @param {string} title - 検索対象の論文タイトル
 * @param {number} maxResults - 最大結果数（デフォルト: 1）
 * @param {string} sortBy - ソート方法（デフォルト: "relevance"）
 * @returns {string} arXiv API用のURL
 */
export function generateArxivSearchUrl(title, maxResults = 1, sortBy = "relevance") {
  // 検索精度向上のための英語ストップワード
  const stopWords = [
    'the', 'a', 'an', 'of', 'to', 'in', 'for', 'with', 'on', 'and', 'via', 'by', 'from', 'at', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'that', 'this', 'it', 'into', 'or', 'but', 'not', 'so', 'do', 'does', 'did', 'using', 'over', 'through'
  ];

  // ハイフンを含む単語パターンを除去する前処理
  // MULTI-AGENT, MULTI- AGENT のようなパターンを除去
  let cleanedTitle = title
    .replace(/\b\w*-\s*\w*\b/g, '') // ハイフンを含む単語（ハイフン+空白も含む）を除去
    .replace(/\s+/g, ' ') // 複数の空白を単一の空白に統一
    .trim(); // 前後の空白を除去

  // 記号を除去し単語配列化
  const keywords = cleanedTitle
    .split(/\s+/) // まず空白で分割
    .filter(w => {
      // 長さが1以下の単語を除外
      if (w.length <= 1) return false;
      return true;
    })
    .map(w => w.replace(/[^A-Za-z0-9]/g, '')) // 各単語から記号を除去
    .filter(w => {
      // 記号除去後の長さチェック
      if (w.length <= 1) return false;
      // ストップワードを除外
      if (stopWords.includes(w.toLowerCase())) return false;
      return true;
    });

  // AND 検索クエリを生成
  const query = `ti:(${keywords.join(' AND ')})`;

  // URLパラメータ化
  const params = new URLSearchParams({
    search_query: query,
    max_results: maxResults,
    sortBy: sortBy
  });

  // 完成URL
  return `https://export.arxiv.org/api/query?${params.toString()}`;
}

// ArXivからタイトルに一致する論文を検索
export async function searchArxivByTitle(title) {
  try {
    // AND検索用のURLを生成
    const andSearchUrl = generateArxivSearchUrl(title, 1, "relevance");
    console.log("ArXiv検索URL:", andSearchUrl);

    const resp = await fetch(andSearchUrl);
    if (!resp.ok) return null;

    const xml = await resp.text();
    const entry = parseArxivXml(xml);

    if (!entry) {
      console.log("ArXiv検索: 結果が見つかりませんでした");
      return null;
    }

    console.log("ArXiv検索: 結果を発見");

    // ArXiv IDを抽出してarxiv:形式で返す
    let arxivId = null;
    if (entry.id.includes("arxiv.org/abs/")) {
      const match = entry.id.match(/arxiv\.org\/abs\/(.+)/);
      if (match) {
        arxivId = match[1].replace(/v\d+$/, '');
      }
    }

    if (!arxivId) {
      console.log("ArXiv検索: IDの抽出に失敗");
      return null;
    }

    const result = {
      title: entry.title,
      authors: entry.authors,
      journal: "arXiv",
      year: entry.year,
      doi: `https://doi.org/10.48550/arXiv.${arxivId}`,
      abstract: entry.summary
    };

    return result;
  } catch (error) {
    console.error("ArXiv search error:", error);
    return null;
  }
}

function parseArxivXml(xml) {
  try {
    // <entry>タグが存在するかチェック
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch || !entryMatch[1]) {
      console.warn("ArXiv XML parsing warning: <entry> tag not found.");
      return null;
    }

    const entryXml = entryMatch[1]; // entryタグの中身

    // entry内のタイトルを抽出
    const titleMatch = entryXml.match(/<title[^>]*>(.*?)<\/title>/s);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : "";

    // entry内の著者を抽出
    const authorMatches = entryXml.match(/<author>[\s\S]*?<name[^>]*>(.*?)<\/name>[\s\S]*?<\/author>/g);
    const authors = authorMatches
      ? authorMatches.map(match => {
          const nameMatch = match.match(/<name[^>]*>(.*?)<\/name>/);
          return nameMatch ? nameMatch[1].trim() : "";
        }).filter(name => name).join(", ")
      : "";

    // entry内の要約を抽出
    const summaryMatch = entryXml.match(/<summary[^>]*>(.*?)<\/summary>/s);
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : "";

    // entry内の公開日を抽出して年のみを取得
    let year = null;

    // published日付を最優先でチェック
    const publishedMatch = entryXml.match(/<published[^>]*>(.*?)<\/published>/);
    if (publishedMatch) {
      const published = publishedMatch[1].trim();
      // 日付の形式: 2023-01-15T12:34:56Z など、最初の4桁が年
      const yearMatch = published.match(/^(\d{4})/);
      if (yearMatch) {
        year = parseInt(yearMatch[1]);
      } else {
         console.warn("ArXiv XML parsing warning: Could not extract year from published date:", published);
      }
    } else {
        console.warn("ArXiv XML parsing warning: <published> tag not found in entry.");
    }

    // publishedが取得できない場合はupdated日付をチェック
    if (!year) {
      const updatedMatch = entryXml.match(/<updated[^>]*>(.*?)<\/updated>/);
      if (updatedMatch) {
        const updated = updatedMatch[1].trim();
        const yearMatch = updated.match(/^(\d{4})/);
        if (yearMatch) {
          year = parseInt(yearMatch[1]);
        } else {
            console.warn("ArXiv XML parsing warning: Could not extract year from updated date:", updated);
        }
      } else {
           console.warn("ArXiv XML parsing warning: <updated> tag not found in entry, and published date was not available.");
      }
    }
     if (!year) {
        console.warn("ArXiv XML parsing warning: Could not determine publication year.");
     }

    // entry内のIDを抽出
    const idMatch = entryXml.match(/<id[^>]*>(.*?)<\/id>/);
    const id = idMatch ? idMatch[1].trim() : "";

    if (!id) {
        console.warn("ArXiv XML parsing warning: <id> tag not found in entry.");
        return null; // IDがない場合は論文情報として無効とみなす
    }

    if (!title) {
       console.warn("ArXiv XML parsing warning: <title> tag not found in entry.");
    } // タイトルがない場合も警告は出すが、IDがあれば続行

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