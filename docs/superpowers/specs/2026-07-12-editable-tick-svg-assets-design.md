# Tick12/Tick60 SVG 素材编辑设计

## 目标

让 Studio 素材库中的 `tick12` 和 `tick60` SVG 素材使用现有 SVG 编辑器修改内部颜色与渐变参数。

## 行为

- `tick12`、`tick60` 素材类型加入 AssetPicker 的 SVG 编辑白名单。
- 文件 URL 或文件名以 `.svg` 结尾时显示现有“编辑 SVG”按钮。
- 编辑器继续支持已有的 `fill`、`stroke`、`stop-color`、渐变 stop offset 和 opacity。
- 保存时沿用现有上传流程，生成新的 `*-recolor-<timestamp>.svg` 素材，上传成功后自动选中。
- 原始素材不被覆盖。
- PNG 或其他非 SVG 文件不显示编辑入口。

## 范围限制

- 本次只增加 `tick12` 和 `tick60`。
- `romans` 不开放编辑。
- 不修改 SVG 编辑器本身、上传 API、素材权限和删除规则。
- 不改变 Connect IQ 动态遮罩颜色协议。

## 验收

1. `tick12` SVG 显示编辑入口。
2. `tick60` SVG 显示编辑入口。
3. 两类 PNG 不显示编辑入口。
4. `romans` SVG 不显示编辑入口。
5. 保存仍生成新素材并调用当前素材类型的上传流程。
6. Studio 单元测试、类型检查和生产构建通过。
