type EditorPluginModule = {
  loadPlugins: () => void
}

type EditorRuntimeDependencies = {
  loadStyles: () => Promise<unknown>
  loadPluginModule: () => Promise<EditorPluginModule>
}

export function createEditorRuntimeInitializer({
  loadStyles,
  loadPluginModule,
}: EditorRuntimeDependencies): () => Promise<void> {
  let initialization: Promise<void> | null = null

  return () => {
    if (!initialization) {
      initialization = Promise.all([loadStyles(), loadPluginModule()])
        .then(([, pluginModule]) => {
          pluginModule.loadPlugins()
        })
        .catch((error: unknown) => {
          initialization = null
          throw error
        })
    }
    return initialization
  }
}

export const initializeEditorRuntime = createEditorRuntimeInitializer({
  loadStyles: () => import('@/assets/styles/garmin-system-fonts.css'),
  loadPluginModule: () => import('@/engine/plugins'),
})
