# 通用 ColorPicker RGB565 扩展模式设计

## 背景

Studio 通用 `ColorPicker` 默认提供现有 64 色快捷矩阵、透明色和十六进制文本输入。颜色属性的默认值已经支持 RGB565 量化，但 Time TTF 字体颜色等普通元素仍只能从矩阵点选，若要使用矩阵外颜色只能手工输入十六进制值。

本功能为通用 `ColorPicker` 增加可视化 RGB565 取色能力，但不改变现有默认操作模式。

## 目标

- 保留现有 64 色矩阵作为默认打开状态。
- 增加 `More Colors…` 入口，用户主动进入 RGB565 可视化取色模式。
- 支持点选和拖动完整色谱，并实时量化到 RGB565 的 65,536 个离散颜色。
- 回显量化后的标准 `#RRGGBB`，保证预览值与最终保存值一致。
- Time TTF Font Color 和其他使用通用 `ColorPicker` 的单色字段自动获得该扩展入口。
- 渐变模式的起点色、终点色也可使用同一扩展模式。

## 非目标

- 不用 RGB565 色谱替换现有 64 色矩阵。
- 不打开独立对话框或浏览器原生取色器。
- 不改变透明色的现有语义。
- 不改变颜色属性候选项的固定集合规则。
- 不增加 alpha 通道或透明度滑条。

## 交互设计

### 默认快捷模式

ColorPicker 打开后保持当前布局：Solid/Gradient 标签、64 色矩阵、透明色以及当前颜色属性列表。

在快捷矩阵下方增加 `More Colors…` 按钮。该按钮是扩展入口，不抢占默认焦点，也不改变点击现有色块的行为。

### RGB565 扩展模式

点击 `More Colors…` 后，在同一弹层内切换内容：

- 顶部显示返回按钮和 `RGB565 Color` 标题。
- 主区域显示二维饱和度/亮度色谱。
- 下方显示 Hue 色相滑条。
- 底部显示量化后色块与 `#RRGGBB` 值。

用户可点击或拖动二维色谱及 Hue 滑条。拖动时立即计算候选 RGB，量化到 RGB565，再更新预览与数值。松开指针后选择状态保持，不需要额外 Confirm 按钮；点击弹层外仍沿用现有关闭行为。

点击返回按钮回到快捷模式，当前颜色不丢失。每次重新打开 ColorPicker 时默认回到快捷模式。

### 渐变模式

Gradient 模式继续使用现有起点/终点选择机制。进入 RGB565 扩展模式时，修改当前激活的 gradient stop；返回后保留原来的激活 stop。透明色在渐变模式中继续不可用。

## 组件边界

### RGB565 纯函数

将 RGB565 量化放在通用颜色工具模块中，提供：

- 解析 `#RRGGBB`、`0xRRGGBB` 和六位十六进制字符串。
- RGB888 到 RGB565 的量化。
- RGB565 展开回稳定 `#RRGGBB`。
- HSV 与 RGB 的转换，供色谱坐标计算使用。

颜色属性对话框复用同一个 RGB565 量化函数，避免两套算法产生不同结果。

### RGB565 色谱组件

新增独立 `Rgb565ColorSpectrum.vue`，只负责可视化取色：

- 输入当前 `#RRGGBB`。
- 输出量化后的 `#RRGGBB`。
- 自己管理 Hue、Saturation、Value 和指针位置。
- 通过 Pointer Events 同时支持鼠标、触控和拖动离开控件边界后的捕获。

通用 `ColorPicker` 负责模式切换、单色或渐变目标路由、Pinia 最近颜色同步及现有 emits。

## 数据流

1. ColorPicker 以当前单色值或当前 gradient stop 初始化色谱。
2. 色谱把指针坐标转换为 HSV，再转换成 RGB888。
3. RGB888 立即量化为 RGB565，并展开成标准大写 `#RRGGBB`。
4. 单色模式沿用 `update:modelValue`、`change` 和 `property-change` emits。
5. 渐变模式沿用当前 stop 的 update emit 和 `gradientChange`。
6. `propertiesStore.lastSelectedColor` 保存量化后的颜色。

## 可访问性与键盘行为

- `More Colors…` 和返回入口使用原生 button。
- 二维色谱与 Hue 滑条提供可聚焦的 slider 语义、可读 label、当前值和范围。
- 方向键可微调色相、饱和度和亮度；键盘变化同样经过 RGB565 量化。
- 色谱指针和预览必须在浅色、深色背景下保持可辨识边框。

## 错误与边界处理

- 非法或透明输入进入 RGB565 模式时，以白色初始化。
- 坐标统一限制在控件边界内。
- 所有输出必须是合法 `#RRGGBB`，不输出 `transparent`。
- 同一个 RGB565 色值重复输入必须保持幂等，不发生来回漂移。
- ColorPicker 关闭或组件卸载时清理 pointer 相关状态。

## 测试与验证

- 纯函数单元测试：RGB565 边界、幂等性、HSV/RGB 往返及坐标限制。
- 色谱组件契约测试：Pointer Events、键盘入口、slider ARIA 和量化 emit。
- ColorPicker 契约测试：默认快捷模式、More Colors 入口、重新打开回到快捷模式、单色 emit 和 gradient stop 路由。
- 回归测试：现有 64 色、透明色、十六进制输入和颜色属性绑定行为不变。
- 运行相关 Vitest、全量单元测试、`npm run build` 和 `git diff --check`。

