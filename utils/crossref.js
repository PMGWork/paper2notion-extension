// crossref.js
// Crossref API関連の処理

import { buildSearchKeywords } from './searchKeywords.js';

// Crossrefからタイトルに一致する論文を取得
export async function fetchCrossrefByTitle(title, rows = 5, options = {}) {
  const { signal = null } = options;
  const keywords = buildSearchKeywords(title);
  const queryTitle = keywords.length ? keywords.join(' ') : (title ?? '').trim();
  const url = "https://api.crossref.org/works";
  const params = new URLSearchParams({
    "query.title": queryTitle,
    "rows": rows,
    "sort": "relevance"
  });
  const resp = await fetch(`${url}?${params}`, { signal });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.message?.items || [];
}

// 出版社の優先度で並べ替え
export function sortCrossrefByPublisherPriority(results) {
  return results.sort((a, b) => {
    const publisherA = a.publisher || "";
    const publisherB = b.publisher || "";

    const priorityA = getCrossrefPublisherPriority(publisherA);
    const priorityB = getCrossrefPublisherPriority(publisherB);

    return priorityA - priorityB;
  });
}
// 出版社の優先度を取得
function getCrossrefPublisherPriority(publisher) {
  const publisherLower = publisher.toLowerCase();
  if (publisherLower.includes("acm") || publisherLower.includes("association for computing machinery")) {
    return 1; // ACM: 最高優先度
  }
  if (publisherLower.includes("ieee")) {
    return 2; // IEEE: 2番目の優先度
  }
  return 3; // その他: 3番目の優先度
}

// DOIからCrossrefメタデータを取得
export async function fetchCrossrefMetadata(doi, options = {}) {
  const { signal = null } = options;
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const resp = await fetch(url, { signal });
  if (!resp.ok) return null;
  const data = (await resp.json()).message;
  const journal = (data["container-title"] && data["container-title"][0]) || "";
  const title = (data["title"] && data["title"][0]) || "";

  // DOIをURL形式にする
  const doiUrl = data.DOI ? `https://doi.org/${data.DOI}` : "";

  return {
    title,
    authors: (data.author || []).map(a => `${a.given || ""} ${a.family || ""}`).join(", "),
    journal,
    year: (data["published-print"]?.["date-parts"]?.[0]?.[0]) || (data["published-online"]?.["date-parts"]?.[0]?.[0]) || null,
    doi: doiUrl,
    abstract: data.abstract || ""
  };
}
