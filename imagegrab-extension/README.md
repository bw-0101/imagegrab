# 图提取 - 电商图片下载插件

在淘宝、京东、拼多多商家版的商品详情页，一键提取页面内所有商品图片，集中预览、勾选后批量下载为 PNG 格式的 Chrome 浏览器扩展（Manifest V3）。

## 功能

- 悬浮按钮：详情页右下角「获取图片」，仅商品详情页显示
- 图片提取：兼容 `<img>`、`srcset`、`data-src`、`data-lazy-src`、背景图等懒加载来源
- 智能过滤：自动排除图标、Logo、占位图、1×1 像素图、小于 100×100 的图片
- 集中预览：新标签页网格展示，含尺寸信息与勾选
- 批量下载：全选 / 反选 / 按需勾选，统一转为 PNG，文件名自动编号（商品图_001.png）
- 进度反馈：下载进度条 + 完成结果统计

## 支持的平台

| 平台 | 匹配域名 | 详情页识别 |
| --- | --- | --- |
| 淘宝 / 天猫 | `*.taobao.com`、`*.tmall.com` | `/item.htm`、`/item/` |
| 京东 | `*.jd.com` | `/item/数字.html` |
| 拼多多（含商家版） | `*.pinduoduo.com`、`*.yangkeduo.com` | `/goods.html` 等 |

## 安装步骤（加载已解压的扩展程序）

1. 下载 `imagegrab-extension.zip` 压缩包，解压到本地文件夹（得到含 `manifest.json` 的目录）；
2. 打开 Chrome，地址栏输入 `chrome://extensions` 回车；
3. 打开右上角「开发者模式」开关；
4. 点击「加载已解压的扩展程序」，选择解压后的文件夹；
5. 打开任一淘宝 / 京东 / 拼多多商品详情页，右下角出现「获取图片」按钮即可使用。

## 使用说明

1. 打开商品详情页，滚动浏览（触发懒加载图片）；
2. 点击右下角「获取图片」；
3. 在新打开的画廊页中全选 / 反选 / 勾选所需图片；
4. 点击「下载选中」，文件自动保存至浏览器默认下载目录（商品图_001.png …）。

## 常见问题

- **提示「未找到商品图片」**：请先滚动浏览详情页后再点击，部分懒加载图片需要滚动才会加载。
- **部分图片保留原格式**：个别图片源无法转码时会下载原图（jpg/webp 等），文件名扩展名会相应变化。
- **一次最多展示 300 张**：防止页面卡顿，超出部分自动截断。

## 目录结构

```
imagegrab-extension/
├─ manifest.json      # Manifest V3 配置
├─ content.js         # 注入按钮 + 图片提取
├─ content.css        # 按钮样式
├─ background.js      # Service Worker：消息路由 + PNG 转换 + 下载
├─ gallery.html       # 画廊展示页
├─ gallery.js         # 画廊交互 + 下载进度
├─ gallery.css        # 画廊样式
└─ icons/             # 插件图标
```

## 技术要点

- Manifest V3 + Service Worker
- 图片跨域处理：声明平台及 CDN 域名 host 权限，在 Service Worker 中 `fetch + createImageBitmap + OffscreenCanvas` 统一转 PNG
- 图片列表通过 `chrome.storage.session` 传递，随标签页会话自动清理
