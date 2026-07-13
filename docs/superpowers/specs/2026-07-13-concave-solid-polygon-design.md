# 凹多边形与统一单色契约设计

## 目标

Shape Polygon 和 GoalBar customPolygon 支持简单凹多边形，同时统一规定所有多边形只能使用单色；矩形 GoalBar、Rectangle、Circle 和 GoalArc 的既有渐变能力不变。

## 几何规则

- 接受 3～8 个归一化顶点。
- 接受凸多边形和凹多边形。
- 继续拒绝非数值、越界、重复点、自相交和面积过小的多边形。
- 顶点顺序可以顺时针或逆时针。

## Shape Polygon

- 面板不提供渐变设置。
- 面板显示“多边形仅支持单色填充”的提示。
- renderer 始终使用 `fill` 单色预览。
- decode 旧数据时保留 `fill`，但强制关闭 `gradientEnabled`。
- encode 始终输出 `gradientEnabled: false`，避免旧渐变字段继续传播。
- scaffold 始终输出单色配置。
- `Polygon.mc` 仅保留单色、透明度和边框绘制，不再执行切片渐变。

## GoalBar customPolygon

- 顶点校验允许简单凹多边形。
- customPolygon 模式隐藏或禁用前景渐变控件，并显示单色提示。
- 切换到 customPolygon 或载入旧 customPolygon 时，预览与持久化配置强制 `gradientEnabled: false`。
- encoder 和 scaffold 对 customPolygon 再次强制关闭渐变，防止旧数据或非 UI 调用绕过约束。
- `GoalBar.mc` 的 customPolygon 分支仅使用 `color` 绘制前景；`bgColor` 仍为一个独立单色。矩形 GoalBar 继续支持既有渐变。

## 提示文案

英文用户文案：`Polygons support solid colors only. Gradients are unavailable.`

中文内部翻译：`多边形仅支持单色，暂不支持渐变。`

## 测试与验收

- 几何测试证明凹多边形有效，自相交多边形仍无效。
- Shape encoder 测试证明旧渐变配置被降级为单色。
- Shape panel/renderer 测试证明不提供渐变并显示提示。
- GoalBar encoder、renderer 和 scaffold 测试证明 customPolygon 强制单色，而 rectangle 渐变保持不变。
- Monkey C 源码测试证明 Polygon 无渐变路径、GoalBar customPolygon 不调用渐变绘制。
- 运行聚焦 Vitest、scaffold Python 单测、Studio build 和各仓库 `git diff --check`。

## 非目标

- 不支持自相交多边形。
- 不增加多区域裁剪或三角剖分渐变。
- 不改变矩形、圆形、GoalArc 或矩形 GoalBar 的渐变行为。
- 不提交、推送、打包或部署。
