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
    // タイトルからArxiv検索用のキーワードを生成
    const keywords = buildSearchKeywords(title);
    const fallbackTitle = (title ?? '').trim().replace(/"/g, '');
    const searchQuery = keywords.length
      ? `ti:(${keywords.join(' AND ')})`
      : `ti:"${fallbackTitle}"`;

    // URLSearchParamsでクエリパラメータを構築
    const params = new URLSearchParams({
      search_query: searchQuery,
      max_results: 1,
      sortBy: "relevance"
    });

    // ArXiv APIの検索URLを構築
    const searchUrl = `https://export.arxiv.org/api/query?${params.toString()}`;
    console.log("ArXiv検索URL:", searchUrl);

    // ArXiv APIにリクエストを送信
    const response = await fetch(searchUrl, { signal });
    if (!response.ok) return null;

    // レスポンスから論文情報を抽出
    const xml = await response.text();
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

    // ArXiv IDの抽出に失敗した場合、nullを返す
    if (!arxivId) {
      console.log("ArXiv検索: IDの抽出に失敗");
      return null;
    }

    // 論文情報をオブジェクトとして返す
    return {
      title: entry.title,
      authors: entry.authors,
      journal: "arXiv",
      year: entry.year,
      doi: `https://doi.org/10.48550/arXiv.${arxivId}`
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error("ArXiv検索エラー:", error);
    return null;
  }
}

// ArXiv XMLを解析して論文情報を抽出
function parseArxivEntryFromXml(xml) {
  try {
    // <entry>タグが存在するかチェック
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch || !entryMatch[1]) {
      console.warn("ArXiv XML解析警告: <entry> タグが見つかりませんでした。");
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

    // entry内の公開日を抽出して年のみを取得
    let year = null;

    const publishedMatch = entryXml.match(/<published[^>]*>(.*?)<\/published>/);
    if (publishedMatch) {
      const published = publishedMatch[1].trim();
      // 最初の4文字を年として取得
      if (published.length >= 4) {
        year = parseInt(published.substring(0, 4));
      }
    }

    if (!year) {
      console.warn("ArXiv XML解析警告: 公開年を取得できませんでした。");
    }

    // entry内のIDを抽出
    const idMatch = entryXml.match(/<id[^>]*>(.*?)<\/id>/);
    const id = idMatch ? idMatch[1].trim() : "";

    if (!id) {
      console.warn("ArXiv XML解析警告: <id> タグが見つかりませんでした。");
      return null;
    }

    if (!title) {
      console.warn("ArXiv XML解析警告: <title> タグが見つかりませんでした。");
    }

    // 抽出した情報をオブジェクトとして返す
    return {
      title,
      authors,
      year,
      id
    };
  } catch (error) {
    console.error("ArXiv XML解析エラー:", error);
    return null;
  }
}
