# Sub-dial Dial Property 设计

## 1. 目标与范围

Studio 创建 `subDial` 时，用户先选择 `Goal` 或 `Range`，再创建或绑定同类型的全局 `Dial Property`。Dial Property 负责选择具体数据变量；后台负责配置每个数据类型支持的 Dial 模式及 Range 边界，使新增数据类型不依赖 Studio 硬编码白名单。

本期不支持 `Auto`、Studio 自定义 Range、Cycle、Goal/Range 自动回退，也不允许不同类型的 Sub-dial 与 Dial Property 交叉绑定。

## 2. 核心模型

```ts
type DialProgressMode = 'goal' | 'range'

interface DialProperty {
  key: string
  type: 'dial'
  dialMode: DialProgressMode
  title: string
  options: DialDataTypeOption[]
  value: number | string
}

interface SubDialConfig {
  eleType: 'subDial'
  progressMode: DialProgressMode
  dialProperty: string
}
```

新模型不再持久化 `progressProperty`、`goalProperty`、`customMin/customMax`、`rangeMode` 或 `minValue/maxValue`。职责划分为：

- `progressMode` 决定归一化算法和允许绑定的属性类型。
- `dialProperty` 引用全局 Dial Property。
- Dial Property 决定具体数据类型。
- 后台数据类型提供 Connect IQ Symbol、模式和 Range 元数据。

Dial Property 与 Data、Goal、Chart、Text 等属性同级并可复用。已有 Dial Property 创建后不允许修改模式；如需另一模式，应新建属性。

## 3. 后台数据类型

扩展现有 `data_type_option`，不建立重复的数据类型表：

```text
dial_mode          varchar(16) nullable
dial_min           decimal nullable
dial_max           decimal nullable
dial_goal_source   varchar(16) nullable
```

接口模型：

```ts
interface DataTypeOption {
  metricSymbol: string
  dialMode: 'goal' | 'range' | null
  dialMin: number | null
  dialMax: number | null
  dialGoalSource: 'garmin' | 'fixed' | null
}
```

校验规则：

- `goal` 的 `dialMin/dialMax` 必须为空。
- `range` 的 `dialMin/dialMax` 必填、必须是有限数值，且 `dialMax > dialMin`。
- `dialMode = null` 的数据类型不能用于 Dial Property。
- 同一数据类型首版只能属于一种 Dial 模式。
- `dialGoalSource` 仅允许用于 Goal。
- 禁止为未知 `metricSymbol` 配置 Dial 能力。
- 启用 Dial 前必须确认 Symbol 已列入 Connect IQ Dial 支持清单。

后台配置只声明能力，不能自动产生 Connect IQ 返回值。启用一种数据类型前，必须已有对应的 `DataFetcher` 注册和 `DataProvider` 实现。

## 4. Studio 创建流程

添加元素时先显示：

```text
Add Sub-dial
└── Progress Mode
    ├── Goal
    └── Range
```

用户选择后：

1. 创建对应模式的 Sub-dial。
2. 查找可复用的同类型 Dial Property。
3. 没有合适属性时，自动创建 `dial_goal_1` 或 `dial_range_1`。
4. 将属性 key 保存到 `subDial.dialProperty`。

创建阶段不直接选择数据类型；具体数据类型由 Dial Property 配置。

## 5. Sub-dial 属性面板

```text
Progress Mode   [Goal]
Dial Property   [Steps Progress ▼]  [Add Property]
```

- Goal 只列出 `dialMode = goal` 的 Dial Property。
- Range 只列出 `dialMode = range` 的 Dial Property。
- 不兼容属性永远不出现在下拉列表中。
- 切换模式时立即清空不兼容绑定，再选择已有兼容属性或创建新属性。
- 不显示可编辑 `min/max`。
- Sub-dial 模式与被绑定属性的模式必须完全一致。

## 6. 全局 Properties 面板

新增一级属性类型 `Dial`：

```text
Add Property
├── Color
├── Data
├── Goal
├── Chart
├── Text
└── Dial
```

创建 Dial Property：

```text
Title          [Steps Progress]
Progress Mode  [Goal]
Data Type      [Steps]
```

Studio 使用后台数据过滤：

```ts
const options = DataTypeOptions.filter(
  option => option.dialMode === property.dialMode
)
```

Range 属性只读显示后台范围；Goal 属性显示目标来源。修改数据类型时，只允许选择相同 `dialMode` 的选项。

删除正在使用的 Dial Property 时显示引用数量；确认后清空所有引用它的 Sub-dial。后台停用的数据类型不能用于新建或重新选择，但已有设计保留快照并标记为 `Unavailable`，不能静默替换。

## 7. 设计文件与导出

设计文件保存全局属性快照：

```json
{
  "properties": {
    "dial_range_1": {
      "type": "dial",
      "dialMode": "range",
      "title": "Body Battery",
      "value": 123,
      "options": [{
        "value": 123,
        "metricSymbol": ":FIELD_TYPE_BODY_BATTERY",
        "dialMode": "range",
        "dialMin": 0,
        "dialMax": 100
      }]
    }
  }
}
```

Sub-dial 只保存引用：

```json
{
  "eleType": "subDial",
  "progressMode": "range",
  "dialProperty": "dial_range_1"
}
```

导出时解析属性并固化运行时元数据：

```json
{
  "dialProperty": "dial_range_1",
  "metricSymbol": ":FIELD_TYPE_BODY_BATTERY",
  "progressMode": "range",
  "minValue": 0,
  "maxValue": 100
}
```

生成后的 Connect IQ App 不访问后台。后台修改范围不影响已生成 App；重新打开设计并重新导出时才采用新配置。

## 8. Connect IQ 契约

继续使用现有 Data 数组：

```text
DATA_SHOW_VALUE
DATA_LOGIC_VALUE
DATA_GOAL
DATA_ICON
DATA_ICON_SYMBOL
DATA_UNIT
DATA_LABEL
```

Goal：

```monkeyc
var data = DataFetcher.getValue(metricSymbol);
var value = data[DATA_LOGIC_VALUE];
var goal = data[DATA_GOAL];
var progress = value / goal;
```

Range：

```monkeyc
var data = DataFetcher.getValue(metricSymbol);
var value = data[DATA_LOGIC_VALUE];
var progress = (value - configuredMin) / (configuredMax - configuredMin);
```

约束：

- 两种模式都必须返回数值型 `DATA_LOGIC_VALUE`。
- Goal 必须由 Provider 返回有效且大于零的 `DATA_GOAL`。
- Range 的边界来自导出时固化的后台配置，不由 Provider 返回。
- `DATA_SHOW_VALUE` 只用于显示。
- `value == null` 时隐藏指针和动态内容。
- Goal 无有效目标时隐藏指针。
- 非法 Range 在生成阶段直接失败。
- 越界继续使用 Sub-dial 的 `clamp | hide` 设置。
- 不进行模式自动回退，也不用默认零掩盖缺失数据。

## 9. Connect IQ 支持清单

维护一份机器可校验的清单，字段包括：

```text
metricSymbol
supportedDialMode
providerMethod
logicValueType
goalAvailable
```

新增支持必须完成完整链路：

```text
后台 data_type_option 配置
→ Studio Dial Property 可选
→ DataFetcher Symbol 注册
→ DataProvider 返回数值
→ 生成器导出
→ Connect IQ 运行验证
```

后台启用 Dial 时校验该清单，防止配置尚未实现或返回值不满足契约的数据类型。

## 10. 旧配置迁移

- `goal`：创建或复用 Goal Dial Property。
- `range`：仅当能匹配后台同 Symbol、同范围的数据类型时迁移。
- `auto`：停止猜测，标记为需要用户选择模式并暂时隐藏指针。
- `custom`：不迁入后台 Range，标记为需要重新选择数据类型。
- `goalProperty` 旧别名仅用于迁移读取，保存后移除。

迁移完成后只写 `progressMode + dialProperty`，不长期保留新旧双模型。

## 11. 测试与验收

### 后台

- Goal 拒绝 Range 边界。
- Range 要求合法边界。
- 正确返回模式、范围和目标来源。
- 停用项不进入新建列表，已有设计仍可识别。
- 未列入 Connect IQ 支持清单的 Symbol 不能启用 Dial。

### Studio

- 创建前必须选择 Goal 或 Range。
- 自动创建对应类型 Dial Property。
- 两种模式只能看到同类型属性。
- 切换模式清除不兼容绑定。
- 数据类型按后台模式过滤。
- Range 显示只读范围。
- 多个同类型 Sub-dial 可以复用属性。
- 删除属性后清除全部引用。
- 保存、加载、复制、粘贴、撤销、重做保持绑定。
- 旧 `auto/custom` 进入明确的待迁移状态。

### 生成器与 Connect IQ

- Goal 按 `value / goal` 计算。
- Range 按后台固化范围计算。
- 空值及无效目标隐藏。
- 非法 Range 在生成阶段失败。
- `clamp/hide` 行为一致。
- Studio 与 Monkey C 归一化结果一致。
- 所有启用 Symbol 都存在 Provider。
- Provider 的逻辑值为数值；Goal Provider 返回有效目标。
