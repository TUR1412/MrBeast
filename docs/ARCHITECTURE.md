# 架构与模块说明（Quark-Level）

本项目是一个**纯静态**的一页式作品：不依赖构建工具、不依赖后端接口；所有体验来自 `HTML + CSS + Vanilla JS`。

目标是做到：

- **首屏默认可见**（JS 只是增强，不是“救场”）
- **动效可控**（系统 Reduced Motion + 手动三档开关）
- **可访问性可用**（键盘/读屏/无 JS 场景不崩）
- **性能稳健**（粒子连线避免 O(n²)，重型动效 idle 初始化）
- **交付可靠**（缓存穿透版本一致性 + CI 自检）

---

## 目录结构

```text
.
├─ index.html
├─ site.webmanifest
├─ assets/
│  ├─ styles.css
│  ├─ app.js
│  ├─ favicon.svg
│  └─ readme-cover.svg
├─ scripts/
│  └─ validate.js
└─ docs/
   ├─ DEPLOY.md
   ├─ QUALITY.md
   └─ ARCHITECTURE.md
```

---

## 入口与加载策略

- `index.html`
  - 通过 `?v=...` 进行 **cache busting**（避免缓存幽灵）
  - head 内用 1 行脚本设置 `.js`，让 CSS 可以区分 “JS 增强” 与 “No‑JS 退化”
- `assets/styles.css`
  - 视觉层（玻璃拟态/极光/噪点纹理）
  - A11y（focus ring、sr-only、skip-link、forced-colors 兜底）
  - No‑JS 退化：小屏导航、轮播展示策略
- `assets/app.js`
  - 交互与动效（Toast、粒子、Spotlight、轮播、导航、表单）
  - 重型动效使用 `requestIdleCallback`（或 `setTimeout`）延后初始化

---

## JS 模块一览（assets/app.js）

### Toast

- 目标：交互反馈“讲人话”，不在 UI 主区域裸露原始日志/错误
- 输出：插入到 `#toast-root`（`aria-live="polite"`）

### Confetti

- 目标：成功动作的“庆祝感”
- 降级：Reduced Motion 或手动动效模式为“关”时不会触发

### ParticleSystem（粒子宇宙）

- 目标：背景粒子与连线（沉浸感）
- 性能关键点：
  - 近邻搜索：避免两两距离的 **O(n²)**
  - `Save-Data / 2G`：自动降低粒子数量与连线距离
  - `visibilitychange`：标签页隐藏时暂停

### ScrollAnimator（滚动入场）

- 目标：内容分段“电影式入场”
- 策略：**默认可见**，JS 仅添加轻微位移并在进入视口后归位
- 降级：无 `IntersectionObserver` 时用滚动检测兜底；Reduced Motion 时直接激活

### Spotlight（光晕跟随）

- 目标：卡片/按钮 hover 光晕，提供高级质感
- 降级：coarse pointer 或 Reduced Motion 时禁用

### Navbar（导航）

- 目标：移动端可展开菜单、不会出现“幽灵焦点”
- 特性：
  - 菜单关闭时：`aria-hidden` + `inert`（支持则用属性）
  - 菜单打开时：**键盘焦点陷阱**（Tab 不穿模到页面背后）
  - 滚动条补偿：打开菜单锁滚动时避免页面横向跳动

### Carousel（见证轮播）

- 目标：拖拽/自动播放 + 无 JS 退化
- A11y：
  - `aria-live` 状态播报（第几条/共几条/作者）
  - 键盘支持：方向键、Home/End
- 降级：Reduced Motion 不自动播放；无 JS 时以列表展示并隐藏控制区

### MouseFollower（光标跟随）

- 目标：微交互的“Q 弹触感”
- 降级：coarse pointer 或 Reduced Motion 时禁用

### FormHandler（表单）

- 目标：更像产品而不是“静态摆设”
- 特性：
  - 草稿保存：`localStorage`（刷新不丢）
  - 校验：Toast + `aria-invalid`（可见且可读屏）

### 动效模式（Motion Mode）

三档：`自动 / 关 / 开`

- 存储键：`mrbeast_motion_mode_v1`
- 优先级：
  1) 关（强制 reduce）
  2) 开（强制 full）
  3) 自动（跟随系统）

---

## 运行时可观测性（assets/ha/*）

本仓库新增 `assets/ha/*` 作为“运行时守护层”，遵循开闭原则：尽量不侵入既有业务模块，通过增量扩展补齐稳定性与可观测性能力。

- `assets/ha/boot.mjs`：启动入口（在 `assets/app.js` 前加载），负责装配与配置
- `assets/ha/error-boundary.mjs`：全局错误捕获（`error` / `unhandledrejection`）+ 覆盖层 UI（可复制）
- `assets/ha/logger.mjs`：结构化日志（可按级别过滤，支持 child scope）
- `assets/ha/telemetry.mjs`：事件队列 + 可选上报（默认不启用）
- `assets/ha/perf.mjs`：Web Vitals 采集（TTFB/FCP/LCP/CLS）

可选配置（通过 `index.html` 的 meta 或 localStorage）：

- `meta[name="ha:telemetry:endpoint"]`：启用 Telemetry 上报地址
- `localStorage["ha:logLevel"]`：日志级别（`debug`/`info`/`warn`/`error`/`silent`）
- `meta[name="ha:sw:disabled"] = "1"`：禁用 Service Worker（排查缓存时使用）

## 原子设计层（assets/ui.css）

在原有样式之上叠加 `assets/ui.css`，以 CSS `@layer` 方式提供“设计系统层”，实现原子设计分层：

- `tokens`：设计令牌（颜色/间距/圆角/阴影/字体等）
- `base`：基础样式（背景、排版、可访问性、Reduced Motion）
- `atoms/molecules/organisms`：组件层（基础按钮/卡片/布局与结构）
- `utilities`：工具类（低耦合辅助类）
- `legacy-overrides`：对既有结构的非侵入式视觉增强

## Service Worker（sw.js）

新增根目录 `sw.js` 作为离线与缓存加速层：

- **预缓存**：安装阶段缓存核心静态资源（HTML/CSS/JS/manifest 等）
- **导航请求**：network-first，弱网/离线回退缓存
- **静态资源**：cache-first，首次请求后写入缓存

缓存版本通过 `sw.js` 内部 `CACHE_NAME` 控制，建议每次发布同步更新以确保缓存刷新策略可控。

## 工程化自检

本仓库内置无依赖自检脚本：

```bash
node scripts/validate.js
```

覆盖范围：

- HTML 基础结构与重复 id
- `target="_blank"` 的安全 `rel`
- cache busting 版本一致性（CSS/JS/favicon/manifest）
- 禁止 `alert()` / `console.*` / `debugger`

对应 CI：`.github/workflows/ci.yml`
