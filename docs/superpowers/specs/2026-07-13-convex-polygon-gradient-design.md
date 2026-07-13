# 凸多边形渐变与凹多边形单色设计

## 目标

Shape Polygon 和 GoalBar customPolygon 根据几何形状动态决定渐变能力：凸多边形支持既有四方向渐变，简单凹多边形仅支持单色。

## 几何契约

- 共享几何层新增 `isConvexPolygon(points)`，对合法多边形返回凸凹判断。
- 3～8 点、范围、重复、自相交和面积校验规则保持不变。
- 凸凹判断不影响多边形是否合法，只影响渐变能力。

## Shape Polygon

- 凸多边形显示并启用四方向渐变控件。
- 凹多边形隐藏或禁用渐变控件，显示 `Concave polygons support solid colors only.`。
- 顶点编辑从凸变凹时，提交顶点的同一事务内将 `gradientEnabled` 设为 `false`。
- encoder、renderer 和 scaffold 仅在多边形凸时保留 `gradientEnabled: true`。
- `Polygon.mc` 恢复四方向切片渐变；运行时检测到凹多边形时忽略渐变并使用 `fill` 单色。

## GoalBar customPolygon

- 凸 customPolygon 恢复前景四方向渐变。
- 凹 customPolygon 强制单色并显示相同提示。
- 顶点提交、shape 切换、decode、encode、renderer 和 scaffold 都按凸凹判断归一化 `gradientEnabled`。
- `GoalBar.mc` 的凸 customPolygon 可进入现有渐变路径；凹 customPolygon 使用 `dc.setClip()` 裁剪完整多边形并单色绘制。
- Rectangle GoalBar 的渐变行为保持不变。

## 运行时策略

- 凸多边形：沿用现有多边形切片/裁剪渐变，因为半平面裁剪结果保持为一个连续区域。
- 凹多边形：沿用完整多边形加矩形 clip 的单色进度绘制，避免分离区域被错误连接。
- Monkey C 运行时实现独立凸性判断，防止旧数据或非 Studio 数据绕过限制。

## 提示文案

- English: `Concave polygons support solid colors only.`
- 中文：`凹多边形仅支持单色。`

## 测试与验收

- 共享几何测试覆盖凸、凹、自相交三类输入。
- Shape Polygon encoder/renderer/panel 测试覆盖凸渐变保留、凹渐变关闭。
- GoalBar encoder/renderer/scaffold 测试覆盖同一规则。
- Monkey C 源码测试覆盖凸性判断、凸渐变路径、凹单色 clip 路径。
- Rectangle、Circle、GoalArc 和矩形 GoalBar 渐变回归测试保持通过。
- 运行 Studio build 和各相关 Git 根目录 `git diff --check`。

## 非目标

- 不为凹多边形实现渐变。
- 不支持自相交多边形。
- 不提交、推送、打包或部署。
