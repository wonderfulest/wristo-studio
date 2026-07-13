# 多边形 Shape 完整链路设计

## 目标

在 Wristo Studio 中新增与矩形、圆形平级的 `polygon` Shape，并完整贯通类型、菜单、schema、renderer、panel、encoder、Connect IQ scaffold、Jinja 模板和共享 `Polygon.mc` 运行时。

## 范围

- 新增独立 `polygon` 元素，不复用 `rectangle` 的元素类型。
- 支持 3～8 个顶点，仅接受位于 `[0,1]` 范围内、无重复点、无自相交、面积有效的凸多边形。
- 默认形状为 100×100 的规则六边形。
- 支持移动、八方向缩放、纯色填充、四方向线性渐变、边框、边框宽度和整体透明度。
- 不支持凹多边形、圆角、多边形旋转和任意角度渐变。

## 数据契约

`PolygonElementConfig` 扩展通用 Shape 配置：

```ts
interface PolygonElementConfig extends ShapeElementConfig, ShapeGradientConfig {
  eleType: 'polygon'
  width: number
  height: number
  polygonPoints: Array<{ x: number; y: number }>
}
```

`polygonPoints` 永久保存为相对于元素边界的 `[0,1]` 归一化坐标。移动和缩放只更新 `left`、`top`、`width`、`height`，不会重写顶点。

## Studio 架构

- `polygon.schema.ts` 定义默认六边形和默认样式。
- `polygon.geometry.ts` 提供默认点、克隆、校验和归一化/反归一化函数；内部复用 GoalBar 已验证的多边形几何契约，避免产生第二套规则。
- `polygon.renderer.ts` 使用 Fabric `Polygon`。创建和更新时根据当前边界反归一化顶点；缩放完成后把缩放量吸收到宽高并重建 Fabric 点坐标。
- `polygon.encoder.ts` 负责 Fabric 对象和持久化配置之间的往返。无效输入回退默认六边形并记录警告，确保设计可继续打开和导出。
- `polygon.panel.vue` 沿用矩形/圆形的颜色、渐变、边框和透明度控件，并嵌入复用后的通用多边形小型编辑器。
- 顶点编辑是事务性的：有效候选可临时预览；确认后写入 element store；取消或失败恢复编辑前状态。
- 菜单、schema map、插件注册、设置面板注册、类型联合和中英文文案增加 `polygon`。

## Connect IQ 链路

- scaffold 识别 `eleType: "polygon"`，校验并输出 `polygonPoints` 与 Monkey C 数组字面量，同时复用 Shape 渐变字段提取逻辑。
- `SuperAlphaView.j2.mc` 新增 `Polygon.draw` 分支，传入中心、宽高、归一化顶点、填充、边框、透明度和渐变配置。
- `SuperBarrel/shapes/Polygon.mc` 将归一化点转换为屏幕坐标，使用 `dc.fillPolygon()` 填充，使用闭合的逐边 `dc.drawLine()` 绘制边框。
- 纯色透明度通过 `ColorUtils.colorWithOpacity()` 处理。
- 四方向渐变最多使用 64 个切片，通过半平面裁剪得到每个色带的多边形后填充；无效渐变配置回退纯色。

## 错误处理

- Studio 创建、解码和导出都校验顶点。
- 无效顶点统一回退默认六边形，不产生空元素或无效 Monkey C 字面量。
- Connect IQ 运行时再次检查点数量和数值，防止异常配置导致绘制崩溃。
- 宽高非正数时跳过绘制。

## 测试与验收

- Studio：encoder 往返、无效点回退、renderer 创建/缩放/更新、编辑器事务行为和菜单/schema 注册测试。
- Scaffold：默认值、合法点、非法点回退、数组字面量和渐变字段提取测试。
- Jinja：生成内容包含 `Polygon.draw` 和完整参数。
- 运行时：模板测试断言 `fillPolygon`、闭合边框、透明度和四方向渐变路径存在。
- 验证命令包括聚焦 Vitest、scaffold Python 单测、`npm run build` 和各相关仓库的 `git diff --check`。

## 非目标

- 不修改现有 GoalBar 行为。
- 不修改已有矩形和圆形的数据格式。
- 不触碰生成目录或下游应用复制文件。
- 不提交、推送或部署。
