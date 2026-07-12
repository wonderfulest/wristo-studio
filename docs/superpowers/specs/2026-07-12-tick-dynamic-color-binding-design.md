# Tick 动态颜色变量绑定设计

## 目标

为 Studio 中的 `tick12` 和 `tick60` 增加明确的颜色变量绑定界面，使设计配置稳定输出 `fill` 与 `fillProperty`，并连接到 Connect IQ 的运行时遮罩着色链路。

## 界面

在 `tick12`、`tick60` 素材选择器下方只显示一个 `Tick Color` / `刻度颜色` ColorPicker，不再显示独立的颜色变量下拉框。

ColorPicker 中已有普通色板、手工输入和当前项目颜色变量列表：

- 选择普通色板或手工输入颜色：更新 `fill` 并清空 `fillProperty`，表示静态颜色。
- 选择当前项目中的颜色变量：更新 `fill`，同时把该变量的 key 写入 `fillProperty`。
- 再选择普通颜色即可解除变量绑定。

`romans` 不显示该设置区。

## 公共组件

扩展现有 ColorPicker，新增向后兼容的 `property-change` 事件：选择变量时输出 `{ propertyKey, color }`，选择普通颜色或手工输入时输出空 property key。现有 `update:modelValue` 与 `change` 事件保持不变，其他调用方无需修改。

公共 Tick 颜色设置组件监听该事件并一次写入 `fill`、`fillProperty`；两个 Tick 面板继续复用该组件。

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

1. `tick12/tick60` 面板只显示一个颜色组件。
2. 在该组件选择颜色变量会同时更新 `fillProperty` 与 `fill`。
3. 选择普通色或手工输入颜色会清空 `fillProperty`。
4. 切换素材后绑定和预览仍然存在。
5. 编码/解码保持 `fill`、`fillProperty`。
6. `romans` 行为不变。
7. 旧设计无颜色字段时可正常加载。
8. 单元测试、类型检查和生产构建通过。
