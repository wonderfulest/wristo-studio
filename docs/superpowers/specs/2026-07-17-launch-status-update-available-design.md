# Launch Status 增加 Update Available 筛选

## 目标

在 Studio 的 My Projects 页面中，为 Launch Status 增加 `Update Available` 选项，用于筛选已经 Publish 过、且最新 IQ Release 在最近一次 Publish 之后又发生更新的项目。

现有 Last Publish 红点逻辑保持不变。红点仍同时覆盖：

- 已生成 IQ Release、但从未 Publish 的项目；
- 最新 IQ Release 更新时间晚于 Last Publish 的项目。

## 用户界面

Launch Status 下拉框包含：

- Launched
- Not Launched
- Update Available

`Update Available` 的请求值为 `update_available`。它是 Launched 项目的子集；选择 Launched 时仍显示所有已经 Publish 的项目，包括存在待更新版本的项目。

所有 Studio 已支持语言均增加对应文案，英文文案固定为 `Update Available`。

## 数据契约

Studio 扩展 `LaunchStatus` 类型、本地存储值校验和下拉选项，并通过现有设计分页接口传递：

```text
launchStatus=update_available
```

API 保持现有 Controller 和 DTO 的字符串传递方式，在 `DesignMapper.selectByCondition` 中增加服务端分页条件。

项目满足 `update_available` 必须同时满足：

1. 存在未删除的关联产品；
2. 产品 `last_go_live IS NOT NULL`；
3. 存在未删除的 IQ Release；
4. 按 `release_time DESC` 选出的最新 IQ Release，其 `updated_at > product.last_go_live`。

PRG Release、设计自身的 `updated_at` 和打包队列状态均不参与判断。

## 查询方案

筛选在 `DesignMapper.xml` 中使用相关 `EXISTS` 子查询完成，从而让筛选发生在分页之前，保证列表、总数和页码一致。

最新 IQ Release 的选取规则与 My Projects 当前加载的 `product.release` 一致：以 `release_time` 判断最新记录，然后使用该记录的 `updated_at` 与 `last_go_live` 比较。

## 兼容与边界

- 没有产品：不匹配。
- 从未 Publish，即使已有 IQ Release：红点显示，但不匹配 Update Available。
- 已 Publish 但没有 IQ Release：不匹配。
- 最新 IQ Release 的 `updated_at` 等于 Last Publish：不匹配。
- 较旧 Release 在 Publish 后被更新、但最新 Release 未更新：不匹配；筛选只看按 `release_time` 选出的最新 Release。
- 旧的本地筛选值继续有效，新值通过更新后的白名单恢复。

## 验证

- 为后端筛选条件增加针对上述边界的测试，或在现有测试基础设施无法直接执行 Mapper SQL 时增加最接近数据层的验证。
- 在 `wristo-api` 运行相关测试，风险允许时运行 `mvn test`。
- 在 `wristo-studio` 运行 `npm run build`，确认类型检查、多语言键和构建通过。
- 检查两个独立仓库的差异，确保不混入已有用户改动。
