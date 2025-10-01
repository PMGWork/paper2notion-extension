// similarity.js
// 2つのテキストが類似しているかを判定するユーティリティ関数群

const NORMALIZE_REGEX = /[^\p{L}\p{N}\s]/gu;

// テキストを正規化
function normalize(text) {
  return text
    .toLowerCase()
    .replace(NORMALIZE_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// テキストを単語のセットに変換
function tokenSet(text) {
  if (!text) {
    return new Set();
  }
  return new Set(text.split(" ").filter(Boolean));
}

// ジャカード類似度を計算
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const value of setA) {
    if (setB.has(value)) {
      intersection++;
    }
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// レーベンシュタイン距離に基づく類似度を計算
function levenshteinRatio(a, b) {
  if (a === b) {
    return 1;
  }

  const lenA = a.length;
  const lenB = b.length;

  if (lenA === 0 || lenB === 0) {
    return 0;
  }

  const matrix = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0));

  for (let i = 0; i <= lenA; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[lenA][lenB];
  const maxLen = Math.max(lenA, lenB);
  return maxLen === 0 ? 0 : 1 - distance / maxLen;
}

// 2つのテキストが類似しているかを判定
export function isSimilar(a, b, threshold = 0.8) {
  if (!a || !b) {
    return false;
  }

  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (!normalizedA || !normalizedB) {
    return false;
  }

  const tokensA = tokenSet(normalizedA);
  const tokensB = tokenSet(normalizedB);

  const jaccard = jaccardSimilarity(tokensA, tokensB);
  if (jaccard >= threshold) {
    return true;
  }

  const ratio = levenshteinRatio(normalizedA, normalizedB);
  return ratio >= threshold;
}
