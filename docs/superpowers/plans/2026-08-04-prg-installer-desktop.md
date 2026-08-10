# PRG Installer Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 macOS 与 Windows 双平台本地助手，用一次点击下载并在 Garmin Connect IQ Simulator 中运行指定 PRG。

**Architecture:** 新建独立仓库 `wristo-prg-installer`，采用 Tauri 2、Vue 3和 Rust。Rust层负责协议、API、SDK检测、校验和无 shell子进程；Vue界面只展示状态、错误和设置。

**Tech Stack:** Tauri 2、Rust、Vue 3、TypeScript、Vite、Vitest、Cargo test

---

### Task 1: 创建最小 Tauri 应用与仓库边界

**Files:**
- Create: `wristo-prg-installer/package.json`
- Create: `wristo-prg-installer/src/main.ts`
- Create: `wristo-prg-installer/src/App.vue`
- Create: `wristo-prg-installer/src-tauri/Cargo.toml`
- Create: `wristo-prg-installer/src-tauri/tauri.conf.json`
- Create: `wristo-prg-installer/src-tauri/src/lib.rs`
- Create: `wristo-prg-installer/README.md`

- [ ] 使用 Tauri 2官方 scaffold创建 Vue/TypeScript应用，应用标识使用 `cn.wristo.connectiq-prgInstaller`。
- [ ] 配置 `wristo-prg-installer` deep-link scheme；开发环境保留显式测试入口。
- [ ] README记录 Node 22、Rust、macOS/Windows打包依赖及不使用 shell的安全约束。
- [ ] 运行 `npm run build` 与 `cargo test --manifest-path src-tauri/Cargo.toml`。
- [ ] 初始化独立 Git仓库并提交 `chore: scaffold Connect IQ prgInstaller`；不得把它提交到其他 Wristo仓库。

### Task 2: 解析白名单协议命令

**Files:**
- Create: `wristo-prg-installer/src-tauri/src/deep_link.rs`
- Modify: `wristo-prg-installer/src-tauri/src/lib.rs`
- Test: inline Rust unit tests in `deep_link.rs`

- [ ] 先写失败测试，覆盖 `run?ticket=`、`health`、未知命令、空票据、额外 host和非 `wristo-prg-installer` scheme。
- [ ] 实现 `DeepLinkCommand::{Run { ticket }, Health}`，限制 ticket为 URL-safe Base64字符且长度在 32至128之间。
- [ ] deep link不得接收 URL、deviceId、文件路径或命令字段。
- [ ] 运行 `cargo test` 并提交 `feat: validate prgInstaller deep links`。

### Task 3: 实现 API兑换与安全下载

**Files:**
- Create: `wristo-prg-installer/src-tauri/src/api.rs`
- Create: `wristo-prg-installer/src-tauri/src/download.rs`
- Create: `wristo-prg-installer/src-tauri/src/model.rs`
- Test: Rust unit tests with a local mock HTTP server

- [ ] 先写失败测试，覆盖兑换成功、HTTP失败、超时、非 HTTPS下载 URL、非 Wristo允许 host和日志脱敏。
- [ ] API base URL只能来自编译配置或用户不可写的应用配置，禁止 deep link覆盖。
- [ ] 下载 URL必须为 HTTPS且 host在 API响应允许的 Wristo/CDN白名单中。
- [ ] 将 PRG下载到应用缓存目录的临时文件，完成校验后原子改名为 `<releaseId>/<deviceId>/<version>.prg`。
- [ ] 运行 `cargo test` 并提交 `feat: exchange and download prgInstaller runs`。

### Task 4: 校验 PRG完整性

**Files:**
- Create: `wristo-prg-installer/src-tauri/src/checksum.rs`
- Modify: `wristo-prg-installer/src-tauri/src/download.rs`
- Test: inline Rust unit tests

- [ ] 先写 SHA-256匹配、不匹配、MD5兼容及无校验值拒绝的测试。
- [ ] 优先使用 SHA-256；只有服务端未提供 SHA-256时允许 MD5。
- [ ] 校验失败删除临时文件并返回稳定错误码 `PRG_CHECKSUM_MISMATCH`。
- [ ] 运行测试并提交 `feat: verify downloaded PRG files`。

### Task 5: 检测 Garmin SDK与目标设备

**Files:**
- Create: `wristo-prg-installer/src-tauri/src/sdk.rs`
- Test: `wristo-prg-installer/src-tauri/tests/sdk_detection.rs`

- [ ] 使用临时目录fixture写 macOS和 Windows `current-sdk.cfg` 测试，覆盖空文件、无效目录、路径空格和中文。
- [ ] 把平台配置路径解析与文件系统验证分开，便于非目标平台测试。
- [ ] 验证 SDK目录中的 `bin/connectiq`、`bin/monkeydo` 对应平台文件存在。
- [ ] 根据 SDK设备目录验证 `deviceId`，不得仅使用正则接受设备。
- [ ] 支持用户在设置中选择 SDK目录作为兜底，并再次执行同一验证。
- [ ] 运行测试并提交 `feat: detect active Garmin SDK`。

### Task 6: 启动或复用 Simulator并运行 PRG

**Files:**
- Create: `wristo-prg-installer/src-tauri/src/simulator.rs`
- Test: `wristo-prg-installer/src-tauri/tests/simulator_process.rs`

- [ ] 使用假的 `connectiq`/`monkeydo`可执行 fixture写失败测试，捕获实际参数数组。
- [ ] 使用 `std::process::Command`直接传参，不通过 `sh`、`cmd.exe`或 PowerShell。
- [ ] Simulator未运行时启动并轮询就绪；已运行时复用。就绪检测封装为平台策略，超时返回 `SIMULATOR_START_TIMEOUT`。
- [ ] 对同一窗口运行请求串行化，忙碌时返回 `RUN_IN_PROGRESS`。
- [ ] 捕获并脱敏 stdout/stderr，保留可复制诊断信息。
- [ ] 运行测试并提交 `feat: run PRG in Garmin simulator`。

### Task 7: 实现普通设计师状态界面

**Files:**
- Create: `wristo-prg-installer/src/components/RunStatus.vue`
- Create: `wristo-prg-installer/src/components/SettingsPanel.vue`
- Create: `wristo-prg-installer/src/stores/run.ts`
- Modify: `wristo-prg-installer/src/App.vue`
- Test: `wristo-prg-installer/src/components/RunStatus.test.ts`

- [ ] 先写组件测试，覆盖检测、下载、校验、启动、运行成功和全部稳定错误码。
- [ ] 每个错误显示一条普通用户说明及一个明确动作；完整底层信息放在可展开诊断区。
- [ ] 提供“复制诊断信息”，确认内容不含 ticket、Authorization或签名查询参数。
- [ ] 设置页显示版本、当前 SDK、缓存位置、手动 SDK选择和新版下载入口。
- [ ] 运行 `npm run test:unit` 与 `npm run build`，提交 `feat: add prgInstaller run status UI`。

### Task 8: 配置签名安装包与双平台验收

**Files:**
- Modify: `wristo-prg-installer/src-tauri/tauri.conf.json`
- Create: `wristo-prg-installer/docs/release.md`
- Create: `wristo-prg-installer/scripts/verify-package.sh`
- Create: `wristo-prg-installer/scripts/verify-package.ps1`

- [ ] 配置 macOS universal或分别架构包、Developer ID和 notarization参数；秘密仅使用 CI环境变量。
- [ ] 配置 Windows 10/11安装包及 Authenticode签名参数。
- [ ] 验证安装、`wristo-prg-installer://health`、卸载协议清理和浏览器外部应用确认。
- [ ] 在真实 macOS与 Windows上执行 Studio→PrgInstaller→真实 Simulator端到端测试并记录版本和结果。
- [ ] 未具备签名证书或 Windows环境时明确标记为发布阻塞，不把本机构建称为双平台完成。
- [ ] 提交 `build: configure signed prgInstaller packages`。
