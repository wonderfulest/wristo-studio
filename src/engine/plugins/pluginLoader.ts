/**
 * PluginLoader
 *
 * 自动扫描并加载 elements 下的所有 *.plugin.ts 文件，用于注册元素能力与 Settings 组件。
 */
export function loadPlugins() {
  // Vite 的 import.meta.glob 只能使用相对路径或别名，这里用 '@' 指向 src
  const modules = import.meta.glob('@/elements/**/*.plugin.ts', {
    eager: true,
  }) as Record<string, any>

  Object.values(modules).forEach((mod) => {
    if (mod && typeof mod.default === 'function') {
      try {
        mod.default()
      } catch (e) {
        console.error('[PluginLoader] plugin init failed', e)
      }
    }
  })
}
