# PRG Installer 下载与使用引导设计

## 背景与目标

Wristo Studio 已支持按目标 Garmin 设备构建 PRG，并通过 `Preview in Simulator` 使用一次性 ticket 唤起 Wristo PRG Installer。当前缺少面向普通设计师的公开客户端下载与使用引导，用户在首次构建 PRG 或浏览器没有成功打开 PrgInstaller 时，也没有稳定的排查入口。

本次增加一个无需登录即可访问的 macOS 与 Windows 双平台引导页，并在 PRG 构建和预览流程中提供非阻塞、低频提示。页面帮助用户完成 Garmin SDK、PrgInstaller 和 Simulator 的首次准备，但不尝试从网页可靠判断本机是否已经安装 PrgInstaller。

## 范围

### 包含

- 新增公开的 PRG Installer 下载与使用引导页。
- 同时展示 macOS 和 Windows 内容，自动优先选择当前平台并允许手动切换。
- 使用环境变量提供两个平台的正式安装包 URL 和可选发布信息。
- 首次成功提交 PRG 构建任务后展示一次轻提示。
- 每次发起 Simulator 预览后提供“没有打开？”排查入口。
- 完整的中英文最终用户文案。
- 对公开路由、下载配置、提示频率和现有 Preview 流程增加针对性测试。

### 不包含

- 自动安装 Garmin Connect IQ SDK Manager、SDK、设备定义或 PrgInstaller。
- 通过 localhost、浏览器扩展或其他机制检测 PrgInstaller 安装状态。
- 更改现有 ticket、PRG 下载或 `wristo-prg-installer://` 协议安全模型。
- 自动更新 PrgInstaller。
- 发布、上传、签名或公证安装包。
- 将本地 ad-hoc macOS DMG 或未签名 Windows 包公开发布。

## 页面与路由

新增公开路由 `/prg-installer`，使用现有公共 `Layout`，路由元数据设置为 `requiresAuth: false`。未登录用户、退出登录的用户以及收到分享链接的用户均可访问。

页面组件使用独立的 `PrgInstallerGuide.vue`，避免把下载页内容耦合到设计列表或构建对话框。页面按以下顺序组织：

1. 标题、用途说明，以及“不需要 VS Code 或终端”的提示。
2. macOS 与 Windows 平台标签。
3. 当前平台下载卡片，展示可用的版本、系统或架构要求、安装包信息和下载按钮。
4. 从 SDK 准备到 Studio 预览的五步说明。
5. PRG 与目标设备的限制及 Simulator 验证边界。
6. PrgInstaller、SDK、设备定义和 Simulator 常见问题排查。
7. 返回 Wristo Studio 的入口。

首次进入时根据浏览器平台优先选择 macOS 或 Windows。用户可以手动切换标签，页面不能因为平台检测结果隐藏另一平台。平台检测失败或无法识别时默认展示 macOS，同时保持两个标签可用。

## 下载配置

下载信息集中到一个纯配置模块，避免在 Vue 组件中散落环境变量读取和降级判断。首版读取：

- `VITE_PRG_INSTALLER_MAC_URL`
- `VITE_PRG_INSTALLER_WINDOWS_URL`
- `VITE_PRG_INSTALLER_MAC_VERSION`
- `VITE_PRG_INSTALLER_MAC_SHA256`
- `VITE_PRG_INSTALLER_MAC_REQUIREMENTS`
- `VITE_PRG_INSTALLER_WINDOWS_VERSION`
- `VITE_PRG_INSTALLER_WINDOWS_SHA256`
- `VITE_PRG_INSTALLER_WINDOWS_REQUIREMENTS`

版本、SHA-256 和系统要求为可选展示字段，并同步补充到 `.env.example`。安装包 URL 必须是正式 HTTPS 下载地址。

某个平台未配置下载 URL 时，页面继续展示该平台的完整准备和使用说明，但下载按钮禁用并显示“安装包准备中”。页面不得生成空链接、使用仓库本地文件路径，或把本地测试包作为正式下载回退。

macOS 正式下载包需要 Developer ID 签名、公证和 stapling。Windows 正式下载包需要 Authenticode 签名。Studio 页面与前端自动测试不能证明这些发布条件已经满足。

## 使用步骤

macOS 和 Windows 共用相同的主流程，只在下载、系统授权和安装细节上展示平台差异：

1. 安装 Garmin Connect IQ SDK Manager。
2. 在 SDK Manager 中下载并激活 SDK 与目标 Garmin 设备。
3. 下载并安装 Wristo PRG Installer。
4. 返回 Studio，为当前目标设备构建 PRG。
5. 点击 `Preview in Simulator`，并在浏览器询问时允许打开 PrgInstaller。

页面必须明确说明：

- PRG 只适用于构建时选择的 Garmin 设备。
- 切换目标设备后需要重新构建 PRG。
- Simulator 验证通过不等于真机验证通过。
- 网页无法可靠确认用户是否取消了外部应用唤起。

## PRG 构建轻提示

轻提示只挂在 PRG 构建任务真正提交成功之后，不能在打开构建确认框、选择设备或提交失败时展示。普通 IQ 构建成功不能触发该提示。

第一次满足条件时，Studio 展示非阻塞通知，说明构建完成后可以使用 PrgInstaller 一键预览，并提供“下载与使用指南”操作。关闭通知或打开指南后，当前浏览器以后不再因 PRG 构建重复展示。

提示状态由一个小型存储工具管理，使用带版本的独立 `localStorage` key。存储读写异常时静默降级为当前页面会话内去重，不得影响 PRG 构建提交或成功反馈。此状态不写入用户资料，不新增后端字段，也不跨浏览器同步。

## Preview 故障入口

现有 Preview 行为保持：Actions 展开时预取一次性 ticket，用户点击后同步设置 `window.location.href` 为 `wristo-prg-installer://run?ticket=...`，同时保留现有 PRG 下载行为。引导功能不得把异步请求插入点击与 deep link 之间，以免丢失浏览器用户手势。

发起唤起后展示持续时间较长的非阻塞提示，文案为“PrgInstaller 没有打开？”并提供跳转到公开引导页的操作。该提示是排查入口，不代表 Studio 已检测出 PrgInstaller 未安装，也不延迟、取消或重试现有启动流程。

## 组件边界

- `PrgInstallerGuide.vue`：只负责引导页布局和平台切换。
- PrgInstaller 下载配置模块：规范化环境变量，返回两个平台的可展示状态。
- 首次提示状态工具：负责持久化和会话降级，不包含 UI。
- `MyDesigns.vue` 与现有提交对话框：在准确的 PRG 提交成功边界触发提示。
- 现有 DesignCard 与 ticket cache：保持 Preview 协议和安全行为，不承担引导页内容。

最终用户文案全部进入现有 Studio i18n，并同时提供英文和中文，不在页面模板中复制两套静态文本。

## 错误与降级处理

- 下载 URL 缺失：禁用对应平台下载按钮，教程仍可阅读。
- 平台无法识别：默认 macOS 标签，允许用户切换。
- `localStorage` 不可用：当前会话内最多提示一次，不阻断业务。
- ticket 预取或获取失败：继续使用现有 Preview 错误反馈，不把用户误导到安装问题。
- 浏览器拒绝自定义协议：不宣称检测成功或失败，仅持续提供安装与排查入口。
- 外部 SDK 或 Simulator 错误：页面给出可执行排查步骤，PrgInstaller 仍是实际状态与诊断的可信来源。

## 测试与验收

### 自动验证

- 未登录状态可以匹配并访问 `/prg-installer`。
- macOS 与 Windows 标签均存在，平台优先选择和手动切换正确。
- 两个平台 URL 独立启用；URL 缺失时下载按钮安全禁用。
- PRG 任务提交成功后出现一次提示，重复成功不再提示。
- 普通 IQ 构建、取消和失败不会触发 PrgInstaller 提示。
- 存储异常不会阻止构建成功流程。
- Preview 继续先消费已缓存 ticket，再同步打开 `wristo-prg-installer://`。
- Preview 排查入口可打开公开引导页，且不改变 ticket 或 PRG 下载逻辑。
- 中英文 key 完整，Studio 生产构建通过。

### 手工验收

- 登录和未登录浏览器均可打开并分享引导页。
- macOS 和 Windows 页面内容可读，下载按钮指向各自正式配置地址。
- 首次成功提交 PRG 后提示一次，刷新和再次构建不重复打扰。
- 点击 Preview 后 PrgInstaller 正常唤起；未安装或取消唤起时仍能进入排查页。

### 证明边界

Studio 单元测试与生产构建只能证明前端路由、配置和交互契约。它们不能证明 macOS Developer ID 签名、公证、Windows Authenticode、浏览器协议确认、真实 Garmin Simulator、真机运行或安装包线上可下载。正式发布时需要分别记录这些平台和运行时验收结果。
