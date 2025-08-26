---
trigger: model_decision
description: add element
---


时间元素添加调用链路（含参数类型）

1. 启动点：用户界面交互

文件: src/components/AddElementPanel.vue:48-71

```js
// 入参
const addElementByType = async (
  category: string,           // 类别名称，如'time'
  elementType: string,        // 元素类型，如'time'
  config: ElementConfig       // 元素配置对象
): Promise<void> => {
  // 出参: void
}
```

2. 注册中心分发

文件: src/utils/elementCodec/registry.ts:37-44

```js
// 获取添加元素处理器
const getAddElement = (
  elementType: ElementType    // 元素类型，如'time'
): AddElementFn => {         // 返回添加元素的函数
  // 返回类型: AddElementFn
  // AddElementFn = (elementType: ElementType, config: ElementConfig) => Promise<FabricElement> | FabricElement
}
```

3. 时间元素特定处理

文件: src/utils/elementCodec/time/timeCodec.ts:18-21

```js
// 时间元素的添加处理器
const addElement: AddElementFn = (
  _elementType: ElementType,  // 元素类型（未使用，用_前缀）
  config: ElementConfig       // 元素配置
): Promise<FabricText> => {   // 返回FabricText对象
  const store = useTimeStore()
  return store.addElement(config)
}
```

4. 核心业务逻辑

文件: src/stores/elements/time/timeElement.ts:33-65

```js
// 主要添加逻辑
async addElement(
  options: ElementConfig      // 元素配置
): Promise<FabricText> {     // 返回FabricText对象
  // ElementConfig结构:
  // {
  //   id?: string;
  //   type: string;
  //   x: number;
  //   y: number;
  //   font?: string;
  //   size?: number;
  //   color?: string;
  //   formatter?: number;
  //   originX?: string;
  //   originY?: string;
  // }
}
```

5. 时间格式化工具

文件: src/stores/elements/time/timeElement.ts:25-32

```js
// 时间格式化函数
formatTime(
  date: Date,                // 日期对象
  formatter: number | string | undefined  // 格式化选项
): string {                  // 返回格式化后的时间字符串
  // 使用TimeFormatOptions映射
}
```

6. 编码器（序列化）

文件: src/utils/elementCodec/time/timeCodec.ts:7-11

```js
// 编码器：元素 -> 配置
const encodeTime: EncoderFn = (
  element: FabricElement     // Fabric元素对象
): ElementConfig => {        // 返回序列化配置
  const store = useTimeStore()
  return store.encodeConfig(element)
}
```

7. 解码器（反序列化）

文件: src/utils/elementCodec/time/timeCodec.ts:13-16

```js
// 解码器：配置 -> 元素属性
const decodeTime: DecoderFn = (
  config: ElementConfig      // 元素配置
): Partial<FabricElement> => {  // 返回部分Fabric元素属性
  const store = useTimeStore()
  return store.decodeConfig(config)
}
```

类型定义总结

核心类型

```js
// 元素配置接口
interface ElementConfig {
  id?: string;
  type: string;
  x: number;
  y: number;
  font?: string;
  size?: number;
  color?: string;
  formatter?: number;
  originX?: string;
  originY?: string;
}

// 添加元素函数类型
type AddElementFn = (
  elementType: ElementType, 
  config: ElementConfig
) => Promise<FabricElement> | FabricElement;

// 编码器函数类型
type EncoderFn = (element: FabricElement) => ElementConfig | null;

// 解码器函数类型
type DecoderFn = (config: ElementConfig) => Partial<FabricElement>;
```

完整调用链路总结

用户点击时间按钮
    ↓
AddElementPanel.addElementByType()
    ↓
getAddElement('time') [注册中心]
    ↓
timeCodec.addElement() [时间元素处理器]
    ↓
timeStore.addElement() [核心业务逻辑]
    ↓
Fabric.Text [创建Fabric对象]
    ↓
canvas.add() [添加到画布]
    ↓
layerStore.addLayer() [图层管理]

关键组件职责

- AddElementPanel: UI交互入口，负责字体加载和面板切换
- registry: 元素类型注册中心，管理所有元素的添加器
- timeCodec: 时间元素的编解码器，桥接注册中心和store
- timeStore: 时间元素的业务逻辑实现，包含创建、更新、编码、解码
- elementConfigs: 提供时间元素的默认配置属性

这个架构设计实现了高度的模块化，新增其他类型元素时也遵循相同的模式。