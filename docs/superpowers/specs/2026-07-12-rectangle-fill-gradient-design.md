# 矩形填充渐变设计

## 目标

为 Wristo Studio 的矩形元素增加双色填充渐变和固定四方向设置，并确保设计数据可完整传递到 Connect IQ 生成链路。渐变只作用于矩形填充，边框仍保持单色。

## 功能范围

- 支持纯色和双色渐变两种填充模式。
- 支持四个固定方向：从左到右、从右到左、从上到下、从下到上。
- Studio 画布实时预览渐变结果。
- Connect IQ 生成结果按相同方向绘制渐变。
- 旧设计没有渐变字段时继续使用原有 `fill` 纯色，不改变显示效果。
- 矩形透明度同时作用于渐变填充和边框；边框本身不支持渐变。

不在本次范围内：对角渐变、任意角度、三个及以上色标、圆形和其他组件的渐变。

## 数据模型

在 `RectangleElementConfig` 中增加以下字段：

```ts
type RectangleGradientDirection =
  | 'leftToRight'
  | 'rightToLeft'
  | 'topToBottom'
  | 'bottomToTop'

interface RectangleElementConfig {
  gradientEnabled?: boolean
  gradientStartColor?: string
  gradientEndColor?: string
  gradientDirection?: RectangleGradientDirection
}
```

默认值为：

```ts
gradientEnabled: false
gradientStartColor: fill
gradientEndColor: fill
gradientDirection: 'leftToRight'
```

字段保持扁平结构，与 GoalBar 的现有渐变字段保持一致。`fill` 始终保留，作为关闭渐变、读取旧设计以及渐变颜色无效时的回退颜色。

## Studio 编辑与预览

矩形设置面板中的填充颜色选择器启用现有双色渐变模式。启用渐变后，在颜色选择器下方显示“渐变方向”下拉框；关闭渐变时隐藏方向设置。

方向选项及数据值：

| 显示名称 | 数据值 |
| --- | --- |
| 从左到右 | `leftToRight` |
| 从右到左 | `rightToLeft` |
| 从上到下 | `topToBottom` |
| 从下到上 | `bottomToTop` |

Fabric 预览使用 `Gradient<'linear'>`，根据矩形当前宽高生成像素坐标：

- `leftToRight`：`(0, 0) -> (width, 0)`
- `rightToLeft`：`(width, 0) -> (0, 0)`
- `topToBottom`：`(0, 0) -> (0, height)`
- `bottomToTop`：`(0, height) -> (0, 0)`

矩形尺寸变化后重新生成渐变对象，使渐变始终覆盖完整矩形。编码器从 Fabric 对象保存渐变字段，解码器为旧数据补齐兼容默认值。

## Connect IQ 数据链路

`wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py` 负责规范化矩形渐变字段：

- 布尔值输出为 Monkey C 的 `true` 或 `false`。
- 起止颜色复用现有颜色转换逻辑；无效或缺失颜色回退到 `fill`。
- 方向只接受四个固定值，缺失或未知值回退为 `leftToRight`。
- 同时输出安全的 Monkey C 字符串字面量。

`wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc` 将四个字段传给 `Rectangle.draw()`。

## Connect IQ 绘制

`wristo-apps/SuperBarrel/shapes/Rectangle.mc` 扩展以下选项：

```monkeyc
:gradientEnabled as Boolean?
:gradientStartColor as Graphics.ColorType?
:gradientEndColor as Graphics.ColorType?
:gradientDirection as String?
```

纯色路径保持原实现。渐变开启且两个颜色有效时：

- `leftToRight`：起始色到结束色横向绘制。
- `rightToLeft`：交换起止色后横向绘制。
- `topToBottom`：起始色到结束色纵向绘制。
- `bottomToTop`：交换起止色后纵向绘制。

普通直角矩形复用 `ColorUtils.fillGradient()` 和 `fillGradientLR()`。圆角矩形不能直接使用贯穿整个边界的直线切片，否则四角会被填充；因此按渐变方向从外到内绘制递减的圆角矩形，使每个色带都受圆角轮廓约束。

每个渐变色在绘制前应用现有 `ColorUtils.colorWithOpacity()`。支持 `setFill()` 的设备继续使用 alpha 填充路径；不支持时沿用当前 `setColor()` 回退。填充结束后单独绘制单色边框，保持现有边框宽度和透明度行为。

## 错误处理与兼容性

- 缺失 `gradientEnabled`：按 `false` 处理。
- 缺失或非法起止色：回退到 `fill`。
- 缺失或非法方向：回退到 `leftToRight`。
- `fill` 为透明色：渐变开启且起止色有效时仍绘制渐变；渐变关闭时保持透明。
- 宽度或高度小于等于零：不绘制填充。
- 旧设计导入、复制和重新导出后不会被自动改成渐变。

## 测试与验证

### Wristo Studio

- 编解码测试验证四个渐变字段可往返保存。
- 旧数据测试验证默认关闭渐变，并用 `fill` 补齐起止色。
- 渐变辅助函数测试验证四个方向的 Fabric 坐标。
- Renderer 测试验证切换方向及调整尺寸后更新预览填充。
- 运行 `npm run build` 验证 TypeScript 和 Vite 构建。

### Connect IQ 构建链路

- Python 测试验证颜色规范化、非法方向回退和模板字段透传。
- 运行相关 `unittest` 测试文件。

### Connect IQ 运行时

- 源码契约测试验证 `Rectangle.mc` 接收四个新选项并覆盖四个方向。
- 编译至少一个包含四个方向矩形的测试设计。
- 在模拟器检查直角、圆角、半透明和带边框矩形，确认 Studio 与设备预览方向一致。

## 涉及仓库

- `wristo-studio`：类型、默认配置、面板、Fabric 预览、编解码和测试。
- `wristo-connectiq-app-build`：设计数据提取、规范化和测试。
- `wristo-apps`：SuperAlpha 模板、SuperBarrel 矩形运行时及测试。

