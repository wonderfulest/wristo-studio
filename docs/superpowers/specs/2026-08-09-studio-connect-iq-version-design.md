# Studio 统一版本进入 Connect IQ 包设计

## 目标

为 Wristo Studio 建立统一的语义化版本机制。发版人显式选择 `major`、`minor` 或 `patch` 升级 Studio 版本；升级后的版本成为后续生成的所有 Connect IQ IQ/PRG 包的统一平台版本，并在 Garmin Connect IQ 手机端的表盘设置页中只读展示。

本功能不为单个表盘维护独立版本，不自动修改历史包，也不在升级版本时执行 Git 提交、标签或推送。

## 唯一版本源

`wristo-studio/package.json` 的顶层 `version` 是平台版本的唯一人工维护来源，格式必须是无前缀的三段 SemVer，例如 `1.2.3`。

`package-lock.json` 保持与 `package.json` 同步，但不是独立版本源。Connect IQ 模板、构建脚本和环境文件不得再维护可独立修改的默认版本号；现有 `release.j2.json` 中固定的 `1.0.0` 必须被模板变量替代。

## Studio 版本升级命令

在 `wristo-studio` 提供 `npm run version:bump`。命令使用 Node 实现交互，显示当前版本，并要求发版人选择：

- `major`：`1.2.3` → `2.0.0`
- `minor`：`1.2.3` → `1.3.0`
- `patch`：`1.2.3` → `1.2.4`

确认选择后，命令通过 npm 的无 Git 标签版本升级能力更新 `package.json` 和 `package-lock.json`。执行成功后输出旧版本、新版本和被修改的两个文件，然后停止。

命令不得提交、打标签、推送、发布 npm 包、构建 Studio 或构建 Connect IQ 镜像。取消输入、非法选择、非标准当前版本或 npm 更新失败时应返回非零状态，且不得报告成功。

现有 package 文件包含用户尚未提交的 Node 24 修改，实施必须保留这些修改，不能用旧版本覆盖整个文件。

## Connect IQ 构建镜像传播

生产打包容器当前只以 `wristo-connectiq-app-build` 为 Docker 构建上下文，不能在运行时读取 Studio 仓库。因此版本在发布 Connect IQ 构建镜像时固化，而不是在每个打包任务中跨仓库读取。

`wristo-tools/prod-tasks/app-build/build-connectiq-images.sh` 在构建 app-build 镜像时读取同一工作区下 `wristo-studio/package.json`：

1. 读取顶层 `version`。
2. 严格校验三段 SemVer。
3. 将其作为 Docker build argument 传给 `wristo-connectiq-app-build/Dockerfile`。
4. Dockerfile 将版本保存为镜像内生成器可读取的固定值。

读取失败或版本非法时，镜像构建立即失败，不使用 `1.0.0`、`0.0.0`、`latest`、Git SHA 或日期作为静默回退。

该设计意味着 Studio 发版流程必须在升级版本后发布对应的 app-build 镜像，并让生产 worker 使用该镜像。仅升级 npm 文件不会改变正在运行的旧镜像。

## 本地生成传播

生成器将版本解析集中在一个入口中，并向最终 `all.json` 增加 `studioVersion`。解析顺序为：

1. 显式传入的 `WRISTO_STUDIO_VERSION`，用于容器和可控测试。
2. 本地工作区同级 `wristo-studio/package.json`，用于正常的非容器本地生成。

两个来源都使用相同的三段 SemVer 校验。无法解析时生成立即失败，不生成带错误版本的项目。环境变量优先使镜像内的固化版本不依赖宿主目录布局；本地回退则保持现有生成命令易用。

版本只作为生成元数据和只读设置值，不参与 Monkey C 运行逻辑，也不写入用户可修改的设计配置。

## 生成物与设置页

同一个 `studioVersion` 写入以下生成物：

1. `release.json.version`，替代固定的 `1.0.0`。
2. `resources/settings/properties.xml` 中新增只读展示所需的字符串属性 `AppVersion`。
3. `resources/settings/settings.xml` 中新增 `App Version` 设置项，紧跟在现有 `App Name` 之后，使用 `alphaNumeric` 和 `readonly="true"`。

设置项只展示版本值，例如 `1.2.3`，用户不能编辑。标题 `AppVersionTitle` 进入现有的 Connect IQ 本地化资源生成链路，并为所有现有 locale 提供对应翻译。版本号本身不本地化。

旧包不会被原地改变；只有在新版本生效后重新生成的 IQ/PRG 才包含该版本和设置项。

## 数据流

```text
wristo-studio/package.json
          |
          +-- npm run version:bump --> package-lock.json 同步
          |
          +-- build-connectiq-images.sh
                    |
                    v
             Docker build arg
                    |
                    v
          app-build 镜像固定版本
                    |
                    v
            generate-project.sh
                    |
                    v
          all.json.studioVersion
             /             \
            v               v
 release.json.version   properties.xml + settings.xml
                                |
                                v
                 Garmin Connect IQ 手机端设置页
```

本地生成跳过镜像构建，从同级 Studio package 文件解析版本后进入相同的 `all.json.studioVersion` 路径。

## 错误处理

- 版本升级：拒绝非三段 SemVer 和非 `major/minor/patch` 输入。
- 镜像构建：Studio package 不存在、JSON 无效、版本缺失或格式错误时终止。
- 项目生成：环境变量和本地 package 均不可用，或任一选中来源无效时终止。
- 模板渲染：`studioVersion` 缺失时测试应失败；生产生成不得用 Jinja 默认值掩盖传播错误。
- 版本值只允许 SemVer 数字三段，不接收 `v1.2.3`、预发布标识或 build metadata，避免 Garmin 展示和发布命名出现多种格式。

## 验证范围

自动验证包括：

- 版本升级脚本对 major、minor、patch、取消和非法当前版本的行为；验证只修改两个 package 文件。
- app-build 镜像构建脚本读取和校验 Studio 版本，并传递正确 Docker 参数。
- 生成器对环境变量优先、本地 package 回退、缺失和非法版本的处理。
- Jinja 模板将相同版本写入 `release.json`、properties 和只读 settings。
- 本地化生成覆盖全部现有 locale，且生成的 XML 可解析。
- shell 语法检查、相关 Python/Node 测试和 diff whitespace 检查。

自动测试和模板渲染只能证明源代码、传播契约与生成物结构，不能证明生产镜像已发布、worker 已切换镜像、历史包已重建，或 Garmin Connect IQ 手机端已实际显示。后四项需要分别执行并记录运行态验证。

## 发版操作边界

建议的人工发版顺序为：

1. 在 Studio 执行 `npm run version:bump` 并选择升级级别。
2. 审阅并提交两个 package 文件及对应 Studio 发布内容。
3. 使用现有 Connect IQ 镜像发布脚本构建带该版本的 app-build 镜像。
4. 显式更新生产 worker 的 `WRISTO_BUILD_IMAGE` 并按现有发布流程重启或切换。
5. 新建一个 IQ/PRG 包，核对构建日志、`release.json` 和 Garmin Connect IQ 设置页。

本功能的实施与验证不自动执行第 2 至第 5 步中的提交、推送、镜像发布、生产配置更新、worker 重启或生产打包任务。
