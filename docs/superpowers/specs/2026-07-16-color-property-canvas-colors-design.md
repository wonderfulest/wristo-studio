# Color Property 画布颜色设计

## 目标

在创建或编辑 Color Property 时，让用户可以直接复用当前画布已经使用的颜色。该能力仅出现在 Color Property 弹窗中，不改变其他元素设置面板里的通用颜色选择器。

## 现状

共享 `ColorPicker` 的快速选择视图包含固定颜色矩阵、`More Colors...` 入口和 `Current Colors` 区域。`Current Colors` 只读取已经创建的 Color Property，没有读取画布元素配置。

画布元素的业务配置由 `elementDataStore.elements[*].config` 维护。这里包含元素的填充色、文字色、边框色、背景色、渐变起止色，以及部分嵌套内容的颜色，是本功能的数据源。

## 方案

Color Property 弹窗负责读取画布元素配置并生成颜色列表，再通过一个可选 prop 传给共享 `ColorPicker`。`ColorPicker` 只负责展示和选择，不直接依赖 `elementDataStore`。

采用该边界可以保证：

- 只有 Color Property 弹窗显示画布颜色。
- 共享颜色选择器仍可用于其他元素设置和渐变编辑。
- 画布数据读取与通用 UI 组件解耦。

## 颜色提取与归一化

新增独立的纯函数，从 `elementDataStore.elements` 的每个 `config` 开始递归遍历对象和数组。

处理规则：

1. 只接受完整匹配 `#RRGGBB`、`0xRRGGBB` 或 `RRGGBB` 的字符串。
2. 忽略空值、`transparent`、`-1`、property 引用和其他普通文本。
3. 使用现有 RGB565 工具归一化为 `#RRGGBB`，与 Color Property 默认值的颜色精度保持一致。
4. 按归一化结果去重，保留第一次出现的顺序，使展示顺序与画布配置顺序稳定一致。
5. 递归处理渐变色、嵌套内容、分段配置等结构，不为具体元素类型维护字段白名单。

提取函数保持无 Pinia、Vue 和 DOM 依赖，便于单元测试。

## 界面与交互

Color Property 弹窗把提取后的颜色列表传给 `ColorPicker`。在快速颜色视图中：

- 固定 64 色矩阵和透明色保持不变。
- `More Colors...` 入口保持不变。
- 新增独立的 `Canvas Colors` 区域，使用紧凑色块网格展示。
- 每个色块通过 `title` 或等价提示显示 RGB565 十六进制值。
- 点击色块走现有单色选择事件，更新 Color Property 的 Default Value。
- 现有 `Current Colors` 继续单独展示已创建的 Color Property，不与画布颜色合并。
- 没有可用画布颜色时不渲染 `Canvas Colors` 区域。

弹层仍沿用现有视口定位和最大高度滚动逻辑，颜色数量增加时不突破视口。

## 数据流

1. Color Property 弹窗打开或画布配置变化。
2. 计算属性读取 `elementDataStore.elements` 并调用纯函数提取、归一化和去重颜色。
3. 弹窗将颜色数组传给 `ColorPicker`。
4. `ColorPicker` 渲染 `Canvas Colors` 色块。
5. 用户点击色块后，`ColorPicker` 发出现有 `update:modelValue` 和 `change` 事件。
6. Color Property 弹窗使用现有 `syncDefaultColor` 更新默认值，并重新生成固定的 `Default + 64 colors + Transparent` options。

## 兼容性约束

- 不修改 Color Property 的固定 options 生成规则。
- 不把画布颜色追加为新的可选 property options；它们只用于选择 Default Value。
- 不改变 `Default`、64 个标准色或 `Transparent` 的语义和顺序。
- 不改变共享 `ColorPicker` 默认打开快速颜色视图的行为。
- 不影响渐变模式；本次传入的画布颜色只用于 Color Property 的单色场景。

## 测试与验证

单元测试覆盖：

- 从顶层和嵌套配置提取颜色。
- 支持 `#RRGGBB`、`0xRRGGBB` 和无前缀格式。
- RGB565 归一化后去重。
- 忽略透明色、property 引用、无效字符串和空值。
- `ColorPicker` 仅在收到画布颜色 prop 时渲染 `Canvas Colors`。
- 点击画布色块复用现有颜色选择事件。
- Color Property 弹窗传入当前画布颜色，其他调用方不受影响。

完成后运行相关 Vitest 用例、`npm run typecheck` 和 `npm run build`。若全量检查受到工作区已有未提交改动影响，需要把基线问题与本功能结果分别说明。
