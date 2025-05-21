// dropbox.js
// Dropbox OAuth2認証・ファイルアップロード用

let DROPBOX_APP_KEY = "";
let DROPBOX_APP_SECRET = "";
let DROPBOX_REDIRECT_URI = "";

function loadDropboxConfig() {
  chrome.storage.local.get(
    ["dropboxAppKey", "dropboxAppSecret", "dropboxRedirectUri"],
    (items) => {
      DROPBOX_APP_KEY = items.dropboxAppKey || "";
      DROPBOX_APP_SECRET = items.dropboxAppSecret || "";
      const extId = items.dropboxRedirectUri || "";
      if (extId) {
        DROPBOX_REDIRECT_URI = `https://${extId}.chromiumapp.org/`;
      }
    }
  );
}
loadDropboxConfig();

const AUTH_URL = "https://www.dropbox.com/oauth2/authorize";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

// 認証用URL生成（常に最新の設定値を取得してURLを生成）
export async function getAuthUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["dropboxAppKey", "dropboxRedirectUri"],
      (items) => {
        const appKey = items.dropboxAppKey || "";
        const extId = items.dropboxRedirectUri || "";
        const redirectUri = extId ? `https://${extId}.chromiumapp.org/` : "";
        const params = new URLSearchParams({
          client_id: appKey,
          redirect_uri: redirectUri,
          response_type: "code",
          token_access_type: "offline"
        });
        resolve(`${AUTH_URL}?${params}`);
      }
    );
  });
}

// アクセストークン取得
export async function getAccessToken(code) {
  const params = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: DROPBOX_APP_KEY,
    client_secret: DROPBOX_APP_SECRET,
    redirect_uri: DROPBOX_REDIRECT_URI
  });
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.access_token;
}

// ファイルアップロード＆共有リンク取得
export async function uploadAndGetSharedLink(fileBytes, fileName, dropboxPath, accessToken) {
  // ファイルアップロード
  const uploadResp = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: `/${dropboxPath.replace(/^\/|\/$/g, "")}/${fileName}`,
        mode: "overwrite",
        autorename: false,
        mute: false
      }),
      "Content-Type": "application/octet-stream"
    },
    body: fileBytes
  });
  if (!uploadResp.ok) {
    const errorText = await uploadResp.text();
    throw new Error("Dropbox upload failed: " + errorText);
  }

  // 共有リンク取得
  const linkResp = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      path: `/${dropboxPath.replace(/^\/|\/$/g, "")}/${fileName}`,
      settings: { requested_visibility: "public" }
    })
  });

  let linkData;
  if (!linkResp.ok) {
    const errorText = await linkResp.text();
    try {
      const errorObj = JSON.parse(errorText);
      if (
        errorObj &&
        errorObj.error &&
        errorObj.error[".tag"] === "shared_link_already_exists"
      ) {
        // 既存リンク取得
        const listResp = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            path: `/${dropboxPath.replace(/^\/|\/$/g, "")}/${fileName}`,
            direct_only: true
          })
        });
        if (!listResp.ok) {
          const listError = await listResp.text();
          throw new Error("Dropbox list_shared_links failed: " + listError);
        }
        const listData = await listResp.json();
        if (listData && listData.links && listData.links.length > 0) {
          // ?dl=0 → ?raw=1 へ変換
          return listData.links[0].url.replace("?dl=0", "?raw=1");
        } else {
          throw new Error("Dropbox: 既存の共有リンクが見つかりませんでした。");
        }
      }
    } catch (e) {
      throw new Error("Dropbox link creation failed: " + errorText);
    }
    throw new Error("Dropbox link creation failed: " + errorText);
  } else {
    linkData = await linkResp.json();
    // ?dl=0 → ?raw=1 へ変換
    return linkData.url.replace("?dl=0", "?raw=1");
  }
}
