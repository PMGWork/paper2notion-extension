// pdf.js
// 現在アクティブなタブからPDFファイルを取得し、Fileオブジェクトとして返す

/**
 * 現在アクティブなタブからPDFファイルを取得し、Fileオブジェクトとして返す
 * @param {HTMLElement} resultEl - エラー表示用の要素
 * @param {HTMLElement} progressEl - 進捗表示用の要素
 * @returns {Promise<File|null>}
 */
export async function getCurrentTabPdf(resultEl, progressEl) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (!activeTab || !activeTab.url) {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>タブ情報が取得できません</span>
          </div>
        `;
        resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
      }
      return null;
    }

    // file://スキームの場合は専用処理
    if (activeTab.url.startsWith('file://')) {
      return await processLocalFileUrl(activeTab.url, resultEl, progressEl);
    }

    // アクセスできないURLスキームをチェック（file://は除外）
    const inaccessibleSchemes = ['chrome:', 'chrome-extension:', 'data:', 'about:', 'javascript:'];
    if (inaccessibleSchemes.some(scheme => activeTab.url.startsWith(scheme))) {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>このページからはPDFを取得できません（${activeTab.url.split(':')[0]}スキーム）</span>
          </div>
        `;
        resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
      }
      return null;
    }

    // URLがPDFかどうかをチェック
    if (!activeTab.url.toLowerCase().endsWith('.pdf')) {
      try {
        const response = await fetch(activeTab.url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/pdf')) {
          if (resultEl) {
            resultEl.innerHTML = `
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>現在のタブはPDFではありません</span>
              </div>
            `;
            resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
          }
          return null;
        }
      } catch (e) {
        if (resultEl) {
          resultEl.innerHTML = `
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>タブのコンテンツタイプを確認できません: ${e.message}</span>
            </div>
          `;
          resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
        }
        return null;
      }
    }

    // PDFをフェッチ
    if (progressEl && progressEl === resultEl) {
      progressEl.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>PDFを取得しています...</span>
        </div>
      `;
      progressEl.className = "bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 min-h-[3rem] flex items-center";
    }

    const response = await fetch(activeTab.url);
    if (!response.ok) {
      throw new Error(`PDFの取得に失敗しました: ${response.status}`);
    }

    const pdfBlob = await response.blob();
    let fileName = extractFileName(activeTab.url);

    // BlobをFileオブジェクトに変換
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    return file;
  } catch (e) {
    if (resultEl) {
      resultEl.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>PDFの取得中にエラーが発生しました: ${e.message}</span>
        </div>
      `;
      resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
    }
    return null;
  }
}

/**
 * file://スキームのローカルファイルを処理する
 * @param {string} fileUrl - file://で始まるURL
 * @param {HTMLElement} resultEl - エラー表示用の要素
 * @param {HTMLElement} progressEl - 進捗表示用の要素
 * @returns {Promise<File|null>}
 */
async function processLocalFileUrl(fileUrl, resultEl, progressEl) {
  try {
    // URLがPDFファイルかチェック
    if (!fileUrl.toLowerCase().endsWith('.pdf')) {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>現在のタブはPDFファイルではありません</span>
          </div>
        `;
        resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
      }
      return null;
    }

    if (progressEl && progressEl === resultEl) {
      progressEl.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>ローカルPDFファイルを取得しています...</span>
        </div>
      `;
      progressEl.className = "bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 min-h-[3rem] flex items-center";
    }

    // ローカルファイルをフェッチ
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`ローカルファイルの取得に失敗しました: ${response.status}`);
    }

    const pdfBlob = await response.blob();

    // ファイルサイズの検証（50MB制限）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (pdfBlob.size > maxSize) {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>ファイルサイズが大きすぎます（50MB以下にしてください）</span>
          </div>
        `;
        resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
      }
      return null;
    }

    if (pdfBlob.size === 0) {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>ファイルが空です</span>
          </div>
        `;
        resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
      }
      return null;
    }

    // ファイル名を抽出
    let fileName = extractFileName(fileUrl);

    // PDFファイルの基本的な検証
    if (progressEl && progressEl === resultEl) {
      progressEl.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span>PDFファイルを検証しています...</span>
        </div>
      `;
    }

    const tempFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    const isValidPdf = await validatePdfFile(tempFile);
    if (!isValidPdf) {
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>有効なPDFファイルではありません</span>
          </div>
        `;
        resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
      }
      return null;
    }

    // ファイル名の正規化
    fileName = sanitizeFileName(fileName);

    // 最終的なFileオブジェクトを作成
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    return file;

  } catch (e) {
    if (resultEl) {
      if (e.message.includes('Failed to fetch')) {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>ローカルファイルにアクセスできません。</span>
          </div>
        `;
      } else {
        resultEl.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>ローカルファイルの処理中にエラーが発生しました: ${e.message}</span>
          </div>
        `;
      }
      resultEl.className = "bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 min-h-[3rem] flex items-center";
    }
    return null;
  }
}

/**
 * ローカルファイルからPDFを処理する
 * @param {File} file - 選択されたファイル
 * @param {HTMLElement} resultEl - エラー表示用の要素
 * @param {HTMLElement} progressEl - 進捗表示用の要素
 * @returns {Promise<File|null>}
 */
export async function processLocalPdf(file, resultEl, progressEl) {
  try {
    if (!file) {
      if (resultEl) resultEl.textContent = "ファイルが選択されていません";
      return null;
    }

    // ファイルタイプの検証
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      if (resultEl) resultEl.textContent = "PDFファイルを選択してください";
      return null;
    }

    // ファイルサイズの検証（50MB制限）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      if (resultEl) resultEl.textContent = "ファイルサイズが大きすぎます（50MB以下にしてください）";
      return null;
    }

    if (file.size === 0) {
      if (resultEl) resultEl.textContent = "ファイルが空です";
      return null;
    }

    if (progressEl) progressEl.textContent = "PDFファイルを検証しています...";

    // PDFファイルの基本的な検証（PDFヘッダーをチェック）
    const isValidPdf = await validatePdfFile(file);
    if (!isValidPdf) {
      if (resultEl) resultEl.textContent = "有効なPDFファイルではありません";
      return null;
    }

    // ファイル名の正規化
    let fileName = file.name;
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += '.pdf';
    }
    fileName = sanitizeFileName(fileName);

    // 新しいFileオブジェクトを作成（正規化されたファイル名で）
    const processedFile = new File([file], fileName, { type: 'application/pdf' });

    if (progressEl) progressEl.textContent = `選択中: ${fileName}`;
    return processedFile;

  } catch (e) {
    if (resultEl) resultEl.textContent = `ファイル処理中にエラーが発生しました: ${e.message}`;
    return null;
  }
}

/**
 * PDFファイルの基本的な検証を行う
 * @param {File} file - 検証するファイル
 * @returns {Promise<boolean>}
 */
async function validatePdfFile(file) {
  try {
    // ファイルの最初の数バイトを読み取ってPDFヘッダーをチェック
    const chunk = file.slice(0, 8);
    const arrayBuffer = await chunk.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // PDFファイルは "%PDF-" で始まる
    const pdfHeader = [0x25, 0x50, 0x44, 0x46, 0x2D]; // "%PDF-"
    for (let i = 0; i < pdfHeader.length; i++) {
      if (uint8Array[i] !== pdfHeader[i]) {
        return false;
      }
    }

    return true;
  } catch (e) {
    console.error('PDF validation error:', e);
    return false;
  }
}

/**
 * ファイル名を安全な形式にサニタイズする
 * @param {string} fileName - 元のファイル名
 * @returns {string} - サニタイズされたファイル名
 */
export function sanitizeFileName(fileName) {
  // 危険な文字を置換
  let sanitized = fileName.replace(/[\\:\?\*\"\<\>\|\/\s\.\~\$\%\^\&\(\)\+\=\[\]\{\}\;\,\@\#\!\`\']/g, '_');

  // 連続するアンダースコアを単一に
  sanitized = sanitized.replace(/_{2,}/g, '_');

  // 先頭・末尾のアンダースコアを削除
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // 空文字列や無効な名前の場合はデフォルト名を使用
  if (!sanitized.trim() || sanitized.trim() === "." || sanitized.trim() === "..") {
    sanitized = "document.pdf";
  } else {
    // .pdf拡張子を確保
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      sanitized += ".pdf";
    }
  }

  // 長すぎる場合は切り詰め
  if (sanitized.length > 200) {
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.pdf'));
    sanitized = nameWithoutExt.substring(0, 195) + ".pdf";
  }

  return sanitized;
}

/**
 * URLから安全なファイル名を抽出
 * @param {string} url
 * @returns {string}
 */
export function extractFileName(url) {
  let fileName = url.split('/').pop() || "document.pdf";
  fileName = fileName.split('?')[0].split('#')[0];
  try {
    fileName = decodeURIComponent(fileName);
  } catch (e) {
    // デコード失敗時はそのまま
  }

  return sanitizeFileName(fileName);
}
