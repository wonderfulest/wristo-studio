# Complication

## 主要入口：原有元素的 Interaction

选中原有文字、数据、图标、图片、进度或形状元素，在属性面板开启 `Interaction`，即可增加长按入口，保持原有显示和数据绑定不变。

- `Follow Element Source`：复用元素绑定的 Data Property 或 Goal Property，随当前指标确定长按目标，无须新增 Complication Property。无映射的选项保持显示但不注册热区，面板列出这些选项；Goal 的目标值只影响进度。图片和普通文字不根据内容猜测来源。
- `Fixed Source`：指定打开的系统来源。
- `Complication Property`：绑定 Complication 属性，让用户在允许项中选择打开目标；不会改变原有元素的显示内容。
- 触摸区域支持跟随设计边界或自定义尺寸、矩形/圆形、留白和 X/Y 偏移。跟随模式使用设计时的包围盒；运行时文字长度变化较大时应增加留白或指定尺寸。
- 蓝色虚线只用于编辑器选中状态，不进入导出图片。关闭交互后不注册热区。
- 交互配置随元素保存、复制及 WRT 导入导出；生成器按当前可见状态注册热区，并读取当前设置确定动态目标。真实设备是否能打开来源取决于型号与固件。

Metric 列表不再提供独立 Complication 元素的添加入口。以下说明用于已有设计中的独立 Complication 元素。

已有设计中的独立 Complication 元素，其属性分成三个独立组。支持 Garmin 系统 Complication ID 1–42；来源可用性取决于设备和固件。

## Content Source

- `Source Binding → Fixed Source` 使用固定来源。
- 动态来源：新增 `Complication` 属性，设置允许项和默认项，再选择该属性作为绑定。同一个属性可绑定多个元素。
- 来源变化同步更新数据、自动图标和打开目标，不改变显示槽位的位置和尺寸。
- 这是系统来源的有限选项列表，不是第三方 Complication 发现器；骑行统计入口不代表开始骑行记录。

## Display Style

- `Transparent Area`：不绘制内容，只提供入口；编辑器显示辅助框，PNG/WRT 预览不包含辅助框。
- `Icon`：自动跟随来源，或从内置图标库选择固定图标。
- `Value` / `Icon + Value`：数值或图标加数值。
- `Progress Ring`：范围来自 Garmin `Complication.ranges`，或指定自定义最小/最大值。自定义范围使用来源原始单位，例如距离为米、恢复时间为分钟。分类数据、缺失值或无有效范围时只绘制空轨道，不伪造进度。
- `Source Label`：保留原有标签模式。
- 显示宽高固定，可设置内容颜色和无/圆形/圆角背景。文字保持所选字号；长内容超出槽位时裁剪，应增加槽位尺寸，不自动缩小字体。
- 以 454×454 为基准，默认图标 30、文字 36；切换样式给出可读的起始尺寸，随后可独立调整。
- 自定义图标固定不随来源变化。内置图标为 Wristo 矢量图标，不依赖 Garmin 返回系统图标。
- 图标源文件为 `complication.icons.json`；scaffold 的 `lib/complication-icons.json` 是打包副本，跨仓测试检查一致性。

## Touch Area

- `Open On Long Press`：启用 Garmin 表盘长按打开来源关联应用。
- `Follow Display`：显示槽位加 `Touch Padding`。
- `Custom Size`：独立宽高，不改变可见内容。
- `Rectangle` / `Circle`；圆形以短边为直径并居中。
- 两种尺寸模式均支持 X/Y 偏移，偏移相对显示槽位中心。
- 只有当前可见、活动模式下的元素注册热区；重叠时后绘制元素优先。环境显示模式不响应入口。

Studio 使用示例数据和示例范围，当前数值格式使用公制；真机不支持来源或暂时无值时显示 `--`。保存、WRT、生成器、手机设置、手表设置和 Companion 设置保留来源绑定。旧文件的字段缺省值兼容原有透明区域和固定热区。

## 验证

- Studio：`npx vitest run src/elements/complication/complication.test.ts src/elements/complication/complication.panel.test.ts src/engine/services/designAssetBundleService.test.ts src/engine/services/exportService.test.ts`，以及 `npm run build`。
- scaffold：`python3 -m unittest discover -s wristo-scaffold/tests -p test_complications.py`。
- SDK / Simulator：`python3 wristo-scaffold/tests/validate_complication_runtime.py --sdk <sdk-directory> --key <developer-key> --run`。先启动 Connect IQ Simulator；输出在工作区 `generated/complication-validation`。
- 浏览器检查：动态来源、样式切换、触摸偏移、编码重建、Fabric 克隆恢复、透明入口导出像素。组件 fixture 位于工作区 `generated/complication-browser`，不代表已验证生产登录/发布。
- SDK 测试使用模拟数据验证格式、缺失值、命中、图标映射和范围计算；真实来源和应用跳转仍需目标真机验证。
