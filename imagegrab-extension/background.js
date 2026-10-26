/**
 * 图提取 - 电商图片下载插件（Background Service Worker）
 * 职责：
 *   1. 接收 content script 的图片列表，存入 storage.session，并打开画廊页；
 *   2. 响应画廊页请求：批量下载选中图片，统一转成 PNG；
 *   3. 下载过程中通过消息推送进度与结果。
 */

/* ---------------- 1. 消息路由 ---------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'OPEN_GALLERY') {
    // content script 请求：保存图片列表并打开画廊页
    chrome.storage.session
      .set({ grabImages: msg.images || [], grabSource: msg.sourceUrl || '' })
      .then(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
        sendResponse({ ok: true });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // 异步响应
  }

  if (msg.type === 'GET_IMAGES') {
    // 画廊页请求：读取图片列表
    chrome.storage.session
      .get(['grabImages', 'grabSource'])
      .then((data) =>
        sendResponse({ ok: true, images: data.grabImages || [], sourceUrl: data.grabSource || '' })
      )
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (msg.type === 'DOWNLOAD_IMAGES') {
    // 画廊页请求：批量下载
    downloadImages(msg)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  return false;
});

/* ---------------- 2. 下载流程 ---------------- */
async function downloadImages(msg) {
  const { sessionId, images } = msg;
  const total = images.length;
  let done = 0;
  let success = 0; // 转为 PNG 成功
  let original = 0; // 转换失败，保留原格式
  let failed = 0; // 下载失败

  // 文件名序号位数：按总数自动补零（如 001 / 0001）
  const pad = Math.max(3, String(total).length);

  for (const item of images) {
    const seq = String(item.index + 1).padStart(pad, '0');
    const baseName = `商品图_${seq}`;

    try {
      // 优先统一转成 PNG
      const pngDataUrl = await toPngDataUrl(item.url);
      if (pngDataUrl) {
        await chrome.downloads.download({
          url: pngDataUrl,
          filename: `${baseName}.png`,
          conflictAction: 'uniquify'
        });
        success++;
      } else {
        // 转换失败则下载原图（保持原扩展名）
        const ext = extFromUrl(item.url);
        await chrome.downloads.download({
          url: item.url,
          filename: `${baseName}.${ext}`,
          conflictAction: 'uniquify'
        });
        original++;
      }
    } catch (e) {
      failed++;
    }

    done++;
    // 推送进度
    postMessage({ type: 'PROGRESS', sessionId, done, total, currentUrl: item.url });
  }

  // 推送最终结果
  postMessage({ type: 'DONE', sessionId, total, success, original, failed });
  return { total, success, original, failed };
}

/* ---------------- 3. 转 PNG 工具 ---------------- */
async function toPngDataUrl(url) {
  try {
    const resp = await fetch(url, { credentials: 'omit' });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    if (!blob.type) return null;

    // 本身已是 PNG：直接转 data URL
    if (blob.type.includes('png')) return await blobToDataUrl(blob);

    // 其他格式（jpg / webp 等）：解码后画到离屏画布，输出 PNG
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const pngBlob = await canvas.convertToBlob({ type: 'image/png' });
    return await blobToDataUrl(pngBlob);
  } catch (e) {
    return null;
  }
}

// Blob -> data URL
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// 根据 URL 推断图片扩展名
function extFromUrl(url) {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.(png|jpe?g|webp|gif|bmp|avif)$/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return 'jpg';
}

/* ---------------- 4. 进度广播 ---------------- */
function postMessage(data) {
  try {
    chrome.runtime.sendMessage(data);
  } catch (e) {
    /* 画廊页可能已关闭，忽略 */
  }
}
