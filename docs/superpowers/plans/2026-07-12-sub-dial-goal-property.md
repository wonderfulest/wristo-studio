# SubDial Goal Property Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `subDial` 从 `dataProperty` 彻底切换为 `goalProperty`，并让 Studio 创建、重绑、序列化和 Connect IQ 运行时行为与 `goalBar`、`goalArc` 一致。

**Architecture:** Studio 的 `SubDialElementConfig`、schema、panel、renderer 和 encoder 只保留 `goalProperty`，live Fabric 属性优先于 `__element.config`。脚手架只规范化 `goalProperty`，SuperAlpha 模板读取目标当前值与目标值的比率，SuperBarrel 将该 `0–1` 比率转换为现有 `0–100` 百分比输入后绘制。

**Tech Stack:** Vue 3、TypeScript、Vitest、Python unittest、Jinja2、Monkey C。

---

### Task 1: Studio 配置契约与属性面板

**Files:**
- Modify: `src/types/elements/subDial.ts`
- Modify: `src/elements/dials/subDial/subDial.schema.ts`
- Modify: `src/elements/dials/subDial/subDial.panel.vue`
- Modify: `src/elements/dials/subDial/subDial.panel.test.ts`
- Modify: `src/i18n.ts`

- [ ] **Step 1: 写失败测试**

在 `subDial.panel.test.ts` 断言面板导入并渲染 `GoalPropertyField`、补丁字段为 `goalProperty`，且源码不再包含 `DataPropertyField` 或 `dataProperty`。

```ts
expect(source).toContain("import GoalPropertyField from '@/elements/common/settings/GoalPropertyField.vue'")
expect(source).toContain('patch({ goalProperty: $event })')
expect(source).not.toContain('DataPropertyField')
expect(source).not.toContain('dataProperty')
```

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.panel.test.ts`
Expected: FAIL，面板仍使用 `DataPropertyField` 和 `dataProperty`。

- [ ] **Step 3: 实现最小契约切换**

将 `SubDialElementConfig.dataProperty` 和 schema 默认值改为 `goalProperty`；面板替换为：

```vue
<GoalPropertyField
  :model-value="model.goalProperty"
  :required="false"
  @change="patch({ goalProperty: $event })"
/>
```

把 `subDial.data` 的中英文标题分别调整为 `Goal` 和 `目标`。

- [ ] **Step 4: 运行测试与类型检查**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.panel.test.ts && npm run typecheck`
Expected: PASS，退出码 0。

### Task 2: Studio live 属性、重绑和新建自动分配

**Files:**
- Modify: `src/elements/dials/subDial/subDial.encoder.test.ts`
- Modify: `src/elements/dials/subDial/subDial.encoder.ts`
- Modify: `src/elements/dials/subDial/subDial.renderer.test.ts`
- Modify: `src/elements/dials/subDial/subDial.renderer.ts`
- Create: `src/components/panels/AddElementPanel.test.ts`
- Modify: `src/components/panels/AddElementPanel.vue`

- [ ] **Step 1: 写 encoder 与 renderer 失败测试**

```ts
it('prefers live goalProperty over stale widget config', () => {
  const encoded = encodeSubDial({
    id: 'sd-1', goalProperty: 'goal_live', scaleX: 1,
    __element: { config: makeConfig({ goalProperty: 'goal_stale' }) },
  } as any)
  expect(encoded.goalProperty).toBe('goal_live')
  expect(encoded).not.toHaveProperty('dataProperty')
})
```

在 renderer 测试中断言创建后的 group 暴露 `goalProperty`，更新补丁后 live 属性和 `__element.config.goalProperty` 同时改变，并保留当前未提交的三角指针测试。

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `npm run test:unit -- src/elements/dials/subDial/subDial.encoder.test.ts src/elements/dials/subDial/subDial.renderer.test.ts`
Expected: FAIL，live `goalProperty` 尚未写入或 encoder 仍读取旧配置。

- [ ] **Step 3: 实现 live/config 同步**

创建 group 时设置：

```ts
goalProperty: finalConfig.goalProperty,
```

更新时同时设置 live 属性与配置：

```ts
group.set('goalProperty', config.goalProperty)
widget.config = config
```

encoder 输出值采用：

```ts
goalProperty: String(live.goalProperty ?? stored.goalProperty ?? defaults.goalProperty),
```

- [ ] **Step 4: 写新建自动分配失败测试**

在 `AddElementPanel.test.ts` 断言 `subDial` 进入 goal 元素分支，并优先绑定未使用的 goal key。

```ts
expect(source).toContain("['goalBar', 'goalArc', 'subDial'].includes(elementType)")
```

- [ ] **Step 5: 运行失败测试并实现最小修改**

Run: `npm run test:unit -- src/components/panels/AddElementPanel.test.ts`
Expected: FAIL，goal 元素列表尚无 `subDial`。

将 `ensureMetricPropertyForElement` 的 goal 元素列表改为 `['goalBar', 'goalArc', 'subDial']`。

- [ ] **Step 6: 运行 Studio 聚焦测试与类型检查**

Run: `npm run test:unit -- src/elements/dials/subDial src/components/panels/AddElementPanel.test.ts && npm run typecheck`
Expected: PASS，退出码 0。

### Task 3: 脚手架规范化与模板目标进度

**Files:**
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/super-extract-elements.py`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial_template.py`
- Modify: `../wristo-apps/SuperAlpha/source/SuperAlphaView.j2.mc`

- [ ] **Step 1: 写脚手架失败测试**

```py
self.assertEqual(result["subDials"][0]["goalProperty"], "goal_1")
self.assertNotIn("dataProperty", result["subDials"][0])
```

测试输入只提供 `goalProperty: "goal_1"`；另加未绑定目标字段时抛出包含元素 ID 的 `ValueError`。

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial`
Expected: FAIL，规范化结果仍输出 `dataProperty`。

- [ ] **Step 3: 实现脚手架最小修改**

在 `normalize_sub_dial()` 中严格读取非空 `goalProperty`：

```py
goal_property = str(element.get("goalProperty") or "").strip()
if not goal_property:
    raise ValueError(f"Invalid subDial goalProperty for {element_id}")
normalized["goalProperty"] = goal_property
normalized["goalPropertyLiteral"] = to_monkey_c_string_literal(goal_property)
```

删除该函数中的 `dataProperty` 输出。

- [ ] **Step 4: 运行脚手架测试并确认通过**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial`
Expected: PASS，退出码 0。

- [ ] **Step 5: 写 Jinja 模板失败测试**

断言生成源码包含：

```text
_.getSafeFloat(goal_1_fetch[DATA_LOGIC_VALUE]) / _.getSafeFloat(goal_1_fetch[DATA_GOAL])
```

并断言 subDial 模板片段不包含 `dataProperty`。

- [ ] **Step 6: 运行失败测试并修改模板**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_template`
Expected: FAIL，模板仍引用 `element.dataProperty`。

把 `SubDial.draw` 的数值参数替换为与 goalBar/goalArc 相同的 goal 比率表达式。

- [ ] **Step 7: 运行模板测试并确认通过**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_template`
Expected: PASS，退出码 0。

### Task 4: SuperBarrel 比率转换与整体验证

**Files:**
- Modify: `../wristo-apps/SuperBarrel/dials/SubDial.mc`
- Modify: `../wristo-connectiq-app-build/wristo-scaffold/tests/test_sub_dial_runtime.py`

- [ ] **Step 1: 写运行时契约失败测试**

在模板/源码契约测试中读取 `SubDial.mc`，断言 draw 先将目标比率转换为百分比值：

```py
self.assertIn("var percentageValue = value == null ? null : value.toFloat() * 100.0;", source)
self.assertIn("normalize(percentageValue, config[:minValue], config[:maxValue]", source)
```

- [ ] **Step 2: 运行测试并确认正确失败**

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_runtime`
Expected: FAIL，运行时尚未转换目标比率。

- [ ] **Step 3: 实现最小比率转换**

在 `SubDial.draw` 中使用：

```monkeyc
var percentageValue = value == null ? null : value.toFloat() * 100.0;
var progress = normalize(percentageValue, config[:minValue], config[:maxValue], config[:hideOutOfRange]);
```

数值文本也使用 `percentageValue`，让默认 `%` 单位显示完成百分比；无效值继续只绘制静态表盘。

- [ ] **Step 4: 运行全部聚焦测试**

Run: `npm run test:unit -- src/elements/dials/subDial src/components/panels/AddElementPanel.test.ts`
Expected: PASS，退出码 0。

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial`
Expected: PASS，退出码 0。

Run: `cd ../wristo-connectiq-app-build/wristo-scaffold && python3 -m unittest tests.test_sub_dial_template tests.test_sub_dial_runtime`
Expected: PASS，退出码 0。

- [ ] **Step 5: 运行构建与静态检查**

Run: `npm run build`
Expected: PASS，退出码 0。

Run: `git diff --check`（分别在 `wristo-studio`、`wristo-connectiq-app-build`、`wristo-apps`）
Expected: 无输出，退出码 0。
