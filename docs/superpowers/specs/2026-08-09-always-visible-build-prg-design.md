# Build PRG 始终可见设计

## 目标

设计卡片的 Build 区域始终展示 `Build PRG`，通过禁用状态表达任务正在处理，避免按钮突然消失。

## 状态规则

- 无活动任务且满足现有构建条件：`Build PRG` 可点击。
- 当前设备的任务处于排队、构建或 `cancel_requested`：`Build PRG` 显示但置灰。
- 活动任务满 10 分钟：置灰的 `Build PRG` 保留，同时展示可点击的 `Cancel Build`。
- 撤销完成或任务失败：`Build PRG` 恢复可点击。
- 成功 PRG 未满 10 分钟且设计没有更新：`Build PRG` 显示但置灰。
- 成功 PRG满 10 分钟，或设计更新时间晚于 PRG：`Build PRG` 可点击。
- 继续按当前选中的 Garmin 设备隔离任务和发布状态。

## 实现边界

`getPrgCardAction` 继续作为状态判断来源；卡片不再用 `v-if` 隐藏 Build 按钮，而是根据动作状态设置 `disabled`。`Cancel Build` 和撤销轮询规则不变，API、Redis 与 worker 不修改。

## 验证

- 纯函数测试继续覆盖 10 分钟边界和设备隔离。
- 卡片测试覆盖 Build 按钮始终存在，以及 `none`、`cancel`、`cancelling` 时禁用。
- 运行聚焦 Vitest、`npm run build` 和 `git diff --check`。
