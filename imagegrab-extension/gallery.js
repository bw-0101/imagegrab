/**
 * 图提取 - 画廊页脚本
 * 职责：读取 background 传来的图片列表并网格展示；
 *       支持全选 / 反选 / 勾选下载，下载进度实时反馈。
 */
(() => {
  'use strict';

  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const selCountEl = document.getElementById('selCount');
  const totalCountEl = document.getElementById('totalCount');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnInvert = document.getElementById('btnInvert');
  const btnDownload = document.getElementById('btnDownload');
  const btnBack = document.getElementById('btnBack');
  const progress = document.getElementById('progress');
  const progressBar = progress.querySelector('.progress-bar');
  const progressText = document.getElementById('progressText');

  let images = []; // 原始图片列表 [{url,width,height}]
  let checked = new Set(); // 勾选的全局序号
  let sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  let downloading = false;

  /* ---------------- 1. 初始化：读取图片列表 ---------------- */
  async function init() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_IMAGES' });
      if (resp && resp.ok && resp.images.length) {
        images = resp.images;
        // 默认全选
        images.forEach((_, i) => checked.add(i));
        render();
        return;
      }
    } catch (e) {
      /* 忽略，走空状态 */
    }
    showEmpty();
  }

  function showEmpty() {
    grid.hidden = true;
    empty.hidden = false;
    btnBack.href = 'https://www.taobao.com';
  }

  /* ---------------- 2. 渲染网格 ---------------- */
  function render() {
    grid.innerHTML = '';
    totalCountEl.textContent = images.length;
    updateStats();

    images.forEach((img, i) => {
      const card = document.createElement('div');
      card.className = 'card' + (checked.has(i) ? ' checked' : '');
      card.dataset.index = i;

      // 复选框
      const check = document.createElement('span');
      check.className = 'check';
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-checked', String(checked.has(i)));
      check.tabIndex = 0;

      // 缩略图
      const im = document.createElement('img');
      im.src = img.url;
      im.alt = `商品图 ${i + 1}`;
      im.loading = 'lazy';

      // 尺寸信息
      const meta = document.createElement('div');
      meta.className = 'meta';
      const no = document.createElement('span');
      no.className = 'no';
      no.textContent = `#${i + 1}`;
      const size = document.createElement('span');
      size.textContent = img.width && img.height ? `${img.width} × ${img.height}` : '尺寸未知';
      meta.append(no, size);

      // 点击卡片任意处切换勾选
      const toggle = () => {
        if (checked.has(i)) checked.delete(i);
        else checked.add(i);
        card.classList.toggle('checked', checked.has(i));
        check.setAttribute('aria-checked', String(checked.has(i)));
        updateStats();
      };
      card.addEventListener('click', toggle);
      check.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
      });
      check.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          toggle();
        }
      });

      card.append(check, im, meta);
      grid.appendChild(card);
    });
  }

  /* ---------------- 3. 统计与批量操作 ---------------- */
  function updateStats() {
    selCountEl.textContent = checked.size;
    btnDownload.disabled = checked.size === 0 || downloading;
  }

  btnSelectAll.addEventListener('click', () => {
    images.forEach((_, i) => checked.add(i));
    render();
  });

  btnInvert.addEventListener('click', () => {
    images.forEach((_, i) => {
      if (checked.has(i)) checked.delete(i);
      else checked.add(i);
    });
    render();
  });

  /* ---------------- 4. 下载 ---------------- */
  btnDownload.addEventListener('click', async () => {
    if (downloading || checked.size === 0) return;
    downloading = true;
    updateStats();

    const selected = Array.from(checked)
      .sort((a, b) => a - b)
      .map((i) => ({ url: images[i].url, index: i }));

    showProgress(0, selected.length, '准备中…');

    // 监听后台进度 / 完成广播
    const onMsg = (msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.type === 'PROGRESS') {
        showProgress(msg.done, msg.total, `正在下载 ${msg.done}/${msg.total}…`);
      } else if (msg.type === 'DONE') {
        chrome.runtime.onMessage.removeListener(onMsg);
        finishDownload(msg);
      }
    };
    chrome.runtime.onMessage.addListener(onMsg);

    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_IMAGES',
        sessionId,
        images: selected
      });
      if (!resp || !resp.ok) throw new Error(resp ? resp.error : '下载请求失败');
    } catch (e) {
      chrome.runtime.onMessage.removeListener(onMsg);
      downloading = false;
      hideProgress();
      alert('下载失败：' + (e.message || String(e)));
    }
  });

  function showProgress(done, total, text) {
    progress.hidden = false;
    const pct = total ? Math.round((done / total) * 100) : 0;
    progressBar.style.setProperty('--p', pct + '%');
    progressBar.classList.add('active');
    progressText.textContent = text;
  }

  function hideProgress() {
    progress.hidden = true;
    progressBar.classList.remove('active');
  }

  function finishDownload(msg) {
    downloading = false;
    updateStats();
    hideProgress();
    const parts = [];
    parts.push(`已完成 ${msg.total} 张`);
    if (msg.success > 0) parts.push(`${msg.success} 张已转为 PNG`);
    if (msg.original > 0) parts.push(`${msg.original} 张保留原格式`);
    if (msg.failed > 0) parts.push(`${msg.failed} 张下载失败`);
    alert(parts.join('，') + '。文件保存在浏览器默认下载目录。');
  }

  /* ---------------- 启动 ---------------- */
  init();
})();
