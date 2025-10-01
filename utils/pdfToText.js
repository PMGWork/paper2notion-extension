import * as pdfjsLib from "../vendor/pdfjs/pdf.mjs";

const DEFAULT_CHARS_PER_CHUNK = 4000;
const MAX_TOTAL_CHARS = 250000;
const textCache = new Map();
let workerPort = null;


function ensureWorker() {
  if (workerPort) {
    return;
  }
  const workerUrl = chrome.runtime.getURL("vendor/pdfjs/pdf.worker.mjs");
  workerPort = new Worker(workerUrl, { type: "module" });
  pdfjsLib.GlobalWorkerOptions.workerPort = workerPort;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

function cacheKeyForFile(file) {
  const parts = [file.name || "", file.size || 0];
  if (file.lastModified) {
    parts.push(file.lastModified);
  }
  return parts.join("::");
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function chunkPages(pages, chunkSize = DEFAULT_CHARS_PER_CHUNK, maxTotal = MAX_TOTAL_CHARS) {
  const joined = pages.filter((text) => typeof text === "string" && text.length > 0).join("\n\n");

  if (!joined) {
    return [];
  }

  const limited = joined.slice(0, maxTotal);
  const chunks = [];
  for (let index = 0; index < limited.length; index += chunkSize) {
    const chunk = limited.slice(index, index + chunkSize).trim();
    if (chunk) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

export async function extractPdfText(file, options = {}) {
  const {
    chunkSize = DEFAULT_CHARS_PER_CHUNK,
    maxTotalChars = MAX_TOTAL_CHARS,
    onProgress = null,
    signal = null
  } = options;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  ensureWorker();

  const key = cacheKeyForFile(file);
  if (textCache.has(key)) {
    return textCache.get(key);
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDocument = await loadingTask.promise;

  const pages = [];
  const totalPages = pdfDocument.numPages;
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const strings = textContent.items.map((item) => item.str).filter(Boolean);
    const pageText = strings.join(" ");
    pages.push(pageText);
    page.cleanup();

    if (typeof onProgress === 'function') {
      try {
        onProgress({ page: pageNumber, totalPages });
      } catch (e) {
        console.warn('extractPdfText onProgress callback failed:', e);
      }
    }
  }

  pdfDocument.cleanup();
  await loadingTask.destroy();

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const normalizedPages = pages.map((text) => normalizeWhitespace(text));
  const chunks = chunkPages(normalizedPages, chunkSize, maxTotalChars);
  const result = {
    chunks,
    pages: normalizedPages,
    fullText: normalizedPages.join("\n\n"),
  };

  textCache.set(key, result);
  return result;
}

export function clearPdfTextCache() {
  textCache.clear();
  if (workerPort) {
    workerPort.terminate();
    workerPort = null;
    pdfjsLib.GlobalWorkerOptions.workerPort = null;
  }
}
