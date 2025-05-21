// pdf.js

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
      if (resultEl) resultEl.textContent = "タブ情報が取得できません";
      return null;
    }

    // アクセスできないURLスキームをチェック
    const inaccessibleSchemes = ['chrome:', 'chrome-extension:', 'file:', 'data:', 'about:', 'javascript:'];
    if (inaccessibleSchemes.some(scheme => activeTab.url.startsWith(scheme))) {
      if (resultEl) resultEl.textContent = `このページからはPDFを取得できません（${activeTab.url.split(':')[0]}スキーム）`;
      return null;
    }

    // URLがPDFかどうかをチェック
    if (!activeTab.url.toLowerCase().endsWith('.pdf')) {
      try {
        const response = await fetch(activeTab.url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/pdf')) {
          if (resultEl) resultEl.textContent = "現在のタブはPDFではありません";
          return null;
        }
      } catch (e) {
        if (resultEl) resultEl.textContent = `タブのコンテンツタイプを確認できません: ${e.message}`;
        return null;
      }
    }

    // PDFをフェッチ
    if (progressEl) progressEl.textContent = "PDFを取得しています...";
    const response = await fetch(activeTab.url);
    if (!response.ok) {
      throw new Error(`PDFの取得に失敗しました: ${response.status}`);
    }

    const pdfBlob = await response.blob();
    let fileName = extractFileName(activeTab.url);

    // BlobをFileオブジェクトに変換
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (progressEl) progressEl.textContent = `選択中: ${fileName}`;
    return file;
  } catch (e) {
    if (resultEl) resultEl.textContent = `PDFの取得中にエラーが発生しました: ${e.message}`;
    return null;
  }
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
  fileName = fileName.replace(/[\\:\?\*\"\<\>\|\/\s\.\~\$\%\^\&\(\)\+\=\[\]\{\}\;\,\@\#\!\`\']/g, '_').replace(/_{2,}/g, '_');
  if (!fileName.trim() || fileName.trim() === "." || fileName.trim() === ".." || fileName.startsWith('_') || fileName.endsWith('_')) {
    fileName = "document.pdf";
  } else {
    if (!fileName.toLowerCase().endsWith('.pdf')) {
      fileName += ".pdf";
    }
  }
  if (fileName.length > 200) {
    fileName = fileName.substring(0, 195) + ".pdf";
  }
  return fileName;
}
