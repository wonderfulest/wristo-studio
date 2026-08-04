# Connect IQ Launcher Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Studio中提供 PRG一键测试入口以及 macOS/Windows安装使用说明。

**Architecture:** 在现有 PRG发布行上增加启动操作，通过独立 service创建票据并唤起 `wristo-ciq://`。安装说明封装为可复用对话框，同时由 PRG区域、启动失败入口和帮助菜单打开。

**Tech Stack:** Vue 3、TypeScript、Element Plus、Axios、Vitest、Vue Test Utils

---

### Task 1: 增加 Launcher API类型与协议唤起服务

**Files:**
- Create: `wristo-studio/src/types/api/launcher.ts`
- Create: `wristo-studio/src/api/wristo/launcher.ts`
- Create: `wristo-studio/src/services/connectIqLauncher.ts`
- Test: `wristo-studio/src/services/connectIqLauncher.test.ts`

- [ ] 先写失败测试，覆盖创建票据、生成 `wristo-ciq://run?ticket=`、生成 health URL及拒绝空 ticket。
- [ ] API调用 `POST /dsn/products/launcher/tickets`，请求体为 `{ releaseId }`。
- [ ] 协议 URL只包含编码后的 ticket；不放 PRG URL、deviceId或路径。
- [ ] 使用注入的 `location.assign`/隐藏 anchor封装外部协议打开，便于测试且不误判安装状态。
- [ ] 运行 `npm run test:unit -- src/services/connectIqLauncher.test.ts` 并提交 `feat: add Connect IQ launcher client`。

### Task 2: 创建安装与使用说明对话框

**Files:**
- Create: `wristo-studio/src/components/dialogs/ConnectIqLauncherGuideDialog.vue`
- Test: `wristo-studio/src/components/dialogs/ConnectIqLauncherGuideDialog.test.ts`
- Modify: `wristo-studio/src/i18n.ts`

- [ ] 先写组件测试，覆盖平台默认标签、手动切换、五步说明、SDK Manager链接、Launcher下载链接、health检测和 Simulator不等于真机验证提示。
- [ ] 平台检测仅决定默认标签，不隐藏另一个平台。
- [ ] 下载 URL从 Vite环境变量读取；未配置时禁用下载并显示“安装包尚未提供”，不写死临时地址。
- [ ] 增加英文、简体中文和繁体中文完整文案；其他现有语言使用英文fallback，避免复制错误机器翻译。
- [ ] 运行目标测试和 i18n测试，提交 `feat: add launcher setup guide`。

### Task 3: 在 PRG发布行增加一键测试

**Files:**
- Modify: `wristo-studio/src/components/dialogs/EditDesignDialog.vue`
- Test: `wristo-studio/src/components/dialogs/EditDesignDialog.launcher.test.ts`

- [ ] 先写测试：无 PRG禁用、打包中提示、PRG可用显示主操作、点击按 `prgRelease.id` 创建票据、失败后打开排查入口、下载按钮仍可用。
- [ ] 为 package row保留 `releaseId` 和 `deviceId`，只有有效 PRG release才允许启动。
- [ ] 点击后显示启动状态弹窗，创建票据成功后唤起协议；不使用超时断言未安装。
- [ ] 提供“重新打开”“没有反应？安装或检查 Launcher”和“下载 PRG”。
- [ ] 运行目标测试并提交 `feat: launch PRG from design dialog`。

### Task 4: 在设计卡片保持一致入口

**Files:**
- Modify: `wristo-studio/src/views/designs/DesignCard.vue`
- Test: `wristo-studio/src/views/designs/DesignCard.launcher.test.ts`

- [ ] 先写测试，确保 PRG可用时显示一键测试且点击不会触发卡片导航。
- [ ] 复用同一 `connectIqLauncher` service和安装说明对话框，不复制协议逻辑。
- [ ] 保留已有 PRG下载图标与行为。
- [ ] 运行目标测试并提交 `feat: add launcher action to design cards`。

### Task 5: 增加帮助菜单常驻入口

**Files:**
- Modify: `wristo-studio/src/components/layout/app-menu/AppMenuHelp.vue`
- Modify: `wristo-studio/src/components/layout/AppMenu.vue`
- Test: `wristo-studio/src/components/layout/app-menu/AppMenuHelp.launcher.test.ts`

- [ ] 先写测试，确认帮助菜单出现“Connect IQ 本地测试”并触发 guide dialog。
- [ ] 通过 prop callback保持 `AppMenuHelp`无全局对话框依赖。
- [ ] 在 `AppMenu.vue`挂载单一 guide dialog实例并供 PRG相关入口复用可行时共享。
- [ ] 运行目标测试并提交 `feat: link launcher guide from help menu`。

### Task 6: 完整构建与浏览器验证

**Files:**
- Modify: `wristo-studio/.env.example`
- Test: existing Studio test suite

- [ ] 记录 macOS和 Windows Launcher下载 URL环境变量，不写入密钥。
- [ ] 运行 `npm run test:unit`，预期全部通过。
- [ ] 运行 `npm run build`，预期 TypeScript检查和 Vite构建通过。
- [ ] 在 Chrome、Edge和 Safari验证允许/取消外部应用确认、重试、安装说明及原 PRG下载。
- [ ] 只有真实 Launcher与 Garmin Simulator运行成功后，才把一键测试标记为端到端完成。
- [ ] 提交 `docs: document launcher distribution config`。
