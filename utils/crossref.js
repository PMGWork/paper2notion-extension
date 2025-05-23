// Crossref API関連の処理

// Crossrefからタイトルに一致する論文を検索
export async function searchCrossrefByTitle(title, rows = 5) {
  const url = "https://api.crossref.org/works";
  const params = new URLSearchParams({
    "query.title": title,
    "rows": rows,
    "sort": "relevance"
  });
  const resp = await fetch(`${url}?${params}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.message?.items || [];
}

// 出版社の優先度で並べ替え
export function sortByPublisherPriority(results) {
  return results.sort((a, b) => {
    const publisherA = getPublisherName(a);
    const publisherB = getPublisherName(b);

    const priorityA = getPublisherPriority(publisherA);
    const priorityB = getPublisherPriority(publisherB);

    return priorityA - priorityB;
  });
}

function getPublisherName(item) {
  return item.publisher || "";
}

function getPublisherPriority(publisher) {
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
export async function getCrossrefMetadata(doi) {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const resp = await fetch(url);
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