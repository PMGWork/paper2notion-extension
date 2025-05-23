// metadata.js
// 論文メタデータ取得の統合インターフェース

import { searchCrossrefByTitle, sortByPublisherPriority, getCrossrefMetadata } from './crossref.js';
import { searchArxivByTitle, getArxivMetadata } from './arxiv.js';
import { isSimilar } from './similarity.js';

export async function searchDoiByTitle(title) {
  // 1. Crossref検索 (5件取得 → 出版社優先度ソート → 類似度判定)
  const crossrefResults = await searchCrossrefByTitle(title, 5);

  if (crossrefResults && crossrefResults.length > 0) {
    const sortedResults = sortByPublisherPriority(crossrefResults);

    for (const result of sortedResults) {
      const resultTitle = result.title?.[0] || "";
      if (isSimilar(title, resultTitle, 0.85)) {
        return result.DOI;
      }
    }
  }

  // 2. ArXiv検索 (フォールバック)
  const arxivResult = await searchArxivByTitle(title);
  if (arxivResult) {
    const arxivTitle = arxivResult.title || "";
    if (isSimilar(title, arxivTitle, 0.75)) {
      return arxivResult.doi;
    }
  }

  return null;
}

export async function getMetadataFromDoi(doi) {
  if (doi.toLowerCase().startsWith("arxiv:")) {
    return await getArxivMetadata(doi);
  }
  return await getCrossrefMetadata(doi);
}

// 後方互換性のため類似度判定関数もエクスポート
export { isSimilar } from './similarity.js';