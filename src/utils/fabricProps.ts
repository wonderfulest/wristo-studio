import { FabricObject } from 'fabric'

// 默认需要参与序列化的自定义字段
const DEFAULT_FABRIC_PROPS = [
  'id',
  'eleType',
  'metricSymbol',
  'metricGroup',
  'guideline',
  'keyGuideline',
  'type',
  // 常见绑定字段
  'textProperty',
  'dataProperty',
  'goalProperty',
  // 滚动字段
  'scrollAreaWidth',
  'scrollAreaLeft',
  'scrollAreaTop',
  'scrollAreaBackground',
] as const

const registry = new Set<string>(DEFAULT_FABRIC_PROPS)

// 允许其他模块注册额外属性
export function registerFabricProps(props: readonly string[]): void {
  props.forEach((p) => registry.add(p))
  // 同步到 Fabric
  FabricObject.customProperties = Array.from(registry)
}

// 扫描当前画布对象，自动发现以 Property 结尾或以 bind 开头的自定义绑定字段
export function discoverAndRegisterCanvasProps(objs: unknown[]): void {
  const skip = new Set<string>([...Object.keys((FabricObject.prototype as unknown as Record<string, unknown>))])
  for (const obj of objs as Array<Record<string, unknown>>) {
    for (const key of Object.keys(obj)) {
      if (skip.has(key)) continue
      if (registry.has(key)) continue
      if (/(?:Property|Binding)$/.test(key) || key.startsWith('bind')) {
        registry.add(key)
      }
    }
  }
  FabricObject.customProperties = Array.from(registry)
}

export function getFabricProps(): string[] {
  return Array.from(registry)
}

export function applyFabricCustomProperties(): void {
  FabricObject.customProperties = Array.from(registry)
}
