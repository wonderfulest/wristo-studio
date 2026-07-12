# Studio 多功能小表盘（Sub-dial）设计

## 1. 目标与范围

Studio 新增独立的 `subDial` 元素，用一根指针把单个数据字段映射到仪表盘角度。首版支持百分比范围与自定义范围，默认采用 240° 仪表式布局，并支持矢量指针和自定义图片指针。

首版只支持单数据源、单指针、单数值标签。双指针、彩色数值区间和内部子元素独立编辑不在本期范围内。

## 2. 用户体验

`subDial` 在画布中表现为一个整体元素，可整体移动、旋转和四角等比缩放。背景、刻度、指针、中心盖、数值和单位通过属性面板配置，内部对象不能单独选中。

默认视觉参数：

- 起始角度：150°
- 结束角度：390°
- 主刻度：5
- 次刻度：20
- 显示当前值与单位
- 默认指针：线型

## 3. 元素结构

Fabric `Group` 内部包含：

```text
subDial
├── background
├── majorTicks
├── minorTicks
├── pointer
├── centerCap
├── valueText
└── unitText
```

`subDial` 使用专用 renderer、encoder、decoder、schema 和 panel。它可以复用 GoalArc 的数据绑定与颜色工具、模拟指针的素材选择和资源处理能力，但不组合或持有现有普通元素实例。这样可以保证整体移动、序列化、复制粘贴、撤销恢复和 Connect IQ 导出的一致性。

数据变化时只更新指针角度、数值和单位，不重建背景、刻度或图片资源。

## 4. 配置模型

```ts
interface SubDialConfig {
  eleType: 'subDial'
  id: string

  left: number
  top: number
  radius: number
  rotation: number

  dataProperty: string
  rangeMode: 'percentage' | 'custom'
  minValue: number
  maxValue: number
  previewValue: number
  outOfRangeBehavior: 'clamp' | 'hide'

  startAngle: number
  endAngle: number
  counterClockwise: boolean

  majorTicks: number
  minorTicks: number
  showMajorTicks: boolean
  showMinorTicks: boolean
  showTickLabels: boolean
  showEndpointTicks: boolean
  majorTickColor: string
  minorTickColor: string

  pointer: SubDialPointerConfig

  showCenterCap: boolean
  centerCapColor: string
  centerCapRadius: number

  backgroundColor: string
  backgroundOpacity: number

  showValue: boolean
  showUnit: boolean
  unit: string
  decimals: number
  valueColor: string
  valueFontSize: number
}

interface SubDialPointerConfig {
  style: 'line' | 'triangle' | 'image'
  color: string
  width: number
  lengthRatio: number

  assetId: string | null
  imageUrl: string | null

  // 图片原始尺寸中的归一化旋转轴心，范围为 0–1。
  pivotX: number
  pivotY: number

  scale: number
  rotationOffset: number
  tintColor: string | null
}
```

Percentage 模式固定使用 `0–100`。Custom 模式使用 `minValue` 和 `maxValue`。角度计算规则为：

```text
progress = clamp((value - minValue) / (maxValue - minValue), 0, 1)
pointerAngle = startAngle + signedSweep × progress + rotationOffset
```

`signedSweep` 同时处理跨 360° 和逆时针配置。Studio 和 Connect IQ 必须使用同一套归一化规则。

## 5. 自定义图片指针

图片指针同时支持现有模拟指针素材库和用户上传 PNG/SVG。只复用已有素材选择与处理能力，不复用 `hourHand`、`minuteHand` 或 `secondHand` 元素实例。

图片指针必须保存 `pivotX` 和 `pivotY`，不能假定旋转轴心位于图片几何中心。运行时先将图片归一化轴心对齐到小表盘局部圆心，再执行角度旋转。

素材持久化要求：

- `.wrt` 与完整素材包保留原始文件、哈希、尺寸、格式和轴心配置。
- PNG 可直接进入资源处理流程。
- SVG 在生成 Connect IQ 项目前转换为 PNG。
- MIP 与 AMOLED 分别生成目标资源，但共享相对轴心配置。
- 相同图片内容按哈希去重。
- 生成项目不能依赖 Studio 临时 URL。

## 6. 属性面板

属性面板分为六组：

1. **Data**：数据字段、范围模式、最小值、最大值、预览值、越界行为。
2. **Dial**：半径、起止角度、方向、背景颜色和透明度。
3. **Ticks**：主次刻度开关、数量、长度、宽度、颜色、刻度值和首尾刻度。
4. **Pointer**：Line、Triangle、Image，素材库选择、上传、尺寸、轴心、缩放、偏移和着色。
5. **Center Cap**：显示、半径和颜色。
6. **Value**：数值与单位开关、精度、字体、字号、颜色和位置。

数据字段沿用 Studio 现有字段体系，不为 `subDial` 新建独立数据源。

## 7. Studio 数据流

`subDial` 通过元素注册体系接入创建、更新、编码、解码和设置面板。配置更新应通过现有 element manager 路径同步 Fabric 对象、元素 store、图层 store、历史记录和序列化配置。

动态更新分为两类：

- 数据更新：只调整指针角度、数值和可见性。
- 样式或结构更新：按需要重建对应子对象，保持 Group 身份、位置和图层顺序不变。

复制粘贴、撤销重做、保存重载和 `.wrt` 往返都必须保留元素配置及素材引用。

## 8. Connect IQ 导出与运行时

完整链路为：

```text
Studio subDial.encoder
→ elements.json
→ super-extract-elements.py
→ 生成项目配置与资源
→ SubDial.mc
→ SuperAlphaView.j2.mc
→ DataFetcher
```

Studio 导出扁平化的运行时配置，包含位置、半径、数据字段、范围、角度、刻度、指针资源 ID、图片轴心、缩放和偏移。

共享运行时类 `SubDial.mc` 放在 `wristo-apps/SuperBarrel`，负责：

- 从 `DataFetcher` 获取绑定值。
- 归一化数值并计算指针角度。
- 绘制背景、刻度、数值和单位。
- 绘制矢量指针，或围绕配置轴心旋转图片指针。
- 在数据无效时按配置隐藏动态部分。

脚手架只传递配置、生成资源并注册资源 ID，不复制业务绘制逻辑。

背景和刻度首次绘制后缓存为离屏 Bitmap。每次数据刷新只绘制数值和指针；图片资源只加载一次。Monkey C 中参与角度、位运算或绘制 API 的数值必须显式归一为目标数值类型，避免编译通过但运行时出现类型异常。

## 9. 错误处理与兼容

- 图片加载失败：保留配置，在 Studio 显示占位指针并提示重新选择素材。
- SVG 转换失败：素材包记录明确原因，并阻止生成缺失资源的项目。
- `pivotX/Y` 超出范围：限制到 `0–1`。
- `maxValue <= minValue`：属性面板显示错误并阻止应用 Custom 范围。
- 数据缺失或非数字：隐藏指针和值，静态表盘继续显示。
- 老设计不含 `subDial`：行为不变。
- 旧版 Studio 读取新设计：未知元素配置必须被保留，不能在保存时静默删除。

## 10. 测试与验收

### Studio 单元测试

- 百分比和自定义范围归一化。
- 超出范围的 clamp 与 hide 行为。
- 跨 360°、逆时针和角度偏移。
- 图片轴心换算。
- 空值、非数字和无效范围。

### 元素与素材测试

- 创建、更新、编码、解码。
- 整体移动、旋转、四角等比缩放。
- 复制粘贴、撤销重做、保存重载。
- 素材库图片、上传 PNG、上传 SVG。
- 哈希去重、`.wrt` 和完整素材包往返。

### Connect IQ 验证

- Percentage 和 Custom 范围。
- Line、Triangle 和 Image 指针。
- MIP 与 AMOLED 资源。
- 多种设备分辨率。
- Studio 与设备端指针角度误差不超过 1°。
- 多个 Sub-dial 同时刷新无明显卡顿。
- 生成项目可以独立构建，且不依赖 Studio 临时资源。

## 11. 首版完成标准

1. `subDial` 可整体移动、旋转和等比缩放。
2. 支持百分比与自定义范围。
3. 支持 Line、Triangle 和 Image 指针。
4. 图片指针能从素材库选择或由用户上传，并围绕配置轴心正确旋转。
5. Studio 与 Connect IQ 使用一致的数据归一化与角度规则。
6. 保存、复制、撤销和 `.wrt` 往返后视觉及配置一致。
7. 原始指针素材进入完整素材包，生成项目使用处理后的本地资源。
8. 数据刷新不重建静态刻度或重复加载图片资源。
