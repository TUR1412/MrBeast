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

