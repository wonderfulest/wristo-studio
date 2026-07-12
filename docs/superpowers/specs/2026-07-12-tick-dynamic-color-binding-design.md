# Tick 动态颜色变量绑定设计

## 目标

为 Studio 中的 `tick12` 和 `tick60` 增加明确的颜色变量绑定界面，使设计配置稳定输出 `fill` 与 `fillProperty`，并连接到 Connect IQ 的运行时遮罩着色链路。

## 界面

在 `tick12`、`tick60` 素材选择器下方增加公共颜色设置区：

1. `Dynamic Color Variable`：可清空的颜色变量选择器，只列出当前项目中的 Color Properties。
2. `Preview / Fallback Color`：现有 `ColorPicker`，用于 Studio 画布预览和变量不可用时的回退颜色。
3. 变量列表底部提供打开 App Properties 并新增 Color Property 的入口。

选择变量时，将元素 `fillProperty` 设置为变量 key，并把 `fill` 同步为变量当前颜色。清空变量时将 `fillProperty` 设为空字符串，保留当前 `fill` 作为静态颜色。

`romans` 不显示该设置区。

## 公共组件

新增 `ColorPropertyField.vue`，结构复用现有 `DataPropertyField` 等属性选择组件：

- 输入：`modelValue`。
- 输出：`update:modelValue`、`change`。
- 选项：`propertiesStore.allProperties` 中 `type === 'color'` 的属性。
- 选项显示标题、当前颜色和 property key。
- 支持清空。
- “Add Property”触发 `open-app-properties`，类型为 `color`。

新增公共 Tick 颜色设置组件供两个面板复用，避免复制变量解析和 Patch 逻辑。

## Dial 数据契约

`DialElementConfig` 增加 `fillProperty?: string`。公共 Dial 链路负责：

- `createDial`：把 `fill` 和 `fillProperty` 写入 Fabric 元素元数据。
- `updateDial`：处理颜色、变量以及切换素材后元数据恢复。
- `encodeDial`：导出 `fill`、`fillProperty`。
- `decodeDial`：恢复 `fill`、`fillProperty`。
- 缺少 `fill` 的旧设计使用白色作为动态遮罩预览回退色。

## 画布预览

变量绑定启用时，Studio 对 SVG/PNG 刻度图片应用单色着色滤镜：只保留原图 Alpha/轮廓，输出 `fill` 指定的纯色。颜色变化后重新应用滤镜并请求画布重绘。

清空变量后移除动态着色滤镜，恢复素材原始颜色。滤镜只能修改 Fabric 画布对象，不修改服务器上的 SVG 素材文件。

切换刻度素材时，继续保留当前 `fill` 与 `fillProperty` 并重新应用预览滤镜。

## 导出与 Connect IQ

导出示例：

```json
{
  "eleType": "tick12",
  "fill": "#9eea20",
  "fillProperty": "accentColor"
}
```

已有导出颜色映射和 Connect IQ 模板将其转换为：

```monkeyc
dc.drawBitmap2(0, 0, tick12Mask, {
    :tintColor => accentColor
});
```

## 验收

1. `tick12/tick60` 面板可选择、切换和清空颜色变量。
2. 选择变量会同时更新 `fillProperty` 与 `fill`。
3. 修改回退色会更新画布预览，但不覆盖已绑定的 property key。
4. 切换素材后绑定和预览仍然存在。
5. 编码/解码保持 `fill`、`fillProperty`。
6. `romans` 行为不变。
7. 旧设计无颜色字段时可正常加载。
8. 单元测试、类型检查和生产构建通过；已知 `canvas.node` ABI 基线错误单独记录。
