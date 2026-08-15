# Wristo Studio 统一动态表达式引擎设计规范

日期：2026-08-15
状态：已确认

## 1. 背景与目标

Wristo Studio 已有 Metric Catalog、`dataProperty`、`goalProperty`、App Property、视觉主题和动态主题规则，但动态能力分散在不同入口。本文定义一套统一、类型安全、可预览的动态表达式引擎，用同一数据与执行模型控制：

- 元素可见性；
- 元素颜色；
- 图片变体；
- 动态内容；
- 全局主题。

产品默认提供可视化规则编辑器，同时为高级设计师提供表达式模式。表达式采用 WFB 风格短 Token，如 `(ds3)`，方便社区设计师迁移经验；内部使用 Wristo 语义化 Token ID，避免把外部短代码当作持久化主键。

首版仅注册 Wristo 当前真正支持的数据，不建立不可用的完整 WFB Token 目录，也不宣称完整兼容 WFB。对外表述应为：支持 WFB 风格 Token 语法及部分兼容 Token。

## 2. 设计原则

1. 可视化优先，高级表达式兜底。
2. 所有动态属性共用 Parser、AST、类型系统、预览器和代码生成器。
3. 短 Token 是交互语法；语义化 ID 是内部稳定身份。
4. 构建前完成语法、Token、类型、设备与资源校验。
5. 运行时失败必须回退，不允许单个表达式导致整个表盘崩溃。
6. 保持短路求值，只读取实际生效分支所需的数据。
7. 不替换现有 Metric Property，继续保持规范化指标绑定。
8. 动态图片只能选择构建期已打包的资源。
9. 每个动态属性只有一个运行时所有者，避免主题与元素规则竞争。
10. 表达式核心必须独立于 Vue、Canvas 和网络。

## 3. 总体架构

```text
Token Catalog
    ↓
Lexer / Parser
    ↓
Typed AST + Validator
    ├─ Visual Rule Editor
    ├─ Expression Editor
    └─ Preview Interpreter
    ↓
Dependency Analyzer
    ↓
Monkey C Generator
    ↓
Runtime Property Evaluation
    ├─ theme
    ├─ visibility
    ├─ image variant
    ├─ color
    └─ content
```

所有入口最终产生同一种类型化 AST。可视化规则不是另一套规则系统，预设规则也只是可编辑的 AST 模板。

## 4. Token Catalog

现有 Metric Catalog 上增加表达式元数据：

```ts
interface ExpressionTokenDefinition {
  id: string
  code: string
  label: string
  labelCn: string
  valueType: ExpressionType
  nullable: boolean
  unit?: string
  exampleValue: unknown
  source: 'metric' | 'system' | 'property' | 'wristo'
  supportedTargets: DynamicTarget[]
  updateFrequency: 'second' | 'minute' | 'event' | 'network'
  wfbEquivalent?: string
}
```

示例：

```json
{
  "id": "system.battery.level",
  "code": "ds3",
  "label": "Battery Level",
  "labelCn": "电池电量",
  "valueType": "number",
  "nullable": false,
  "unit": "%",
  "exampleValue": 76,
  "source": "system",
  "supportedTargets": ["visibility", "color", "content", "image", "theme"],
  "updateFrequency": "minute",
  "wfbEquivalent": "ds3"
}
```

新增 Token 必须同时提供稳定 ID、短代码、返回类型、空值规则、示例值、更新频率、设备约束和 Monkey C 生成方式。Wristo 专有 Token 使用 `wr` 命名空间，例如 `(wr.theme)`，避免与 WFB 后续编号冲突。

Token 选择器同时支持按英文名称、中文名称、短代码和单位搜索。表达式中显示短代码，悬停显示完整名称、类型、单位、示例和可用性。

## 5. 表达式语言

首版语法：

```text
Token       (ds3) (ds9) (prop.theme)
Literal     20 "night" true false null #FF0000
Arithmetic  + - * / %
Comparison  == != < <= > >=
Logic       && || !
Conditional condition ? a : b
Functions   isnull() coalesce() min() max() round()
```

首版不支持数组、对象访问、任意方法调用、自定义函数和自定义 Monkey C。不同类型不得进行危险的隐式转换，例如字符串 `"20"` 不自动转为数字 `20`。

函数语义：

```text
isnull(value)             → boolean
coalesce(value, fallback) → 与输入相容的非空类型
min(a, b)                 → number
max(a, b)                 → number
round(value)              → number
```

## 6. 持久化模型

设计文件同时保存原始表达式与类型化 AST：

```json
{
  "source": "(ds3) <= 20",
  "ast": {
    "type": "binary",
    "operator": "<=",
    "left": {
      "type": "token",
      "tokenId": "system.battery.level",
      "code": "ds3"
    },
    "right": {
      "type": "literal",
      "valueType": "number",
      "value": 20
    }
  },
  "resultType": "boolean",
  "version": 1
}
```

- `source` 用于高级编辑器显示和可读导出。
- `ast` 是校验、预览、依赖分析和代码生成的依据。
- `tokenId` 是稳定身份，`code` 用于保留输入可读性。
- `version` 支持后续 AST 迁移。
- 旧数据只有 `source` 时重新解析；短代码变化时以 `tokenId` 为准。

动态属性统一使用：

```ts
type DynamicValue<T> =
  | { mode: 'literal'; value: T }
  | { mode: 'expression'; expression: TypedExpression; fallback: T }
```

`fallback` 必须存在，用于无数据、不支持设备、迁移异常、资源缺失和受控计算错误。

## 7. 与现有指标属性的关系

表达式系统不替换 `dataProperty` 和 `goalProperty`：

- Metric Property 继续负责让用户选择显示哪个指标。
- 元素继续通过规范化 Metric Property 获得图标、标签、单位和默认值。
- 表达式 Token 可以读取 Metric Property 当前选中的数据。
- App Property 以 `(prop.xxx)` 参与表达式。
- 表达式不得绕过 Metric Catalog 发明未注册指标。

## 8. 可视化规则编辑器

每个支持动态控制的属性提供统一的动态入口。默认打开可视化模式：

```text
[Battery Level (ds3)] [is less than or equal to] [20]
```

条件编辑器支持：

- `All`（AND）与 `Any`（OR）；
- 最多一层嵌套条件组；
- 数字、文本、布尔、颜色、枚举与空值比较；
- Token 与常量比较；
- 同类型 Token 之间比较；
- 有顺序的 If / Else If / Else 分支。

分支从上到下匹配，第一个满足条件的分支生效：

```text
1. If battery <= 10      → Critical
2. Else if battery <= 20 → Warning
3. Else                  → Normal
```

预设包括 Always、High Power、Low Power / AOD、During Day、During Night、Battery Low、Goal Reached、Data Available 和 App Setting Equals。预设展开后仍可编辑实际条件。

## 9. 高级表达式编辑器

编辑器提供 Token 搜索与插入、自动补全、括号匹配、格式化、悬停说明、返回类型检查、示例值预览和运行成本提示。

属性声明期望返回类型：

```text
visible      boolean
color        color
imageVariant asset
theme        theme
content      string | number
```

可视化模式永远可以转为表达式模式。表达式 AST 能表示为条件分支时可以无损转回可视化模式；包含可视化编辑器不支持的结构时禁止直接切换，只允许用户确认后简化。

## 10. 属性执行顺序与优先级

运行时更新顺序：

```text
1. 获取运行状态与必要 Token
2. 计算 Theme
3. 解析主题变量
4. 计算元素 Visibility
5. 对可见元素计算 Image Variant
6. 计算 Color 与 Content
7. 绘制
```

属性值的回退顺序：

```text
动态表达式结果
  → 当前主题变量
  → 元素设计值
  → 属性 fallback
```

元素颜色必须明确选择设计值、主题值或表达式作为唯一运行时所有者，不允许多个来源同时覆盖。

## 11. 图片变体

首版表达式不返回文件路径或 URL，只能返回预先声明并打包的 Asset ID：

```text
battery-normal
battery-low
battery-critical
```

构建期校验资源存在性、图片数量、设备格式、内存预算以及 MIP/AMOLED 对应资源。运行时仅在已打包变体之间切换。

## 12. 动态主题

每个设计最多存在一个 Active Theme Expression，返回已声明的 `themeId`。主题可由日出日落、功耗状态、App Property、电池、时间或其他已支持 Token 驱动。

```json
{
  "activeTheme": {
    "mode": "expression",
    "expression": "...",
    "fallback": "default"
  }
}
```

现有 Visual Theme 与 Dynamic Theme Rule 最终迁移到这一入口，继续保持互斥，不增加第三套主题控制路径。

## 13. 静态与动态绘制

- 无动态属性的元素继续参与静态合并。
- 只有高低功耗切换的元素可参与相应静态分层优化。
- 使用任意 Visibility、Color 或 Image 表达式的元素自动标记为运行时动态元素。
- Studio 自动处理，不要求用户理解或手动选择 Layer Object。
- 编辑器显示依赖 Token、更新频率和低中高运行成本提示。

## 14. 依赖分析与短路

编译器从 AST 提取 Token 依赖，并保持 `&&`、`||` 和条件分支的短路语义。不可见元素不计算其图片、颜色和内容表达式；未选中的分支不获取数据。不得采用会预先计算所有候选 Token 的数组选择实现。

## 15. 校验与错误处理

构建前执行：

1. 语法检查；
2. Token 存在性与支持范围检查；
3. 类型与 nullable 检查；
4. 目标属性返回类型检查；
5. 设备、SDK、权限和资源检查。

nullable Token 未显式处理时给出警告，不直接阻止构建；运行时无数据使用 fallback。Token 不支持、计算异常、返回类型异常和资源缺失也使用 fallback，且不得让整个表盘崩溃。

## 16. 动态预览

Canvas 提供 Default、Live Sample、Minimum、Maximum、No Data 和 Custom 模式。Custom 模式只列出当前设计实际依赖的 Token，可修改示例值并立即重新计算主题、可见性、颜色、图片和内容。

预览必须执行同一份 AST 及同一类型语义，不另写一套规则逻辑。

## 17. WFB 兼容策略

- 首版只注册 Wristo 已支持并能保证语义的数据。
- 已支持的 WFB Token 正常解析。
- 已知但不支持的 WFB Token 显示明确错误和可能的 Wristo 替代项。
- 未知 Token 作为错误处理，不静默替换。
- 可提供 Paste WFB Expression 入口，但只解析受支持子集。
- 不承诺 WFB 数组、对象、方法、Custom Code 或完整设计导入。

## 18. 旧设计兼容

- 现有 `visible`、`color`、`image` 和主题配置视为 literal。
- 现有高低功耗配置迁移为系统预设规则。
- 现有动态主题规则迁移为 Theme Expression。
- 迁移失败时保留旧配置，不覆盖原设计。
- 新格式必须携带 schema version，迁移过程需可重复执行。

## 19. 分阶段交付

### 阶段 1：表达式基础设施与 Visibility

Token Catalog、Parser、Typed AST、类型检查、解释器、Monkey C 生成器、高级编辑器和 Visibility 全链路。

### 阶段 2：可视化规则与动态预览

条件编辑器、分支、预设、双模式转换、模拟 Token 和 Canvas 即时预览。

### 阶段 3：颜色与图片变体

动态颜色、Image Variant、资源校验、MIP/AMOLED 资源、静态/动态分类和性能提示。

### 阶段 4：动态主题统一

`themeId` 类型、Active Theme Expression、现有主题能力迁移、主题变量解析和所有权规则。

## 20. 验证标准

核心单元测试覆盖解析优先级、Token 映射、类型推导、nullable、短路、fallback、AST 升级、Monkey C 生成、可视化双向转换和复杂度限制。

每个 Token 必须有契约测试，覆盖短代码、返回类型、nullable、示例值、生成代码、设备范围和更新频率。

集成测试覆盖保存重开、复制粘贴、撤销重做、旧设计迁移、资源导出、不支持设备、主题冲突以及 MIP/AMOLED 图片变体。

设备验证至少覆盖一台 MIP 和一台 AMOLED 设备，以及高低功耗、无数据、App Property 修改、秒级/分钟级更新和多分支图片/主题切换。

## 21. 首版非目标

- 完整 WFB Token 或表达式兼容；
- 数组与对象访问；
- 任意方法调用、自定义函数或自定义 Monkey C；
- 运行时网络图片；
- 动态字体、位置、尺寸和旋转；
- 无限条件嵌套；
- 多个同时生效的主题规则。

## 22. 完成定义

只有当同一表达式能在 Studio 校验、Canvas 预览、设计持久化、导出生成和真实 Garmin 运行中保持一致语义，并在无数据或不支持设备上可靠回退时，统一动态表达式引擎才视为完成。
