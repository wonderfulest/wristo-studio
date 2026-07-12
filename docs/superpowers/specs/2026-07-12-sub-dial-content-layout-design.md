# SubDial 内容布局与进度数据设计

## 1. 目标与范围

将 `subDial` 从仅支持目标进度、固定数值和单位位置的整体组件，升级为可绑定通用进度数据的复合组件。组件内部支持以下六个内容项：

- Icon
- Label
- Value
- Unit
- Goal Value / Range
- Percentage

用户双击 `subDial` 后进入内部编辑模式，可以独立选择、拖拽、显隐和设置这些内容项的样式。退出内部编辑后，`subDial` 仍作为单一图层整体移动、旋转和缩放。

本次同时补齐当前已有但未生效的 `showTickLabels`。刻度标签由 Dial 自动布局，不作为可拖拽内容项。

## 2. 核心原则

1. `subDial` 在元素系统和图层面板中始终是一个整体元素。
2. 内部内容项不是普通 Studio 元素，不进入全局图层、复制粘贴和排列系统。
3. 内容项的位置相对于小表盘圆心和半径保存，不能使用设备相关的绝对像素位置。
4. Studio 与 Connect IQ 使用同一套进度语义，但各自使用适合自身语言的类型。
5. 保留 DataFetcher 的旧接口，新增统一进度数据接口，不破坏已有组件。
6. 普通动态数据和样式更新不得重建全部 Fabric children。

## 3. Studio 配置模型

### 3.1 数据绑定

`subDial` 使用统一的 `progressProperty`，可以绑定任何具有数值逻辑值的数据项，而不再只绑定 `goalProperty`。

```ts
type SubDialProgressMode = 'auto' | 'goal' | 'range' | 'custom'

interface SubDialElementConfig {
  progressProperty: string
  progressMode: SubDialProgressMode
  customMin: number
  customMax: number
  content: SubDialContentConfig
}
```

模式规则：

- `auto`：优先使用有效目标值；没有目标值但有合法区间时使用区间。
- `goal`：使用 `value / goal`。
- `range`：使用 `(value - min) / (max - min)`。
- `custom`：忽略数据项自带目标和区间，使用 `customMin/customMax`。

### 3.2 内容项

```ts
interface SubDialContentConfig {
  icon: SubDialIconItemConfig
  label: SubDialTextItemConfig
  value: SubDialTextItemConfig
  unit: SubDialTextItemConfig
  goalValue: SubDialTextItemConfig
  percentage: SubDialTextItemConfig
}

interface SubDialContentItemConfig {
  visible: boolean
  x: number
  y: number
  rotation: number
  scale: number
}

interface SubDialTextItemConfig extends SubDialContentItemConfig {
  color: string
  font: string
  fontSize: number
  textAlign: 'left' | 'center' | 'right'
  prefix: string
  suffix: string
}

interface SubDialIconItemConfig extends SubDialContentItemConfig {
  displayType: 'auto' | 'mip' | 'amoled'
  color: string
  size: number
}
```

`x/y` 是相对于圆心的归一化坐标。`0,0` 是圆心，`-1～1` 对应半径范围。Studio 拖拽时使用像素坐标，持久化前转换成归一化坐标；Connect IQ 绘制时再乘以设备端半径。

### 3.3 文本语义

- `value`：当前数据值。
- `unit`：数据单位。
- `goalValue`：目标模式显示目标值；区间模式显示 `min–max`。
- `percentage`：显示计算所得百分比，并使用独立的小数位和后缀设置。
- `label`：数据项的本地化标签。

## 4. Studio 内部编辑架构

### 4.1 采用专用布局编辑器

新增 `SubDialLayoutEditor`，负责内部编辑会话、命中检测、坐标转换、拖拽约束和选中状态。不要依赖 Fabric Group 的通用子目标编辑，也不要在编辑时拆组。

普通状态下：

- `subDial` 支持整体移动、旋转和四角等比缩放。
- Fabric Group 的内部对象不接收普通元素事件。

双击进入内部编辑后：

- 锁定外层 Group 的移动、旋转和缩放。
- 内容项可以独立命中和选中。
- 当前内容项显示专用选中框。
- 属性面板切换到对应内容项设置。
- 按 `Esc`、双击外部或选中其他图层时退出内部编辑。

隐藏内容项可以从属性面板选中和重新显示，但画布上不显示拖拽框。

### 4.2 拖拽行为

拖拽流程：

1. 将鼠标的画布坐标转换为 Group 局部坐标。
2. 用局部坐标除以 `radius` 得到归一化坐标。
3. 按内容项实际包围盒限制到圆形区域内。
4. 拖动过程中仅更新视觉预览。
5. 松开时提交配置并合并为一条撤销记录。

按住 `Shift` 时锁定水平或垂直方向。编辑器提供水平居中、垂直居中和重置位置操作。

整体缩放只改变 `radius`；内部归一化位置保持不变。

### 4.3 稳定的 renderer children

Renderer 将对象分为静态结构和内容结构：

```text
SubDialWidget
├── static
│   ├── background
│   ├── majorTicks
│   ├── minorTicks
│   ├── tickLabels
│   ├── pointer
│   └── centerCap
└── content
    ├── icon
    ├── label
    ├── value
    ├── unit
    ├── goalValue
    └── percentage
```

每个 child 使用固定 key。文本、颜色、显隐、位置和动态数据更新必须原位修改对象。只有指针类型、指针图片或刻度结构改变时，才重建对应分支，不能删除并重建整个 Group。这样可以保持内部选中引用和拖拽会话稳定。

## 5. 属性面板

属性面板分为四组：

1. **Data**：`progressProperty`、进度模式、自定义范围和预览数据。
2. **Dial**：背景、角度、刻度、指针和中心盖。
3. **Content**：六个内容项的显隐、位置和样式。
4. **Layout**：布局预设、对齐和重置。

Content 顶部提供固定切换器：

```text
Icon | Label | Value | Unit | Goal | Percentage
```

Icon 设置包括显示、位置、尺寸、颜色和 MIP/AMOLED 模式。文本项设置包括显示、位置、旋转、缩放、字体、字号、颜色、对齐、前缀和后缀；Value 和 Percentage 还提供独立数字格式。

首版提供以下布局预设：

- `Classic`：icon 在上，value 居中，unit 紧随 value，label 在下。
- `Compact`：icon 与 label 顶部并排，value 和 percentage 位于中心区域。
- `Goal Focus`：value 居中，goal 和 percentage 分列底部。

应用预设只修改布局和显隐，不修改字体、颜色、格式和数据绑定。

## 6. Connect IQ 数据契约

### 6.1 扩展 DataProvider.Data

保留当前七项数组下标，并追加可选的进度元数据：

```monkeyc
[
  showValue,
  logicValue,
  goal,
  mipIcon,
  amoledIcon,
  unit,
  label,
  progressMeta
]
```

`progressMeta` 是具名 Dictionary：

```monkeyc
{
  :mode => :goal, // :goal | :range | :none
  :goal => 10000,
  :min => null,
  :max => null
}
```

目标型数据明确返回 `:goal`；区间型数据明确返回 `:min/:max`。旧 Provider 只有第三项目标值时，DataFetcher 自动推导为目标模式。

### 6.2 新增统一查询接口

新增 `DataFetcher.getProgressDataByName(name)`，返回：

```monkeyc
{
  :value => 72,
  :displayValue => "72",
  :icon => icon,
  :label => "HR",
  :unit => "bpm",
  :mode => :range,
  :goal => null,
  :min => 40,
  :max => 180,
  :percentage => 22.86,
  :valid => true
}
```

保留 `getValueByName()`、`getDataValueByName()`、`formatDataUnit()` 和其他旧接口。

百分比只在 DataFetcher 中计算一次。无效数值、非正目标值或 `max <= min` 返回 `:valid => false`，不能抛出绘制阶段异常。结果保留未经 clamp 的 percentage；指针绘制时再限制到 `0～100`。

### 6.3 模板和运行时

生成模板每帧对每个 `subDial` 只调用一次 `getProgressDataByName()`，再将完整 Dictionary 传入 `SubDial.draw()`。`SubDial.mc` 只负责角度映射、格式化和绘制，不再按数据类型获取目标值或重复计算百分比。

Studio 使用等价的 TypeScript `SubDialProgressData` 构造预览数据，不直接依赖 Monkey C 类型。

## 7. 绘制与降级

设备端绘制顺序：

```text
background
→ ticks / tick labels
→ icon
→ label
→ pointer
→ center cap
→ value
→ unit
→ goal value or range
→ percentage
```

归一化位置转换：

```text
screenX = centerX + normalizedX * radius
screenY = centerY + normalizedY * radius
```

降级规则：

- icon 资源缺失时跳过 icon，继续绘制其他内容。
- label 或 unit 为空时隐藏对应项。
- goal/range 不可用时隐藏 Goal 和 Percentage，但 Value 仍可显示。
- `progressMode = custom` 时使用 Studio 配置范围。
- 字体或构建期资源不存在时，生成流程必须报告具体的 subDial ID 并失败。
- 运行时不因单个空文本或无效进度抛异常。

## 8. 兼容与迁移

- 导入旧设计时，将 `goalProperty` 迁移为 `progressProperty`。
- 将旧 `showValue/showUnit`、颜色、字号和单位迁移到 `content.value/content.unit`。
- 缺少新内容项位置时应用 Classic 默认布局。
- `.wrt` 导入接受旧结构；重新保存后只输出新结构。
- 脚手架在迁移期接受旧 `goalProperty`，规范化后只生成新运行时契约。
- 不在 Studio renderer 和设备端长期维护两套绘制逻辑。

## 9. 测试

### 9.1 Studio

- schema、encoder 和 decoder 的新配置往返。
- `goalProperty` 与旧 value/unit 配置迁移。
- 六个内容项的显隐、样式和稳定 child identity。
- 双击进入、`Esc` 退出、内部命中和选中切换。
- 旋转和缩放后的画布坐标到局部坐标转换。
- 圆形边界、Shift 轴向约束和单次撤销记录。
- 布局预设不覆盖字体、颜色、格式和数据绑定。
- `showTickLabels` 的 Studio renderer 行为。

### 9.2 脚手架与运行时

- goal、range、custom 和 invalid 四种进度结果。
- 旧七项 Data 和追加 progressMeta 的兼容。
- 每个 subDial 每帧只获取一次进度数据。
- Studio 与 Connect IQ 在 0%、50% 和 100% 时指针角度一致。
- MIP/AMOLED icon 选择。
- 空 label/unit、缺失 icon 和无效进度降级。
- 旧 `goalProperty` 设计可以生成新契约项目。
- `showTickLabels` 在模板和设备端生效。

## 10. 验收标准

- 外部状态下，`subDial` 与普通整体元素行为一致。
- 内部状态下，六个内容项能独立选中、拖拽、显隐和设置样式。
- 整体移动、旋转、缩放后，内部布局比例不漂移。
- 保存、导入、复制粘贴和撤销恢复后布局一致。
- Steps 能显示 value、goal 和 percentage。
- Heart Rate 能显示 value、min-max 和区间 percentage。
- 无有效进度的数据仍能显示 icon、label、value 和 unit。
- 设备端不重复获取同一数据项，也不重复计算进度。
- Studio 构建、subDial 单元测试、脚手架 Python 测试和 Connect IQ 实际构建通过。
