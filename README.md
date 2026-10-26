# 图提取 ImageGrab

电商图片一键提取下载插件 + 官方宣传网站。

## 项目结构

```
imagegrab/
├─ imagegrab-extension/   # Chrome 扩展（图提取）
│   ├─ manifest.json
│   ├─ content.js / content.css
│   ├─ background.js
│   ├─ gallery.html / gallery.js / gallery.css
│   ├─ icons/
│   └─ README.md          # 插件安装与使用说明
├─ docs/                  # 官方宣传网站（GitHub Pages 发布源）
│   ├─ index.html
│   ├─ css/style.css
│   ├─ js/main.js
│   └─ download/imagegrab-extension.zip   # 插件安装包
└─ scripts/make_icons.py  # 图标生成脚本
```

## 快速开始

- 插件安装：解压 `docs/download/imagegrab-extension.zip`，在 `chrome://extensions` 开启开发者模式后「加载已解压的扩展程序」。
- 官网预览：直接双击 `docs/index.html` 即可。

## 发布

官网通过 GitHub Pages 发布（仓库 Settings → Pages → 部署分支 main + 目录 /docs）。
