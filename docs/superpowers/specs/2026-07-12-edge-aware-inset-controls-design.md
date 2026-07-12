# Ticks 边缘感知内缩控制点设计

## 背景

`tick12`、`tick60` 和 `romans` 通常铺满整个表盘画布。当前 `corner4` 控制点位于对象包围盒四角；当包围盒与画布同宽同高时，控制点中心恰好落在画布边界，并受到画布边界及圆形 `clipPath` 裁剪，导致控制点不可见或难以操作。

## 目标

- 让铺满画布的 ticks 元素始终能看到并操作四个缩放控制点。
- 不改变普通元素现有控制点位置。
- 不改变 ticks 的中心锁定、等比缩放、`scaleFactor` 保存及 Connect IQ 生成协议。

## 方案

在共享控制管理器中新增 `corner4Inset` 模式。该模式复用 `corner4` 的四个等比缩放控制点和图层顺序控制点，仅给四角缩放控制点设置固定的屏幕像素内缩：

- 左上：`offsetX = 12`、`offsetY = 12`
- 右上：`offsetX = -12`、`offsetY = 12`
- 左下：`offsetX = 12`、`offsetY = -12`
- 右下：`offsetX = -12`、`offsetY = -12`

`dial.renderer.ts` 中的 `tick12`、`tick60`、`romans` 统一声明 `designerControlMode: 'corner4Inset'`。偏移只影响控制点绘制和命中区域，不写入元素配置，也不参与缩放比例计算。

固定 `12px` 是当前方案的边缘感知规则：仅由铺满画布的元素类型选择内缩模式，而不是每次渲染动态判断对象是否接触边界。这能避免缩放过程中控制点模式来回切换。

## 范围

修改：

- `src/utils/controlManager.ts`
- `src/utils/controlManager.test.ts`
- `src/elements/dials/common/dial.renderer.ts`
- 必要的 dial renderer 测试

不修改：

- Canvas 尺寸及外围工作区
- 全局圆形 `clipPath`
- ticks 配置 schema、encoder 和 Connect IQ 模板
- 其他元素的 `corner4` 行为

## 测试与验收

- 测试 `corner4Inset` 四个控制点的偏移值和方向。
- 测试普通 `corner4` 仍保持零偏移。
- 测试 dial 创建及图片替换后均使用 `corner4Inset`。
- 运行相关 Vitest 测试、`npm run build` 和 `git diff --check`。

验收标准：选择任一铺满画布的 `tick12`、`tick60` 或 `romans` 元素时，四个控制点完整显示在画布内部，并继续以表盘中心为锚点进行等比缩放。
