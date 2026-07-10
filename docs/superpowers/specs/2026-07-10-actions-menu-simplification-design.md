# Studio Actions 菜单精简

## 目标

将编辑器 Actions 菜单收敛到当前可用且与创作导入导出直接相关的操作，移除重复或不可用入口。

## 保留项

- 导入 `.wrt`
- 导出 `.wrt`
- View / JSON View
- 截图
- 录制 GIF
- 应用属性

## 移除项

- Build（当前仅显示未支持提示）
- 菜单内 Save（顶栏已有 Save）
- Export asset package（`.wrt` 是新的可反向导入设计包）

## 实现与验证

仅修改 `AppMenuActions.vue` 及其 `AppMenu.vue` 接线：删除不再使用的菜单项、props、导入和处理函数。保留 `.wrt` 的浏览器文件选择器和其事件转发。运行 `npm run build`，并人工确认 Actions 只显示五项。
