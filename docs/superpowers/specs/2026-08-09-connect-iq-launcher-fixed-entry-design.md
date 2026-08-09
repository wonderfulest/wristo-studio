# Connect IQ Launcher 固定入口设计

## 目标

在 Wristo Studio 中提供一个始终容易找到的 Connect IQ Launcher 安装与使用指南入口，同时保留构建和预览 PRG 后出现的上下文提示入口。

## 入口位置

在全局顶部导航栏中增加 `Connect IQ Launcher`，放在 `Creator Academy` 后面。该入口使用桌面应用或下载语义的图标，点击后通过命名路由 `ConnectIqLauncherGuide` 打开现有 `/connect-iq-launcher` 页面。

入口由 `AppHeader.vue` 提供，因此在当前会展示全局页头的 Studio 页面中保持可见。Launcher 引导页本身是公开路由，入口不增加登录或角色限制。

## 交互

- 点击入口直接进入 Launcher 指南，不弹出保存或离开确认框。
- 不打开新窗口，不引入新的页面或下载逻辑。
- 保留 `MyDesigns.vue` 中构建或预览 PRG 后的临时通知入口。
- 使用 i18n 文案，至少覆盖当前 `i18n.ts` 已维护的语言区域，不在模板中写死用户可见文本。

## 范围

本次只增加顶部导航入口及其必要的国际化文案和测试，不修改 Launcher 下载配置、安装指南内容、PRG 构建、票据或深链流程。

## 验证

- 组件测试确认点击固定入口会导航到 `ConnectIqLauncherGuide`。
- 现有 Launcher 路由和指南页测试继续通过。
- 运行相关测试，并执行 Studio 构建验证 TypeScript 和模板编译。
