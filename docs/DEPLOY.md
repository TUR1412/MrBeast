# 部署指南（GitHub Pages）

本项目是纯静态页面，可直接部署到 GitHub Pages。

---

## 方式：通过 GitHub Pages（推荐）

1. 进入仓库页面，打开 **Settings**
2. 找到 **Pages**
3. 在 **Build and deployment**：
   - Source 选择 **Deploy from a branch**
   - Branch 选择 **main**
   - Folder 选择 **/(root)**
4. 保存后等待几分钟，GitHub 会生成访问地址

---

## 常见问题

### 1) 修改后线上不生效？

请确认你更新了 `index.html` 里的资源版本号（Cache Busting）：

```html
<link rel="stylesheet" href="assets/styles.css?v=20251218-02">
<script src="assets/app.js?v=20251218-02" defer></script>
```

并建议同时确认：

- `site.webmanifest` 已正常提交（用于“安装到桌面/分享卡片”等）
- `robots.txt` 已存在（站点交付更完整）

### 2) 需要自定义域名？

GitHub Pages 支持自定义域名，按 Pages 页面提示配置即可。

---

## 上线清单（推荐）

- [ ] `index.html` 的 `?v=...` 已同步更新（CSS/JS/favicon/manifest 版本一致）
- [ ] `node scripts/validate.js` 本地自检通过（无依赖）
- [ ] GitHub Actions CI 通过（`.github/workflows/ci.yml`）
