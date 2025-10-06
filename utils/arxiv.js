// arxiv.js
// ArXiv API関連の処理

import { buildSearchKeywords } from './searchKeywords.js';

// ArXivからタイトルに一致する論文を取得
export async function fetchArxivByTitle(title, options = {}) {
  const { signal = null } = options;
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  try {
    const keywords = buildSearchKeywords(title);
    const fallbackTitle = (title ?? '').trim().replace(/"/g, '');
    const searchQuery = keywords.length
      ? `ti:(${keywords.join(' AND ')})`
      : `ti:"${fallbackTitle}"`;

    const params = new URLSearchParams({
      search_query: searchQuery,
      max_results: 1,
      sortBy: "relevance"
    });

    const andSearchUrl = `https://export.arxiv.org/api/query?${params.toString()}`;
    console.log("ArXiv検索URL:", andSearchUrl);

    const resp = await fetch(andSearchUrl, { signal });
    if (!resp.ok) return null;

    const xml = await resp.text();
    const entry = parseArxivEntryFromXml(xml);

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
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error("ArXiv search error:", error);
    return null;
  }
}
// ArXiv XMLを解析して論文情報を抽出
function parseArxivEntryFromXml(xml) {
  try {
    // <entry>タグが存在するかチェック
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch || !entryMatch[1]) {
      console.warn("ArXiv XML parsing warning: <entry> tag not found.");
      return null;
    }

    const entryXml = entryMatch[1]; // entryタグの中身

    // 1. entry内のタイトルを抽出
    const titleMatch = entryXml.match(/<title[^>]*>(.*?)<\/title>/s);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : "";

    // 2. entry内の著者を抽出
    const authorMatches = entryXml.match(/<author>[\s\S]*?<name[^>]*>(.*?)<\/name>[\s\S]*?<\/author>/g);
    const authors = authorMatches
      ? authorMatches.map(match => {
          const nameMatch = match.match(/<name[^>]*>(.*?)<\/name>/);
          return nameMatch ? nameMatch[1].trim() : "";
        }).filter(name => name).join(", ")
      : "";

    // 3. entry内の要約を抽出
    const summaryMatch = entryXml.match(/<summary[^>]*>(.*?)<\/summary>/s);
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : "";

    // 4. entry内の公開日を抽出して年のみを取得
    let year = null;

    // published日付を最優先でチェック
    const publishedMatch = entryXml.match(/<published[^>]*>(.*?)<\/published>/);
    if (publishedMatch) {
      const published = publishedMatch[1].trim();
      // 最初の4文字を年として取得
      if (published.length >= 4) {
        year = parseInt(published.substring(0, 4));
      }
    }

    // publishedが取得できない場合はupdated日付をチェック
    if (!year) {
      const updatedMatch = entryXml.match(/<updated[^>]*>(.*?)<\/updated>/);
      if (updatedMatch) {
        const updated = updatedMatch[1].trim();
        // 最初の4文字を年として取得
        if (updated.length >= 4) {
          year = parseInt(updated.substring(0, 4));
        }
      }
    }
     if (!year) {
        console.warn("ArXiv XML parsing warning: Could not determine publication year.");
     }

    // 5. entry内のIDを抽出
    const idMatch = entryXml.match(/<id[^>]*>(.*?)<\/id>/);
    const id = idMatch ? idMatch[1].trim() : "";

    if (!id) {
        console.warn("ArXiv XML parsing warning: <id> tag not found in entry.");
        return null;
    }

    if (!title) {
       console.warn("ArXiv XML parsing warning: <title> tag not found in entry.");
    }

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
