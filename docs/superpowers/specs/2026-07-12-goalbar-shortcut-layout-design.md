# GoalBar 快捷添加布局优化设计

## 目标

优化菜单栏快捷添加 GoalBar 后的组合布局，使进度条、图标和数值形成一条清晰的水平信息行。

## 布局规则

- GoalBar 本体显式使用快捷组合传入的 `left`、`top`，作为所有成员共享的布局基准。
- 图标位于进度条左端点：横坐标为 `left - width / 2`，纵坐标为 `top`，使用 `originX: center`。
- 数值位于进度条右端点：横坐标为 `left + width / 2`，纵坐标为 `top`，使用 `originX: left`，文本向右侧展开。
- 图标、进度条和数值在垂直方向居中对齐，不再应用 `top - 20` 偏移。
- 保留现有字体大小、图标大小、目标属性绑定和智能避让逻辑。

## 修改范围

- 修改 `src/engine/managers/shortcutCompoundDrafts.ts` 中 `buildGoalBarDrafts` 的默认坐标和锚点。
- 在 `src/engine/managers/compoundShortcutOrchestrator.test.ts` 增加 GoalBar 组合坐标与锚点回归测试。
- 不修改 GoalBar 渲染器、设置面板、导出格式或 GoalArc 行为。

## 验证标准

- GoalBar 本体坐标与传入的组合中心一致。
- 图标中心落在进度条左端点，且与进度条垂直居中。
- 数值左边缘落在进度条右端点，向右展开，且与进度条垂直居中。
- 组合快捷添加和智能摆放相关单元测试通过。
- `npm run build` 构建成功。
