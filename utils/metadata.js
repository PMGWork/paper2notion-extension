// metadata.js
// Crossref/arXiv APIによる論文メタデータ取得

export async function searchDoiByTitle(title) {
  const url = "https://api.crossref.org/works";
  const params = new URLSearchParams({
    "query.title": title,
    "rows": 1,
    "sort": "relevance"
  });
  const resp = await fetch(`${url}?${params}`);
  if (!resp.ok) return null;
  const data = await resp.json();
  const items = data.message?.items || [];
  if (items.length === 0) return null;
  return items[0].DOI;
}

export async function getMetadataFromDoi(doi) {
  if (doi.toLowerCase().startsWith("arxiv:")) {
    return await getArxivMetadata(doi);
  }
  return await getCrossrefMetadata(doi);
}

async function getArxivMetadata(arxivDoi) {
  const arxivId = arxivDoi.split(":")[1];
  const url = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const xml = await resp.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");
  const entry = xmlDoc.querySelector("entry");
  if (!entry) return null;
  const title = entry.querySelector("title")?.textContent.trim() || "";
  const authors = Array.from(entry.querySelectorAll("author > name")).map(e => e.textContent).join(", ");
  const summary = entry.querySelector("summary")?.textContent.trim() || "";
  const published = entry.querySelector("published")?.textContent;
  const year = published ? parseInt(published.slice(0, 4)) : null;
  const arxivUrl = entry.querySelector("id")?.textContent;
  return {
    title,
    authors,
    journal: "arXiv",
    year,
    doi: arxivUrl,
    abstract: summary
  };
}

async function getCrossrefMetadata(doi) {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = (await resp.json()).message;
  const journal = (data["container-title"] && data["container-title"][0]) || "";
  const title = (data["title"] && data["title"][0]) || "";
  return {
    title,
    authors: (data.author || []).map(a => `${a.given || ""} ${a.family || ""}`).join(", "),
    journal,
    year: (data["published-print"]?.["date-parts"]?.[0]?.[0]) || (data["published-online"]?.["date-parts"]?.[0]?.[0]) || null,
    doi: data.DOI || "",
    abstract: data.abstract || ""
  };
}

// 類似度判定（簡易版）
export function isSimilar(a, b, threshold = 0.8) {
  if (!a || !b) return false;
  // レーベンシュタイン距離やSequenceMatcherの代用として単純な一致率
  const minLen = Math.min(a.length, b.length);
  let same = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) same++;
  }
  return (same / Math.max(a.length, b.length)) >= threshold;
}
