# GoalBar 四方向进度设计

## 背景

当前 `goalBar` 只支持水平方向，使用 `progressAlign: 'left' | 'right'` 控制进度从左向右或从右向左增长。组件已经具备连续、分段、自定义多边形、前景渐变、边框、内边距和目标数据绑定等能力。

本次扩展继续保留一个 `goalBar` 组件，使其同时支持水平和垂直布局。公开模型不新增 `verticalGoalBar` 元素类型，避免 Studio、导出生成器、模板和 Connect IQ Runtime 形成两套重复实现。

## 目标

- 一个 `goalBar` 元素支持四种进度方向：从左到右、从右到左、从下到上、从上到下。
- 连续、分段、自定义多边形和渐变前景在四种方向下保持一致语义。
- 旧设计无需手工迁移，继续按原来的水平方向显示。
- Studio 预览、配置导出和 Connect IQ 真机绘制结果保持一致。

## 非目标

- 不新增独立的垂直进度条元素类型。
- 不支持任意角度或对角线方向。
- 不改变 `goalProperty` 数据绑定和进度归一化规则。
- 不改变自定义多边形编辑器的归一化坐标模型。
- 不在本次扩展中重新设计 GoalBar 的快捷添加复合布局。

## 配置模型

在 `GoalBarElementConfig` 中新增必需字段：

```ts
type GoalBarProgressDirection =
  | 'leftToRight'
  | 'rightToLeft'
  | 'bottomToTop'
  | 'topToBottom'

progressDirection: GoalBarProgressDirection
orientation: 'horizontal' | 'vertical'
```

默认值为 `orientation: 'horizontal'` 和 `progressDirection: 'leftToRight'`。`orientation` 用于 Studio 设置语义和条件化选项，Runtime 仍以四方向 `progressDirection` 为最终绘制依据。

配置归一化必须保证二者一致：

- `leftToRight`、`rightToLeft` 对应 `horizontal`。
- `bottomToTop`、`topToBottom` 对应 `vertical`。
- 切换到 `horizontal` 时将方向重置为 `leftToRight`。
- 切换到 `vertical` 时将方向重置为 `bottomToTop`。
- 不记忆另一个 orientation 下的历史方向。

`progressAlign` 只作为旧配置输入字段保留。解码规则为：

- `progressDirection` 有效时直接使用它。
- 缺少 `progressDirection` 且 `progressAlign === 'right'` 时，映射为 `rightToLeft`。
- 其他情况映射为 `leftToRight`。

旧配置缺少 `orientation` 时，根据规范化后的 `progressDirection` 推导 orientation。编码和新建元素同时输出 `orientation` 与 `progressDirection`；scaffold 和 Runtime 继续只依赖最终四方向字段。

编码不再写入 `progressAlign`。未知方向值按 `leftToRight` 降级，并保持 Studio 与生成器使用相同的归一化规则。

## Studio 交互

GoalBar 设置面板拆分为两个配置项。字段顺序为：`Goal Select` → `Orientation` → `Shape` → `Padding` → `Progress Direction`。

`Orientation` 放在 Shape 上方，可选择：

- Horizontal
- Vertical

`Progress Direction` 根据当前 Orientation 只展示两个有效选项：

- Horizontal：Left to Right、Right to Left。
- Vertical：Bottom to Top、Top to Bottom。

这是面向终端用户的设置文案，因此保持英文。切换 Orientation 不自动交换元素的 `width` 和 `height`，也不改变元素位置、自定义多边形顶点或其他样式，只重置为该轴向的默认进度方向。用户仍可通过尺寸设置得到期望的横条或竖条比例。

旧的水平对齐控件由 Orientation 和条件化 Progress Direction 取代。

## 轴向绘制模型

公开渲染入口保持不变，内部将方向归一化为以下轴向描述：

```ts
type GoalBarAxis = 'horizontal' | 'vertical'

interface GoalBarDirectionModel {
  axis: GoalBarAxis
  reversed: boolean
}
```

映射规则：

| progressDirection | axis | reversed | 增长起点 |
| --- | --- | --- | --- |
| `leftToRight` | horizontal | false | 左侧 |
| `rightToLeft` | horizontal | true | 右侧 |
| `bottomToTop` | vertical | true | 底部 |
| `topToBottom` | vertical | false | 顶部 |

`reversed` 表示沿画布主轴坐标的反方向增长。所有连续进度、分段排序、多边形裁剪和渐变计算共用该方向模型，避免各绘制分支分别解释字符串。

## 连续和分段进度

连续矩形进度按可用内容区域计算：水平模式改变有效宽度，垂直模式改变有效高度。背景、边框和内边距仍覆盖完整 GoalBar 外框。

分段模式沿主轴排列分段：

- `leftToRight`：第一个分段位于左侧。
- `rightToLeft`：第一个分段位于右侧。
- `bottomToTop`：第一个分段位于底部。
- `topToBottom`：第一个分段位于顶部。

`gap` 始终表示相邻分段沿主轴方向的间距。段内的部分进度也从对应方向的起点增长。

## 自定义多边形

`polygonPoints` 继续保存为相对于 GoalBar 边界的 `[0,1]` 归一化坐标，编辑器无需因方向切换而旋转或重写顶点。

现有水平裁剪扩展为通用主轴裁剪：

- 水平方向使用垂直裁剪线，计算 X 轴交点。
- 垂直方向使用水平裁剪线，计算 Y 轴交点。
- 正向保留起点到进度边界区域，反向保留进度边界到终点区域。

裁剪后继续执行去重点和最小顶点数检查。无效多边形沿用当前降级规则，按矩形 GoalBar 绘制。

## 渐变语义

渐变始终跟随进度增长方向：`gradientStartColor` 位于进度起点，`gradientEndColor` 位于进度终点。

因此：

- `leftToRight`：起始色在左侧。
- `rightToLeft`：起始色在右侧。
- `bottomToTop`：起始色在底部。
- `topToBottom`：起始色在顶部。

连续、分段和自定义多边形使用相同的方向比例函数。部分进度只显示完整渐变范围中已经完成的区间，保持当前 GoalBar 渐变随进度展开的行为。

## 导出与运行时链路

四方向配置需要贯通以下链路：

1. `wristo-studio` 类型、schema、设置面板、renderer 和 encoder。
2. `wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py` 的字段提取与旧配置归一化。
3. `SuperAlphaView.j2.mc` 的 GoalBar 参数输出。
4. `wristo-apps/SuperBarrel/goal/GoalBar.mc` 的连续、分段、多边形和渐变绘制。

模板和 Runtime 接收规范化后的 `progressDirection`。Runtime 仍提供 `leftToRight` 默认值，确保缺少新字段的旧生成结果安全运行。

## 测试与验证

### Studio

- encoder/decode 覆盖四个合法方向、未知值降级以及两种旧 `progressAlign` 映射。
- renderer 覆盖四方向连续矩形的进度边界。
- 分段模式验证首段位置、段顺序和部分段进度。
- 自定义多边形验证水平与垂直、正向与反向裁剪。
- 渐变验证四个方向的起始色位置和颜色方向。
- 面板测试验证四方向选项及更新载荷。

### Scaffold 与模板

- Python 测试验证 `progressDirection` 提取、默认值及旧 `progressAlign` 兼容。
- 模板测试验证 GoalBar 调用传入规范化方向。

### Connect IQ Runtime

- 对连续、分段、自定义多边形和渐变执行针对性源码或可运行测试。
- 条件允许时执行 Monkey C 构建；若本机 SDK 环境阻塞，必须明确记录阻塞，不以 Studio 预览替代真机构建结论。

### 回归验证

- 运行 `wristo-studio` 相关 Vitest 和 `npm run build`。
- 运行 scaffold 中 GoalBar 的 Python 测试。
- 运行 `git diff --check`。
- 手工检查一个旧水平 GoalBar 配置和四个新方向的 Studio 预览。

## 完成标准

- 新建 GoalBar 可以选择四种进度方向。
- 四个方向在 Studio 与 Connect IQ Runtime 中对连续、分段、自定义多边形和渐变具有一致结果。
- 旧 `progressAlign` 配置无需用户操作即可保持原有显示。
- 新配置不再依赖或输出 `progressAlign`。
- 相关测试通过；无法执行的真机或 SDK 验证被准确记录。
