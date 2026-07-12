# Ticks 边缘感知内缩控制点设计

## 背景

`tick12`、`tick60` 和 `romans` 通常铺满整个表盘画布。当前 `corner4` 控制点位于对象包围盒四角；当包围盒与画布同宽同高时，控制点中心恰好落在画布边界，并受到画布边界及圆形 `clipPath` 裁剪，导致控制点不可见或难以操作。

## 目标

- 让铺满画布的 ticks 元素始终能看到并操作四个缩放控制点。
- 不改变普通元素现有控制点位置。
- 不改变 ticks 的中心锁定、等比缩放、`scaleFactor` 保存及 Connect IQ 生成协议。

## 已发现的问题

第一版 `corner4Inset` 只给控制点增加固定 `12px` 偏移。它能处理对象刚好铺满画布的情况，但 ticks 放大到超过画布后，Fabric 仍以对象真实包围盒四角为基准，固定偏移不足以把控制点带回画布，因此控制点再次不可见。

## 修订方案

保留 `corner4Inset` 模式名称，将其行为升级为真正的边缘感知控制：

1. 先使用 Fabric 默认位置计算得到控制点的 viewport 坐标。
2. 将控制点中心分别钳制到 `[30, canvasWidth - 30]` 与 `[30, canvasHeight - 30]`。
3. 对象边界位于画布内时，控制点仍跟随真实四角；只有即将越界时才固定在安全边界上。
4. 钳制只影响控制点显示与命中位置，不改变 ticks 对象尺寸、坐标或配置。

控制点安全边距保持为：

- 左边界：`30px`
- 右边界：`canvasWidth - 30px`
- 上边界：`30px`
- 下边界：`canvasHeight - 30px`

### 无跳变缩放

Fabric 默认 `scalingEqually` 使用指针到缩放原点的绝对距离计算比例。控制点被大幅钳制后直接复用该处理器，会在第一次拖动时把钳制位置误认为对象真实四角，造成尺寸跳变。

`corner4Inset` 因此使用专用的中心等比缩放处理器：

- 以 pointer down 的起始坐标和原始 `scaleX/scaleY` 为基准。
- 将当前指针相对起点的位移投影到所拖动控制点的对角方向。
- 用投影距离计算相对缩放增量，而不是用当前指针的绝对位置重新计算比例。
- 同步设置相同的 `scaleX`、`scaleY` 比率，保持等比缩放。
- 继续复用 ticks 已有的中心锁定、`lockScalingFlip`、`scaling` / `modified` 事件和 `scaleFactor` 同步逻辑。
- 设置一个大于零的最小比例，防止向内拖动穿过中心后翻转或得到无效尺寸；不设置最大比例。

这样即使 ticks 已经大于画布，拖动钳制后的控制点也会从当前尺寸平滑增减，不会在首次移动时跳回画布大小。

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
- ticks 的最大 `scaleFactor`

## 测试与验收

- 测试对象小于画布时控制点保持真实位置。
- 测试对象等于或大于画布时四个控制点被钳制到 30px 安全边界。
- 测试画布缩放或 viewport transform 下仍按 viewport 边界钳制。
- 测试钳制控制点首次拖动不会改变比例，后续拖动按对角方向平滑增减。
- 测试普通 `corner4` 继续使用 Fabric 默认位置和缩放处理器。
- 测试 dial 创建及图片替换后均使用 `corner4Inset`。
- 运行相关 Vitest 测试、`npm run build` 和 `git diff --check`。

验收标准：选择任意缩放比例的 `tick12`、`tick60` 或 `romans` 时，四个控制点始终完整显示在画布内部；首次拖动无尺寸跳变，后续拖动继续以表盘中心为锚点等比缩放，保存与重新加载后比例保持一致。
