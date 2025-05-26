// metadata.js
// 論文メタデータ取得の統合インターフェース

import { searchCrossrefByTitle, sortByPublisherPriority, getCrossrefMetadata } from './crossref.js';
import { searchArxivByTitle } from './arxiv.js';
import { isSimilar } from './similarity.js';

export async function searchMetadataByTitle(title) {
  // 1. Crossref検索 (5件取得 → 出版社優先度ソート → 類似度判定)
  const crossrefResults = await searchCrossrefByTitle(title, 5);

  if (crossrefResults && crossrefResults.length > 0) {
    const sortedResults = sortByPublisherPriority(crossrefResults);

    for (const result of sortedResults) {
      const resultTitle = result.title?.[0] || "";
      if (isSimilar(title, resultTitle, 0.85)) {
        return await getCrossrefMetadata(result.DOI);
      }
    }
  }

  // 2. ArXiv検索 (フォールバック)
  const arxivResult = await searchArxivByTitle(title);
  if (arxivResult && isSimilar(title, arxivResult.title, 0.85)) {
    return arxivResult
  }

  return null;
}

// 後方互換性のため類似度判定関数もエクスポート
export { isSimilar } from './similarity.js';