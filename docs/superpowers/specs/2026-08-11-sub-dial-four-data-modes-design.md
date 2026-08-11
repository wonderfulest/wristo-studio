# Sub-dial 四种数据模式设计

## 1. 决策与范围

`subDial` 继续作为一个整体元素，不拆分为 `goalDial`、`rangeDial`、`cycleDial` 和 `directionDial`。它扩展为四种数据映射模式：

```ts
type DialMode = 'goal' | 'range' | 'cycle' | 'direction'
```

数据模式只负责把数据转换成指针角度；指针渲染样式继续独立定义：

```ts
type SubDialPointerStyle = 'line' | 'triangle' | 'image'
```

任意数据模式均可与任意指针样式组合。背景、刻度、中心盖、内容布局、素材处理、复制粘贴和序列化继续复用现有 `subDial` 实现。

本规范取代 `2026-07-13-sub-dial-property-design.md` 中仅允许 `goal | range` 的数据模式限制；该文档中的 Dial Property、后台数据目录和导出快照原则继续有效。

本期不引入多指针、彩色区间、心率 Zone 算法或久坐状态机。

## 2. 方案选择

采用“一个元素、四种数据模式”的结构：

```text
subDial
├── dialMode: goal | range | cycle | direction
├── dialProperty: 全局 Dial Property 引用
├── 公共表盘与刻度配置
├── 公共内容布局
└── pointer.style: line | triangle | image
```

Studio 添加菜单可以提供四个入口，但四个入口创建的元素均为 `eleType: 'subDial'`，只设置不同的默认 `dialMode`。模式切换必须清空不兼容的 `dialProperty`。

不采用四个独立元素，避免复制 schema、panel、renderer、encoder、素材处理、生成模板和 Monkey C 绘制实现。

## 3. 职责边界

### 3.1 数据目录

后台 `data_type_option` 是数据能力的 source of truth，负责声明：

- 数据项能否用于 Dial；
- 唯一允许的 `dialMode`；
- Range 边界；
- Cycle 周期及周期来源；
- Goal 目标来源；
- Direction 的原始角度语义。

后台配置只声明能力，不能替代 Connect IQ Provider。开放数据项前，必须确认对应 `metricSymbol` 已注册且 Provider 能返回符合模式要求的数值。

### 3.2 Dial Property

全局 Dial Property 固定一种 `dialMode`，保存一个或多个同模式数据项候选及其数据目录快照。属性的当前 `value` 决定当前选中的数据项。`subDial` 只引用属性 key，不在元素中重复保存数据类型能力或当前选择。

同一个 Dial Property 的所有 options 必须属于同一 `dialMode`。用户可以通过生成 App 的设置项动态切换 option；不允许通过同一个属性跨 `goal/range/cycle/direction` 切换。

### 3.3 Sub-dial

`subDial` 负责公共视觉配置、预览输入、越界策略及指针绘制。运行时所需的数据模式参数由 encoder 从 Dial Property 快照解析并固化到生成项目。

生成后的 Connect IQ App 不依赖后台；后台配置变化只在设计重新加载并重新生成后生效。

## 4. 同模式动态数据切换

### 4.1 属性模型

Dial Property 是设备设置与 Sub-dial 之间的动态选择边界：

```ts
interface DialProperty {
  type: 'dial'
  dialMode: 'goal' | 'range' | 'cycle' | 'direction'
  value: number | string
  options: DialPropertyOption[]
}

interface DialPropertyOption {
  value: number | string
  label: string
  metricSymbol: string
  dialMode: DialProperty['dialMode']
  // 当前模式对应的数据目录快照
}
```

例如一个 Range Dial Property 可以包含 Battery、Body Battery 和 Stress。用户在设备设置中切换后，所有引用该属性的 Sub-dial 同步显示新数据，但继续使用 Range 算法。

### 4.2 生成契约

生成器必须保留属性中的全部候选项，而不是只固化 Studio 当前选中的 option：

- 为每个 option 生成本地化设置标签和值；
- 把每个 option 的 `metricSymbol` 加入 Field Type 映射；
- 保留每个 option 对应的 Range、Cycle 或 Direction 元数据；
- 保留全部候选项依赖的 DataProvider；
- 当前 `value` 仅作为设置默认值。

设备运行时先读取 Dial Property 当前选择，再取得该 option 对应数据：

```text
selectedOption = options[propertySettingValue]
data = DataFetcher.getValue(selectedOption.metricSymbol)
angleInput = resolveModeInput(dialMode, selectedOption, data)
```

Range 和 Cycle 的参数属于 option，不能只在生成时根据默认选项写成一个常量。Goal 的目标随当前 option 对应 Provider 返回。Direction 的单位和输入语义也必须按当前 option 校验。

设置改变后沿用现有 settings refresh 路径重新取值并刷新视图；不得要求重新生成 App，也不得重建或改变 Sub-dial 的位置、层级和视觉配置。

### 4.3 限制与校验

- 一个 Dial Property 的 `dialMode` 创建后不可修改；
- option 的 `dialMode` 必须与属性完全一致；
- 同一属性内 option `value` 和 `metricSymbol` 必须唯一；
- 保存、生成和运行时都要处理当前选择已失效的情况；
- 当前选择不存在时显示静态表盘并隐藏动态内容，不静默回退到第一个 option；
- 跨模式切换必须创建或绑定另一个 Dial Property，并显式修改 `subDial.dialMode`。

## 5. 配置模型

### 5.1 Sub-dial 元素

沿用现有字段名 `progressMode` 只会继续造成语义偏差，因为 `direction` 不是进度。新规范统一改名为 `dialMode`：

```ts
interface SubDialElementConfig {
  eleType: 'subDial'
  dialMode: 'goal' | 'range' | 'cycle' | 'direction'
  dialProperty: string

  previewValue: number
  previewGoal: number
  outOfRangeBehavior: 'clamp' | 'hide'

  startAngle: number
  endAngle: number
  counterClockwise: boolean

  pointer: SubDialPointerConfig
}
```

`startAngle/endAngle/counterClockwise` 用于 `goal`、`range` 和 `cycle`。`direction` 不使用线性 sweep 配置，但字段仍保留在公共模型中，切换回其他模式时不丢失用户设置。

### 5.2 数据目录

```ts
interface DialDataTypeConfig {
  dialMode: 'goal' | 'range' | 'cycle' | 'direction' | null

  dialGoalSource: 'garmin' | null

  dialMin: number | null
  dialMax: number | null

  dialPeriod: number | null
  dialPeriodSource:
    | 'fixed'
    | 'daysInMonth'
    | 'daysInYear'
    | 'weeksInYear'
    | 'moonCycle'
    | null
  dialValueOffset: number | null

  dialDirectionUnit: 'degree' | null
}
```

只有当前模式相关的字段可以非空，其余字段必须在 API normalize 阶段清空。

Direction 的 `northOffset`、顺逆时针和图片朝向偏移属于具体设计的视觉设置，不进入数据目录。

## 6. 四种映射算法

### 6.1 Goal

```text
progress = value / goal
progress = applyOutOfRangeBehavior(progress)
angle = angleOnSweep(progress)
```

约束：

- `DATA_LOGIC_VALUE` 必须是有限数值；
- `DATA_GOAL` 必须是有限数值且大于零；
- 缺少有效目标时隐藏指针和依赖数据的动态内容；
- 不回退到固定范围或默认目标。

计划开放的数据需要逐项验证 Garmin 目标是否真实可取：

- Steps
- Calories
- Floors Climbed
- Distance
- Daily Active Minutes
- Weekly Active Minutes
- Weekly Run Distance
- Weekly Cycling Distance
- Weekly Swimming Distance
- Weekly Walking Distance

现有已验证项可以直接保留；其他项目只有完成 Provider 和设备验证后才能加入后台白名单。

### 6.2 Range

```text
progress = (value - min) / (max - min)
progress = applyOutOfRangeBehavior(progress)
angle = angleOnSweep(progress)
```

约束：

- `min/max` 必须是有限数值；
- `max > min`；
- `clamp` 将进度限制到 `0..1`；
- `hide` 在越界时隐藏指针和依赖数据的动态内容。

首批范围型数据：

| 数据项 | 最小值 | 最大值 |
| --- | ---: | ---: |
| Battery | 0 | 100 |
| Body Battery | 0 | 100 |
| Stress | 0 | 100 |
| Pulse Ox | 0 | 100 |
| Weather Humidity | 0 | 100 |
| Weather Clouds | 0 | 100 |
| Sleep Score | 0 | 100 |

心率不能统一硬编码为 `0..100`。普通心率可在后续采用经验证的固定范围；基于个人最大心率的百分比和心率 Zone 属于独立算法扩展，不在本期伪装成普通 Range。

久坐数据必须先确定 Provider 返回的是久坐分钟数、提醒倒计时还是离散状态；语义未确定前不开放为 Range。

### 6.3 Cycle

```text
period = resolvePeriod(dataConfig, currentDate)
normalized = positiveModulo(value - min + valueOffset, period)
progress = normalized / period
angle = angleOnSweep(progress)

positiveModulo(x, period) = ((x % period) + period) % period
```

Cycle 不使用 `clamp | hide` 处理正常越界，任何有限数值都按周期回绕。`period <= 0`、无法解析动态周期或数据非数值时隐藏动态部分。

建议数据项：

| 数据项 | 周期来源 |
| --- | --- |
| Second of Minute | fixed: 60 |
| Minute of Hour | fixed: 60 |
| Hour of Day | fixed: 24 |
| Day of Week | fixed: 7 |
| Month of Year | fixed: 12 |
| Moon Phase / Moon Age | moonCycle |
| Day of Month | daysInMonth |
| Day of Year | daysInYear |
| Week of Year | weeksInYear |

数据值的基准必须通过 `dialValueOffset` 明确处理。例如 `Month of Year` 若 Provider 返回 `1..12`，使用 `valueOffset = -1`；不能在 Studio 和 Monkey C 中分别写隐式减一分支。

月相首版使用连续 Moon Age，周期按统一的朔望月常量解析；不能混用离散月相枚举和连续月龄。

Cycle 刻度使用半开区间 `[0, period)`。完整圆周时不重复绘制起点和终点标签。

### 6.4 Direction

```text
signedValue = clockwise ? value : -value
pointerAngle = normalize360(signedValue + northOffset + pointer.rotationOffset)
```

Direction 直接表达真实方位，不参与 `startAngle/endAngle` 的线性归一化，也不使用 `clamp | hide`。首批只支持 Weather Wind Direction，输入单位固定为角度。

设计配置：

```ts
interface SubDialDirectionConfig {
  northOffset: number
  clockwise: boolean
  tickLabelMode: 'cardinal' | 'degree'
}
```

- `northOffset` 表示数据北方在画布中的角度；
- `pointer.rotationOffset` 只修正指针图片或矢量素材自身的朝向；
- 两个偏移不能合并，否则更换素材会改变方位语义；
- `0°` 与 `360°` 是同一点，只绘制一个标签；
- `cardinal` 默认绘制 `N/E/S/W`；
- `degree` 默认按 `0/90/180/270` 绘制。

## 7. Studio 交互

添加菜单提供四个入口：

```text
Sub-dial
├── Goal
├── Range
├── Cycle
└── Direction
```

属性面板第一组为数据配置：

- Goal：Dial Property、预览值、预览目标、越界行为；
- Range：Dial Property、只读范围、预览值、越界行为；
- Cycle：Dial Property、只读周期说明、预览值；
- Direction：Dial Property、北方偏移、顺逆时针、刻度标签模式、预览角度。

Dial Property 编辑器只列出该模式可用的数据类型，并允许选择多个候选项进入设备设置。Studio 中的当前选择用于画布预览和生成 App 的默认值。对 option 进行增删或排序时，不改变引用它的 Sub-dial 元素配置。

模式切换规则：

1. 保存公共视觉配置；
2. 清空原有 `dialProperty`；
3. 清理或重置不属于目标模式的设计配置；
4. 仅列出同模式 Dial Property；
5. 不自动把旧数据项映射到另一模式。

设置更新重建 Fabric 子对象时必须保留 live Group 的 `left/top/angle`，不得使元素漂移到画布原点。

## 8. 刻度规则

- Goal/Range：沿配置 sweep 绘制，可按需要显示起止刻度；
- Cycle：完整圆周使用半开区间，不重复结束刻度；非完整 sweep 同样不重复周期终点；
- Direction：强制使用完整 360° 方位刻度，不使用普通数值范围标签；
- 方向刻度的北方位置随 `northOffset` 变化；
- 指针旋转中心始终是 Sub-dial 圆心，Triangle 不能围绕自身几何中心旋转。

## 9. 导出与设备运行时

完整链路保持：

```text
Studio schema/panel/renderer/encoder
→ wristo-scaffold/super-extract-elements.py
→ SuperAlphaView.j2.mc
→ SuperBarrel/dials/SubDial.mc
```

encoder 解析 Dial Property 后固化该属性的全部同模式 options；下面只是其中一个 option：

```json
{
  "dialMode": "cycle",
  "metricSymbol": ":FIELD_TYPE_MINUTE_OF_HOUR",
  "period": 60,
  "periodSource": "fixed",
  "valueOffset": 0
}
```

模板负责获取数据和解析与日期上下文相关的动态参数；`SubDial.mc` 负责纯映射、角度计算和绘制。Studio 预览与 Monkey C 必须共享等价算法和测试向量。

图片指针继续通过 `AffineTransform + drawBitmap2` 绘制。设备不支持图片旋转能力时，保持现有兼容策略，不把数据模式逻辑复制到降级指针实现中。

## 10. 后台与 Dashboard 校验

API 和 Dashboard 必须使用同一份模式能力定义或由 API 返回能力元数据，不能长期维护两份容易漂移的硬编码白名单。

API normalize/validate 规则：

- `goal`：只允许 `dialGoalSource`；
- `range`：只允许 `dialMin/dialMax`；
- `cycle`：要求有效固定周期或受支持的动态周期来源；
- `direction`：要求 `dialDirectionUnit = degree`；
- `dialMode = null`：清空所有 Dial 专用字段；
- 每个 `metricSymbol` 只能属于一种模式；
- 未进入 Connect IQ 支持清单的数据项不得启用。

数据库迁移先增加新字段，再按经过验证的清单配置数据项，并递增 `data_catalog_revision`。不能只修改 Dashboard 让选项看起来可用。

## 11. 迁移与兼容

- 现有 `progressMode: goal | range` 无损迁移为同值 `dialMode`；
- 新版保存时只写 `dialMode`；
- decoder 在限定迁移期内读取 `progressMode`，不得同时持久化两个字段；
- 已生成 App 不受数据目录变化影响；
- 现有只包含一个 option 的 Dial Property 保持有效，可以继续增加同模式 options；
- 生成时不得把 Dial Property 裁剪为默认选项，否则设备设置无法动态切换；
- 旧 Studio 打开包含 `cycle/direction` 的设计时必须保留未知配置，不能静默改为 Range；
- 模式或元数据失效时，Studio 保留绑定快照并标记不可用，不自动替换数据项。

## 12. 错误处理

- 数据缺失或非有限数值：静态表盘保留，隐藏指针和依赖数据的动态内容；
- Goal 目标缺失或不大于零：隐藏动态部分；
- Range 边界无效：API 拒绝配置，生成阶段再次失败保护；
- Cycle 周期无效：API 拒绝固定配置，运行时动态解析失败则隐藏动态部分；
- Direction 单位不是角度：API 和生成阶段拒绝；
- 不兼容 Dial Property：Studio 显示错误并阻止生成；
- 设备设置指向不存在的 option：保留静态表盘并隐藏动态内容，不自动选择其他数据；
- 图片资源失败：沿用现有 Sub-dial 素材错误处理。

## 13. 测试与验收

### Studio

- 四种模式创建、切换、绑定过滤、编码和解码；
- 每种模式的多 option Dial Property 创建、编辑、默认选择和预览；
- 同模式动态切换不改变 Sub-dial 的元素配置和视觉状态；
- 属性拒绝混入其他模式 option；
- 旧 `progressMode` 迁移；
- Goal/Range 越界；
- Cycle 正模、负值、周期边界和动态周期；
- Direction 的 `0/360`、北方偏移、顺逆时针和图片朝向修正；
- 模式切换不改变位置、旋转、层级和公共视觉配置；
- Cycle/Direction 刻度不重复端点。

### API 与 Dashboard

- 四种模式字段 normalize 和交叉字段清理；
- 白名单和模式不匹配时拒绝；
- 周期来源和方向单位校验；
- API 与 Dashboard 可选能力一致；
- 数据目录 revision 更新。

### Scaffold 与 Connect IQ

- 四种模式导出和模板生成；
- 全部候选 option 均进入设置、Field Type 映射和 Provider 依赖；
- 设备设置切换同模式数据项后无需重新生成即可刷新数值、范围或周期参数；
- 失效设置值不回退到第一个 option；
- Studio 与设备端相同输入的指针角度误差不超过 1°；
- 闰年、不同月份和 ISO 周数边界；
- Moon Age 周期回绕；
- 风向 `0/90/180/270/359/360`；
- Line、Triangle、Image 与四种模式的组合验证；
- 至少一台 MIP 和一台 AMOLED 设备或模拟器验证。

## 14. 完成标准

1. 用户看到四种数据模式，但画布和设计文件中仍是同一个 `subDial` 元素。
2. 数据模式与指针渲染样式互不耦合。
3. 四种模式在 Studio 和 Connect IQ 使用一致角度算法。
4. Cycle 正确回绕并支持固定与动态周期，刻度不重复端点。
5. Direction 正确表达真实方位，独立于普通 sweep，并区分北方偏移和素材朝向修正。
6. 新数据项必须通过后台能力配置、Provider、生成器和设备验证后才能开放。
7. 现有 Goal/Range 设计无损迁移，模式切换不造成位置漂移。
8. 同一 Dial Property 可在设备端动态切换同模式数据项，全部候选项及其模式元数据被正确打包。
9. 不允许跨模式动态切换；需要另一模式时必须显式切换 Sub-dial 模式并重新绑定属性。
