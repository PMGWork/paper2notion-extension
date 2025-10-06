const DEFAULT_STOP_WORDS = [
  'the', 'a', 'an', 'of', 'to', 'in', 'for', 'with', 'on', 'and', 'via', 'by', 'from', 'at',
  'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'that', 'this', 'it', 'into', 'or',
  'but', 'not', 'so', 'do', 'does', 'did', 'using', 'over', 'through'
];

export function buildSearchKeywords(title, stopWords = DEFAULT_STOP_WORDS) {
  if (!title) {
    return [];
  }

  const normalizedTitle = title
    .replace(/\b\w*[-+]\s*\w*\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedTitle) {
    return [];
  }

  return normalizedTitle
    .split(/\s+/)
    .map(word => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter(word => word.length > 1 && !stopWords.includes(word.toLowerCase()));
}

export { DEFAULT_STOP_WORDS };
