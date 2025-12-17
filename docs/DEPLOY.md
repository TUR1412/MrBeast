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
<link rel="stylesheet" href="assets/styles.css?v=20251217-03">
<script src="assets/app.js?v=20251217-03" defer></script>
```

### 2) 需要自定义域名？

GitHub Pages 支持自定义域名，按 Pages 页面提示配置即可。

