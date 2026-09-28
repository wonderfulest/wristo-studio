# 动态图片与目标进度契约

动态图片支持 `expression` 与 `goalProgress` 两种选择模式。目标模式绑定已有 `goal_N` 属性，根据设备实际值与目标值的比例选择图片。此功能是进度阶段切换，不是按时间播放的动画。

## 配置

```json
{
  "eleType": "dynamicImage",
  "selectionMode": "goalProgress",
  "goalProperty": "goal_1",
  "items": [
    { "id": "rest", "imageUrl": "...", "minProgress": 0 },
    { "id": "fly", "imageUrl": "...", "minProgress": 0.6 },
    { "id": "celebrate", "imageUrl": "...", "minProgress": 1 }
  ]
}
```

- `goal_1` 必须引用 `type: goal` 的属性，选项使用数据目录中的整数编码与对应 `metricSymbol`；默认值必须属于选项。
- `minProgress` 范围为 0–1，不能重复，必须包含 0。配置顺序不影响结果，选择不超过当前进度的最高阈值。
- 数据缺失、目标非正数、负进度时显示 0 阶段；超额完成保持最终阶段；数据下降或跨日重置会重新选择对应阶段。
- `progress` 只控制 Studio 预览。设备运行使用所绑定目标的实时数据，可在应用设置中切换目标。
- 目标模式的候选项不要求 `expression`；切换回表达式模式时初始化缺失表达式为 `false`，清除目标绑定。
- 未设置模式但已有 `goalProperty` 的本地早期配置按目标模式识别。显式 `expression` 模式不读取残留目标绑定。
- 设备在原有表盘刷新周期中计算阶段，仅当阶段变化时加载图片；保持现有低功耗显示策略。

## WRT 与发布边界

普通表盘继续导出 WRT v2。包含目标图片的表盘导出 v3，清单声明 `requiredFeatures: ["goal-progress-images-v1"]`。旧 Studio 会拒绝 v3，避免静默丢失目标行为。缺失能力声明、未知能力、无效阈值或失效绑定均拒绝导入或导出。

此能力跨越四个仓库：`wristo-studio` 编辑/预览/导入导出、`wristo-api` 包校验、`wristo-connectiq-app-build` 解包与构建转换、`wristo-apps/SuperAlpha` 设备模板。上线前必须同步升级这四部分；仅替换 WRT 不能使旧线上构建链支持新功能。

## 验证

Studio 单元测试覆盖阶段边界、编码、渲染持久化、快速切换、模式选择和 WRT 完整性；构建器测试覆盖阈值排序与压缩数据快照索引。真实浏览器组件测试覆盖六阶段预览、目标切换、重复阈值提示和导出重导入。

示例和本地构建验证记录位于工作区 `generated/quiet-bird-progress-20260928` 与 `generated/goal-progress-images-20260928`。编译、模拟器与实体手表验证分别记录，不能互相替代。本次只做本地实现、验证和提交，不发布线上。
