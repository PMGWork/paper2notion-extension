// 文字列類似度判定ユーティリティ

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