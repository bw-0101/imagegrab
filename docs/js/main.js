/**
 * 图提取 ImageGrab 官网交互脚本
 * 功能：
 *   1. 移动端汉堡菜单展开/收起
 *   2. 滚动进入视口时元素淡入上移动画（IntersectionObserver）
 *   3. 滚动时导航栏当前区块高亮（scrollspy）
 *   4. 导航栏吸顶阴影增强
 */
(() => {
  'use strict';

  /* ---------- 1. 汉堡菜单 ---------- */
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });

    // 点击菜单项后自动收起（移动端）
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- 2. 滚动显现动画 ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    // 低版本浏览器兜底：直接全部显示
    reveals.forEach((el) => el.classList.add('visible'));
  }

  /* ---------- 3. 滚动高亮 + 吸顶阴影 ---------- */
  const navbar = document.getElementById('navbar');
  const sectionLinks = Array.from(document.querySelectorAll('.nav-link[data-target]'));
  const sections = sectionLinks
    .map((link) => document.getElementById(link.dataset.target))
    .filter(Boolean);

  const onScroll = () => {
    // 吸顶阴影
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 10);

    // 找到当前可视区块
    const pos = window.scrollY + window.innerHeight * 0.35;
    let current = null;
    sections.forEach((sec) => {
      if (sec.offsetTop <= pos) current = sec.id;
    });

    // 页面底部时高亮最后一个区块
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = sections[sections.length - 1]?.id || current;
    }

    sectionLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.target === current);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
