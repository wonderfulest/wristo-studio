# 圆形填充渐变设计

## 目标

让圆形元素具备与矩形一致的双色线性渐变能力，包括相同的颜色编辑方式、四个固定方向、Studio 预览以及 Connect IQ 导出和运行时绘制。渐变只作用于填充，边框继续保持单色。

## 功能范围

- 支持纯色和双色渐变两种填充模式。
- 支持从左到右、从右到左、从上到下、从下到上四个固定方向。
- Studio 画布实时预览渐变结果。
- Connect IQ 生成结果按相同方向绘制渐变。
- 旧圆形数据没有渐变字段时继续使用原有 `fill` 纯色。
- 圆形整体 `opacity` 同时作用于渐变填充和单色边框。

不在本次范围内：径向渐变、对角或任意角度渐变、三个及以上色标、边框渐变，以及 Store 预览组件扩展。

## 数据模型

圆形与矩形共享渐变方向类型，并在 `CircleElementConfig` 中增加：

```ts
interface CircleElementConfig {
  gradientEnabled?: boolean
  gradientStartColor?: string
  gradientEndColor?: string
  gradientDirection?: RectangleGradientDirection
}
```

默认关闭渐变，起止颜色回退到 `fill`，方向回退到 `leftToRight`。`fill` 始终保留为纯色模式、旧数据和非法渐变配置的回退颜色。

## Studio 编辑、状态与预览

圆形设置面板复用矩形当前使用的 `ColorPicker` 渐变模式。启用渐变后显示相同的四方向下拉框；关闭时隐藏方向设置。

提取形状共用的线性渐变方向规范化与 Fabric 渐变生成逻辑，避免圆形复制矩形实现。圆形渐变坐标使用直径形成的本地包围盒：

- `leftToRight`：`(0, 0) -> (diameter, 0)`
- `rightToLeft`：`(diameter, 0) -> (0, 0)`
- `topToBottom`：`(0, 0) -> (0, diameter)`
- `bottomToTop`：`(0, diameter) -> (0, 0)`

创建、更新和控制点缩放圆形时重新应用渐变，确保渐变覆盖当前直径。Fabric 对象额外保留 `solidFill` 和四个渐变字段；元素数据仓库、初始配置与编码器都保存纯色值而不是序列化 Fabric `Gradient` 对象。

## Connect IQ 数据链路与绘制

`super-extract-elements.py` 对圆形输出与矩形一致的四个渐变字段：布尔值转为 Monkey C 字面量，颜色缺失或非法时回退到 `fill`，方向缺失或非法时回退到 `leftToRight`。`SuperAlphaView.j2.mc` 把这些字段传给共享圆形运行时。

共享 `Circle.mc` 保留现有纯色路径。渐变有效时按方向在圆形边界内绘制双色线性渐变；左右方向按 x 轴插值，上下方向按 y 轴插值，反向选项交换插值方向。绘制必须保持圆形轮廓，不得用未裁剪的矩形色带覆盖四角。填充完成后沿用现有透明度处理，并单独绘制单色边框。

实现优先复用矩形已经验证过的颜色插值、方向和透明度约定；若矩形的运行时辅助函数与形状耦合，则提取最小共用函数，不重构无关绘制代码。

## 错误处理与兼容性

- 缺失 `gradientEnabled`：按 `false` 处理。
- 缺失或非法起止色：回退到 `fill`。
- 缺失或非法方向：回退到 `leftToRight`。
- 半径无效：沿用圆形现有半径规范化逻辑。
- 渐变关闭或配置无效：绘制 `fill`，保证旧设计结果不变。
- 复制、导入、重新导出和缩放后都保留渐变字段及纯色回退值。

## 测试与验证

### Wristo Studio

- 先增加失败测试，验证圆形编码器保存渐变字段且旧数据安全回退。
- 测试共用渐变辅助函数在四个方向上生成正确的直径坐标。
- 测试圆形创建、更新和缩放后仍保存纯色值与渐变配置。
- 运行相关 Vitest 测试、`npm run typecheck` 和 `npm run build`。

### Connect IQ

- 先增加 Python 失败测试，验证圆形渐变字段提取、颜色回退和方向规范化。
- 增加模板及 `Circle.mc` 契约测试，覆盖字段透传、四个方向、透明度和单色边框路径。
- 构建至少一个目标设备；模拟器可用时检查四方向、半透明和带边框圆形。若模拟器仍受环境限制，只报告构建和契约测试结果，不声明视觉验证。

## 涉及仓库

- `wristo-studio`：类型、默认配置、面板、Fabric 预览、状态同步、编解码与测试。
- `wristo-connectiq-app-build`：圆形字段提取、模板契约与测试。
- `wristo-apps`：SuperAlpha 模板、SuperBarrel 圆形运行时与相关测试。
