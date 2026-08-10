# Studio Connect IQ 本地一键测试设计

## 背景与目标

Wristo Studio 已支持按 Garmin 设备生成 PRG，并在产品发布数据中保留 `prgUrl`、`deviceId`、版本、文件大小和校验值。当前用户仍需自行下载文件、安装和配置 Connect IQ SDK，并通过命令行启动 Simulator 和 `monkeydo`。这对普通设计师门槛过高。

本功能面向不熟悉终端的普通设计师，提供 macOS 和 Windows 双平台的一键测试流程：用户首次安装 Wristo PRG Installer，此后从 Studio 点击“在模拟器中测试”，即可自动下载目标设备 PRG、启动 Garmin Connect IQ Simulator 并运行表盘。

Garmin 官方运行链路仍是 `connectiq` 启动 Simulator，再由 `monkeydo <prg> <deviceId>` 加载程序。PrgInstaller 只封装该链路，不替代 Garmin SDK，也不改变 PRG 与目标设备一一对应的约束。

## 范围

### 第一阶段包含

- Studio 增加“在模拟器中测试”主操作，保留“下载 PRG”高级操作。
- Studio 增加 macOS 和 Windows 安装、检测及使用说明。
- API 提供短时、一次性启动票据的创建与兑换。
- 提供 macOS 和 Windows 版 Wristo PRG Installer。
- PrgInstaller 自动检测当前激活的 Garmin Connect IQ SDK。
- PrgInstaller 下载、校验并缓存 PRG。
- PrgInstaller 启动或复用 Simulator，并调用 `monkeydo` 加载正确设备。
- PrgInstaller 展示运行状态、可操作错误和可复制诊断信息。
- 提供已签名的双平台安装包。

### 第一阶段不包含

- 自动安装 Garmin Connect IQ SDK。
- Simulator 时间、活动状态或模拟数据控制。
- Monkey C 断点调试。
- 向真机安装 PRG。
- 自动上传本地日志。
- 后台托盘常驻。
- 自动更新。第一版仅提供版本提示和新版下载入口。

## 总体架构

系统由 Studio、Wristo API、PrgInstaller 和 Garmin Connect IQ SDK 四部分组成。

1. Studio 请求 API 创建一次性启动票据。
2. Studio 通过 `wristo-prg-installer://run?ticket=<ticket>` 唤起 PrgInstaller。
3. PrgInstaller 使用票据向 API 兑换本次运行所需的发布信息。
4. PrgInstaller 下载 PRG并校验文件完整性。
5. PrgInstaller检测当前激活 SDK及目标设备支持情况。
6. PrgInstaller启动或复用 Connect IQ Simulator。
7. PrgInstaller执行 `monkeydo <local-prg-path> <deviceId>`。
8. PrgInstaller窗口展示执行状态和诊断输出。

网页不直接访问本地文件，也不执行本机命令。自定义协议是网页与本地助手之间唯一的启动入口。

## Studio 交互设计

### PRG操作区

PRG生成完成后显示：

- 主按钮：`在模拟器中测试`
- 次按钮：`下载 PRG`
- 辅助入口：`首次使用？安装本地助手`

PRG尚未生成时禁用一键测试，并提示：`请先选择设备并生成测试程序`。打包过程中继续显示已有的队列和构建状态。

点击主按钮后，Studio先创建启动票据，再打开自定义协议，同时显示非阻塞启动弹窗：

- 初始状态：`正在打开 Wristo PRG Installer…`
- 辅助操作：`重新打开`
- 故障入口：`没有反应？安装或检查 PrgInstaller`
- 高级操作：`下载 PRG`

浏览器无法可靠判断用户是否取消了外部应用确认，因此不能仅依赖超时宣称 PrgInstaller 未安装。超时后只展示排查入口，不覆盖用户已经开始的本地运行。

### 安装与使用说明

说明提供三个常驻入口：

1. PRG操作区的首次使用提示。
2. 启动弹窗中的安装与检查入口。
3. Studio帮助菜单中的 `Connect IQ 本地测试`。

说明弹窗根据浏览器平台优先展示 macOS或 Windows 标签页，同时允许手动切换。

macOS与 Windows均采用五步主流程：

1. 安装 Garmin Connect IQ SDK Manager。
2. 在 SDK Manager 中下载并激活一个 SDK。
3. 下载并安装 Wristo PRG Installer。
4. 完成系统对外部应用和自定义协议的首次确认。
5. 返回 Studio，点击“在模拟器中测试”。

说明必须明确：

- 不需要安装 VS Code，也不需要使用终端。
- PRG只适用于生成时选择的 Garmin 设备。
- 更换测试设备后必须重新生成对应设备的 PRG。
- Simulator测试通过不等于真机通过，发布前仍需真机验证。
- 显示当前 PrgInstaller版本、支持系统和说明更新时间。

### PrgInstaller检测

安装说明提供 `检测 PrgInstaller` 按钮，通过 `wristo-prg-installer://health` 唤起助手。检测成功以 PrgInstaller自身展示“已就绪”为第一阶段的可靠反馈。Studio页面不把浏览器协议唤起超时作为准确安装状态。

若后续确需在网页内显示检测结果，可扩展为带随机 nonce 的 localhost 回调；该扩展不属于第一阶段，避免引入本地端口、CORS和防火墙复杂度。

## API 与票据设计

### 创建启动票据

Studio使用当前登录态请求创建票据。API必须验证用户对设计及对应 PRG发布记录的访问权限，并将发布记录、用户和用途绑定到票据。

票据要求：

- 有效期建议为两分钟。
- 只能成功兑换一次。
- 使用高熵随机值，不在票据文本中暴露发布信息。
- 只能用于 PrgInstaller运行用途，不能复用为通用下载凭证。

### 兑换启动信息

PrgInstaller兑换后获得：

```json
{
  "releaseId": 123,
  "appName": "Example Face",
  "deviceId": "fenix8",
  "releaseVersion": "1.2.0",
  "prgUrl": "https://example.invalid/signed-prg-url",
  "sha256": "hex-encoded-sha256",
  "expiresAt": 1785811200000
}
```

下载地址应使用短时签名 HTTPS URL。现有 `packageMd5` 可用于兼容已有发布数据，但新打包和新接口应增加 SHA-256，PrgInstaller优先校验 SHA-256。

兑换接口必须区分无效、过期、已使用和无权访问，但对客户端错误文案不泄露其他用户或发布记录是否存在。

## PrgInstaller 设计

### 技术选型

推荐使用 Tauri 构建 PrgInstaller，以一套前端界面配合 Rust原生层支持 macOS和 Windows。该工具职责单一，不需要 Electron完整运行时。最终选型仍需在实施计划中验证 Tauri 对双平台自定义协议注册、代码签名和子进程控制的支持版本。

### 内部模块

- 协议处理：仅处理白名单命令 `run` 和 `health`。
- API客户端：兑换一次性票据，下载经过授权的 PRG。
- SDK检测：读取 Garmin SDK Manager 当前激活 SDK配置。
- 文件管理：按 release和 device隔离缓存文件。
- 完整性校验：校验 SHA-256，兼容已有 MD5。
- Simulator控制：启动或复用 `connectiq`，等待就绪后调用 `monkeydo`。
- 状态窗口：展示检测、下载、校验、启动和运行状态。
- 诊断日志：显示经过脱敏的输出，并支持一键复制。
- 设置：显示 PrgInstaller版本、当前 SDK、缓存位置和新版下载入口。

### SDK检测

PrgInstaller应优先读取 SDK Manager维护的当前 SDK配置，而不是要求用户设置环境变量。

macOS候选配置位置：

```text
~/Library/Application Support/Garmin/ConnectIQ/current-sdk.cfg
```

Windows候选配置位置：

```text
%APPDATA%\Garmin\ConnectIQ\current-sdk.cfg
```

检测后必须验证 SDK目录、`connectiq`、`monkeydo` 和目标设备定义确实存在。若自动检测失败，允许用户手动选择 SDK目录作为兜底，并持久化该选择。路径包含空格或中文时必须正常工作。

### Simulator启动

- 若 Simulator未运行，启动 `connectiq` 并等待可用状态。
- 若 Simulator已运行，直接复用，不创建重复进程。
- 就绪后以独立参数调用 `monkeydo`，不通过 shell拼接命令。
- 同一时间只处理一个前台运行任务；新任务到达时明确提示替换或等待，第一阶段默认串行。
- `monkeydo`输出保留在本次运行详情中，关闭 PrgInstaller后无需长期保存敏感日志。

## 安全设计

- 自定义协议只接受固定命令和 ticket，不接受可执行路径、命令文本、PRG URL或 deviceId。
- ticket短时有效、一次使用并绑定用途。
- PrgInstaller只连接 Wristo配置的 HTTPS API。
- PRG只从 API签发的 HTTPS地址下载。
- PRG完整性校验失败时立即停止，不调用 `monkeydo`。
- SDK可执行文件路径只能来自已验证的 SDK目录。
- 子进程调用使用参数数组，不经过 shell。
- `deviceId`来自已授权发布记录，并同时校验格式及当前 SDK中的设备定义。
- 日志隐藏 ticket、Authorization、签名 URL参数及用户身份信息。
- 缓存目录由 PrgInstaller独占管理，不执行用户任意选择的 PRG。

## 错误处理

所有错误均提供面向普通设计师的说明和下一步操作：

| 场景 | 用户提示与操作 |
| --- | --- |
| 未找到 SDK Manager或 SDK | 提供 Garmin SDK Manager下载入口 |
| SDK未激活 | 提供“打开 SDK Manager”操作 |
| SDK不包含目标设备 | 显示设备 ID，提示升级或切换 SDK |
| ticket过期或已使用 | 提示返回 Studio重新点击测试 |
| 无权访问 | 提示重新登录 Studio并确认设计权限 |
| PRG下载失败 | 提供重试，保留脱敏网络诊断 |
| PRG校验失败 | 删除异常缓存，不运行文件，提供重新下载 |
| Simulator启动超时 | 提供重试、打开 SDK Manager和复制诊断信息 |
| `monkeydo`失败 | 展示友好摘要并允许复制完整脱敏输出 |

## 分发要求

- macOS提供适配 Apple Silicon和 Intel的正式安装包，使用 Developer ID签名并完成 notarization。
- Windows支持 Windows 10和 Windows 11，安装包使用 Authenticode代码签名。
- 安装和卸载必须正确注册或移除 `wristo-prg-installer://` 协议。
- Studio下载页必须通过 HTTPS提供安装包、版本号、支持系统和校验信息。
- 未完成签名的构建只能用于内部测试，不能作为普通设计师正式安装包。

## 测试与验收

### Studio

- PRG未生成时不能启动测试，提示准确。
- PRG可用时可创建票据并唤起自定义协议。
- 用户取消浏览器外部应用确认后仍可重试或进入安装说明。
- 安装说明可从 PRG区域、启动弹窗和帮助菜单进入。
- macOS与 Windows说明切换正确，中英文文案完整。
- 原有 PRG下载功能不受影响。

### API

- 正常票据只能兑换一次。
- 过期、重复、伪造和用途不符的票据被拒绝。
- 用户不能为无权访问的设计或 PRG创建票据。
- 兑换结果中的 release、device和校验值来自同一发布记录。
- 下载 URL短时有效，日志不记录敏感完整参数。

### PrgInstaller

- 已安装并激活 SDK的用户无需 VS Code或终端即可运行 PRG。
- macOS Intel、macOS Apple Silicon、Windows 10和 Windows 11均完成安装、协议唤起、SDK检测和 PRG运行验证。
- Chrome、Edge和 Safari覆盖允许及取消外部应用确认的流程。
- Simulator未运行时能启动，已运行时能复用。
- SDK未安装、未激活或缺少目标设备时提示准确。
- 正常、过期、重复和无权票据处理符合安全要求。
- PRG下载失败或校验失败时绝不执行异常文件。
- 文件路径包含空格或中文时能够运行。
- 诊断信息可复制且不包含票据、认证信息或签名 URL参数。

## 完成边界

自动化测试、Studio构建、API测试和 PrgInstaller单元测试只能证明对应代码路径。最终完成必须包含签名安装包在真实 macOS与 Windows环境中的安装测试，以及由 Studio点击、浏览器确认、PrgInstaller下载、真实 Garmin Simulator启动并运行目标 PRG的端到端验证。Simulator通过仍不能替代 Garmin真机验证。
