# MrBeast - 野兽先生传奇 / MrBeast Tribute (Single Page)

[中文](#中文) | [English](#english)

一个致敬 MrBeast（野兽先生）的中文风格单页站点：讲述传奇起源、惊人项目与内容帝国，并以“用娱乐推动善良”的精神为核心。

----

## 中文

### 项目定位

- **类型**：纯静态单页（HTML/CSS/JS），无构建即可部署
- **目标**：高质量视觉与交互 + 可访问性 + 性能与稳定性
- **运行环境**：任何静态托管（GitHub Pages / Nginx / Cloudflare Pages 等）

### 关键能力（增量式增强）

在不破坏现有业务逻辑与交互模块的前提下，本仓库补齐了常见“行业标准缺口”：

- **全局错误边界**：捕获 `error` / `unhandledrejection`，并提供可复制的错误覆盖层（避免静默白屏）
- **日志与监控骨架**：结构化日志 + 事件队列（可选上报）
- **性能埋点**：采集关键 Web Vitals（TTFB/FCP/LCP/CLS）并可选上报
- **单元测试**：使用 Node 原生 `node:test`，为新增模块提供最小可信保障
- **PWA/缓存策略**：Service Worker 预缓存核心静态资源，离线可用并减少二次加载成本
- **原子设计分层（CSS @layer）**：引入 `assets/ui.css` 作为设计系统层，对齐现代 UI 质感与交互标准

### 目录结构

- `index.html`：页面入口
- `assets/styles.css`：原有样式（legacy）
- `assets/app.js`：原有交互与动效逻辑（legacy）
- `assets/ui.css`：新增 UI 设计系统层（tokens/base/atoms/molecules/organisms/utilities）
- `assets/ha/*`：新增运行时可观测性模块（错误边界/日志/Telemetry/Web Vitals）
- `sw.js`：Service Worker（缓存与离线）
- `tests/*`：Node 单元测试
- `scripts/validate.js`：仓库自检脚本
- `docs/*`：架构、质量、部署文档

### 本地运行

此项目无需构建：

1) 直接双击打开 `index.html`（最简单）
2) 或用任意静态服务器启动（推荐，体验更接近线上）

### 质量与自检

- 运行自检：`npm run validate` 或 `node scripts/validate.js`
- 运行测试：`npm test` 或 `node --test`

CI（GitHub Actions）会执行：
- `node --check assets/app.js`
- `node scripts/validate.js`
- `node --test`

### 可观测性配置（HA Runtime）

默认行为：仅在控制台输出结构化日志；Telemetry **默认不发送到任何服务器**。

- **启用 Telemetry 上报**：在 `index.html` 的 `<head>` 中添加/修改：
  - `<meta name="ha:telemetry:endpoint" content="https://your-endpoint.example/ingest" />`
- **调整日志级别**：浏览器控制台执行：
  - `localStorage.setItem("ha:logLevel", "debug")`（可选：`info`/`warn`/`error`/`silent`）
- **禁用 Service Worker**（排查缓存问题时有用）：
  - `<meta name="ha:sw:disabled" content="1" />`

### 部署（GitHub Pages）

参考 `docs/DEPLOY.md`。

额外说明：
- 本项目存在 `?v=...` 的缓存穿透策略；新增模块也使用版本号。
- Service Worker 采用独立缓存名（见 `sw.js`），如需强制刷新缓存，发布时建议同步更新其 `CACHE_NAME`。

----

## English

### What is this?

- **Type**: A static single-page website (HTML/CSS/JS) with zero build steps
- **Goal**: Modern UI/UX, accessibility, performance, and runtime stability
- **Hosting**: Any static hosting (GitHub Pages / Nginx / Cloudflare Pages, etc.)

### What’s added (incremental, Open/Closed-friendly)

Without breaking the existing interaction logic, the repo now includes:

- **Global error boundary**: captures `error` / `unhandledrejection` and shows a copyable overlay
- **Logging & monitoring skeleton**: structured logger + telemetry queue (opt-in reporting)
- **Performance instrumentation**: Web Vitals (TTFB/FCP/LCP/CLS) capture (opt-in reporting)
- **Unit tests**: minimal tests powered by Node’s built-in `node:test`
- **PWA caching**: Service Worker precaches core assets for offline support and faster reloads
- **Atomic design CSS layering**: `assets/ui.css` (tokens/base/atoms/molecules/organisms/utilities) for a modern UI baseline

### Structure

- `index.html`: entry
- `assets/styles.css`: legacy styles
- `assets/app.js`: legacy interactions
- `assets/ui.css`: new design system layer
- `assets/ha/*`: runtime observability modules
- `sw.js`: Service Worker
- `tests/*`: unit tests
- `scripts/validate.js`: repo validation
- `docs/*`: architecture/quality/deploy docs

### Local usage

No build step required:

- Open `index.html` directly, or
- Serve it via any static server for a more realistic experience.

### Quality & checks

- Validate: `npm run validate` / `node scripts/validate.js`
- Test: `npm test` / `node --test`

### Observability configuration (HA Runtime)

Telemetry is **disabled by default** (no data is sent anywhere).

- Enable reporting via:
  - `<meta name="ha:telemetry:endpoint" content="https://your-endpoint.example/ingest" />`
- Set log level via:
  - `localStorage.setItem("ha:logLevel", "debug")`
- Disable Service Worker via:
  - `<meta name="ha:sw:disabled" content="1" />`

### Deployment

See `docs/DEPLOY.md`.

