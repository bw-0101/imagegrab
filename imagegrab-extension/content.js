/**
 * 图提取 - 电商图片下载插件（Content Script）
 * 作用：在淘宝 / 京东 / 拼多多商家版的商品详情页注入「获取图片」悬浮按钮，
 *       点击后扫描页面内所有商品相关图片，提取去重后交给 background 打开画廊页。
 */
(() => {
  'use strict';

  // 防止重复注入（部分页面会多次触发注入）
  if (window.__imageGrabInjected) return;
  window.__imageGrabInjected = true;

  /* ---------------- 1. 判断是否为商品详情页 ---------------- */
  const isDetailPage = (() => {
    const host = location.hostname.toLowerCase();
    const path = location.pathname.toLowerCase();
    if (/(taobao\.com|tmall\.com)$/.test(host)) {
      // 淘宝 / 天猫详情页：/item.htm 或 /item/xxx
      return /\/item\.htm|\/item\//.test(path);
    }
    if (/jd\.com$/.test(host)) {
      // 京东详情页：/item/数字.html
      return /\/item\/\d+(\.html)?/.test(path);
    }
    if (/(pinduoduo\.com|yangkeduo\.com)$/.test(host)) {
      // 拼多多（含商家版）详情页：/goods.html / goods2.html 等
      return /\/goods\d*\.html/.test(path);
    }
    return false;
  })();

  // 非详情页不注入按钮
  if (!isDetailPage) return;

  /* ---------------- 2. 工具函数 ---------------- */
  // 相对路径补全为绝对 URL
  const toAbsolute = (u) => {
    try {
      return new URL(u, location.href).href;
    } catch (e) {
      return '';
    }
  };

  // 从 srcset 中取出最大尺寸候选地址
  const pickSrcset = (srcset) => {
    if (!srcset) return '';
    const parts = srcset.split(',');
    let best = '';
    let bestW = 0;
    for (const part of parts) {
      const seg = part.trim().split(/\s+/);
      const url = seg[0];
      if (!url) continue;
      const w = parseInt(seg[1] || '0', 10) || 0;
      if (w >= bestW) {
        bestW = w;
        best = url;
      }
    }
    return best;
  };

  // 疑似占位 / 图标 / 小图的关键词过滤
  const BAD_KEYWORDS = [
    'icon', 'logo', 'sprite', 'spinner', 'loading', 'placeholder',
    'blank', 'transparent', 'empty', 'default', 'th\.', '1px',
    '/common/', 's\.gif', '0\.gif', 'loading\.gif', 'grey\.gif',
    'com/0/', 'sprite\.', 'avatar', 'qrcode', 'watermark',
    'img/badge', 'union', 'tbcode'
  ];
  const badUrl = (u) => {
    const lower = u.toLowerCase();
    return BAD_KEYWORDS.some((k) => new RegExp(k).test(lower));
  };

  // 判断一张图片是否太小（已知尺寸时过滤占位小图）
  const tooSmall = (w, h) => {
    if (!w || !h) return false;
    return Math.min(w, h) < 100;
  };

  /* ---------------- 3. 图片提取 ---------------- */
  const collectImages = () => {
    const map = new Map(); // url -> { url, width, height }

    const add = (rawUrl, width, height) => {
      if (!rawUrl) return;
      const url = toAbsolute(rawUrl.trim());
      if (!url) return;
      if (/^(javascript:|about:|blob:)/.test(url)) return;
      // 跳过 base64 占位图（通常为 1x1 透明 gif）
      if (url.startsWith('data:')) return;
      if (badUrl(url)) return;
      // 去掉 hash，方便去重
      const clean = url.split('#')[0];
      if (map.has(clean)) return;
      if (tooSmall(width, height)) return;
      map.set(clean, { url: clean, width: width || null, height: height || null });
    };

    // 3.1 扫描 <img> 标签：src / srcset / 各类懒加载属性
    document.querySelectorAll('img').forEach((img) => {
      // 已知渲染尺寸（懒加载图片未加载时取 HTML 宽高属性兜底）
      const knownW = img.naturalWidth || img.width || parseInt(img.getAttribute('width') || '', 10) || 0;
      const knownH = img.naturalHeight || img.height || parseInt(img.getAttribute('height') || '', 10) || 0;

      add(img.currentSrc || img.src, knownW, knownH);
      add(pickSrcset(img.getAttribute('srcset')), knownW, knownH);

      // 各平台常见懒加载属性（京东 / 淘宝 / 拼多多等）
      [
        img.dataset.src,
        img.dataset.lazySrc,
        img.dataset.ksLazyload,
        img.dataset.lazyload,
        img.dataset.original,
        img.dataset.srcset ? pickSrcset(img.dataset.srcset) : '',
        img.dataset.dataSrc
      ].forEach((u) => add(u, knownW, knownH));
    });

    // 3.2 扫描内联 background-image
    document.querySelectorAll('[style]').forEach((el) => {
      const s = el.getAttribute('style') || '';
      if (!/background(-image)?\s*:/.test(s)) return;
      const urls = s.match(/url\((['"]?)(.*?)\1\)/gi) || [];
      urls.forEach((m) => {
        const u = m.replace(/^url\(['"]?/, '').replace(/['"]?\)$/, '');
        add(u, null, null);
      });
    });

    return Array.from(map.values());
  };

  /* ---------------- 4. 悬浮按钮 ---------------- */
  const createButton = () => {
    const btn = document.createElement('div');
    btn.id = 'imagegrab-btn';
    btn.setAttribute('role', 'button');
    btn.tabIndex = 0;
    btn.textContent = '获取图片';
    document.body.appendChild(btn);
    return btn;
  };

  // 轻量提示条
  const showToast = (text) => {
    let toast = document.getElementById('imagegrab-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'imagegrab-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
  };

  /* ---------------- 5. 点击处理 ---------------- */
  const btn = createButton();

  const handleClick = async () => {
    btn.classList.add('busy');
    btn.textContent = '扫描中…';

    // 稍等 200ms，让懒加载图片尽量就绪
    const images = collectImages();
    btn.textContent = '获取图片';
    btn.classList.remove('busy');

    if (!images.length) {
      showToast('未找到商品图片，请确认已滚动浏览详情页');
      return;
    }

    // 数量上限保护，避免画廊页卡顿
    const capped = images.slice(0, 300);
    if (images.length > 300) showToast(`已提取 ${images.length} 张，仅展示前 300 张`);

    try {
      // 交给 background：存列表并打开画廊页
      await chrome.runtime.sendMessage({
        type: 'OPEN_GALLERY',
        images: capped,
        sourceUrl: location.href
      });
    } catch (e) {
      showToast('打开画廊页失败，请刷新页面重试');
    }
  };

  btn.addEventListener('click', handleClick);
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  });
})();
