// 文字列類似度判定ユーティリティ

// 類似度判定（改善版）
export function isSimilar(a, b, threshold) {
  if (!a || !b) return false;

  // 文字列の正規化（小文字化、特殊文字除去、空白正規化）
  const normalizedA = normalizeTitle(a);
  const normalizedB = normalizeTitle(b);

  // 完全一致チェック
  if (normalizedA === normalizedB) return true;

  // 単語ベースの類似度計算
  const wordsA = normalizedA.split(/\s+/).filter(w => w.length > 0);
  const wordsB = normalizedB.split(/\s+/).filter(w => w.length > 0);

  return calculateWordSimilarity(wordsA, wordsB) >= threshold;
}

// タイトルの正規化
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // 特殊文字を空白に置換
    .replace(/\s+/g, ' ')     // 連続する空白を1つに
    .trim();
}

// 単語ベースの類似度計算
function calculateWordSimilarity(wordsA, wordsB) {
  if (wordsA.length === 0 && wordsB.length === 0) return 1.0;
  if (wordsA.length === 0 || wordsB.length === 0) return 0.0;

  // より短い方を基準にして、一致する単語の割合を計算
  const shorterWords = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const longerWords = wordsA.length > wordsB.length ? wordsA : wordsB;

  let matchCount = 0;
  const usedIndices = new Set();

  for (const word of shorterWords) {
    for (let i = 0; i < longerWords.length; i++) {
      if (!usedIndices.has(i) && longerWords[i] === word) {
        matchCount++;
        usedIndices.add(i);
        break;
      }
    }
  }

  // Jaccard係数的な計算: 一致数 / 合計単語数（重複排除）
  const allWords = new Set([...wordsA, ...wordsB]);
  return matchCount / allWords.size;
}