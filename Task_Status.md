# [20251218-Q30] 任务看板
> **环境**: Windows 11（`pwsh -NoLogo -NoProfile -Command '...'`）| **项目**: 纯静态单页（HTML/CSS/Vanilla JS）| **档位**: 4档（Architect）  
> **已激活矩阵**: [模块 A: 视觉/交互] + [模块 E: 幽灵防御] + [模块 F: 需求镜像/靶向验证]

## 1) 需求镜像 (Requirement Mirroring)
> **我的理解**: 进行“夸克级别”的深度审查与升级拓展，落实为 **30 次原子迭代提交**（可审计、可回滚），并同步把 GitHub 文档写到“一级美化”水准；最终推送到远程仓库，随后删除本地克隆目录。  
> **不做什么**: 不在后台启动任何长驻服务（不抢占端口），不引入重依赖构建链（保持零依赖可打开）。

## 2) 靶向验证 (Targeted Verification)
- 入口语法检查：`node --check assets/app.js`
- 项目自检脚本：`node scripts/validate.js`
- CI：`.github/workflows/ci.yml`（无依赖校验）

## 3) 执行清单 (Execution)
- [x] 基线检查：语法 & 自检脚本可通过
- [ ] 完成 30 次原子迭代提交（进行中）
- [ ] 推送到 `origin/main`
- [ ] 删除本地克隆目录（`_work/MrBeast`）

## 4) 进化知识库 (Evolutionary Knowledge)
- [!] **缓存穿透**：修改核心 CSS/JS 后，务必同步更新 `index.html` 中资源 `?v=...`，并保持版本一致。
- [!] **No‑JS 退化**：移动端导航/轮播必须可用（JS 增强而非依赖）。
- [!] **动效可控**：系统 Reduced Motion + 手动三档（自动/关/开）同时成立。

