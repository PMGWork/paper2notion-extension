// metadata.js
// 論文メタデータ取得の統合インターフェース

import { fetchCrossrefByTitle, sortCrossrefByPublisherPriority, fetchCrossrefMetadata } from './crossref.js';
import { fetchArxivByTitle } from './arxiv.js';
import { isSimilar } from './similarity.js';

const SIMILARITY_THRESHOLD = 0.85;
const CROSSREF_RESULT_LIMIT = 5;

// タイトルからメタデータを検索し、CrossrefとArXivを順に試す
export async function searchMetadataByTitle(title, options = {}) {
  const { signal = null } = options;
  const normalizedTitle = (title ?? '').trim();
  if (!normalizedTitle) {
    return null;
  }

  const crossrefMetadata = await findCrossrefMetadata(normalizedTitle, signal);
  if (crossrefMetadata) {
    return crossrefMetadata;
  }

  return await findArxivMetadata(normalizedTitle, signal);
}

// Crossrefでタイトルに一致するメタデータを検索
async function findCrossrefMetadata(title, signal) {
  const crossrefResults = await fetchCrossrefByTitle(title, CROSSREF_RESULT_LIMIT, { signal });
  if (!Array.isArray(crossrefResults) || crossrefResults.length === 0) {
    return null;
  }

  const sortedResults = sortCrossrefByPublisherPriority([...crossrefResults]);
  for (const result of sortedResults) {
    const resultTitle = extractCrossrefTitle(result);
    if (result.DOI && isSimilar(title, resultTitle, SIMILARITY_THRESHOLD)) {
      return await fetchCrossrefMetadata(result.DOI, { signal });
    }
  }

  return null;
}

// ArXivでタイトルに一致するメタデータを検索
async function findArxivMetadata(title, signal) {
  const arxivResult = await fetchArxivByTitle(title, { signal });
  if (arxivResult && isSimilar(title, arxivResult.title, SIMILARITY_THRESHOLD)) {
    return arxivResult;
  }
  return null;
}

// Crossrefの結果からタイトルを抽出
function extractCrossrefTitle(result) {
  if (!result?.title) {
    return '';
  }
  if (Array.isArray(result.title)) {
    return result.title[0] ?? '';
  }
  return result.title;
}
