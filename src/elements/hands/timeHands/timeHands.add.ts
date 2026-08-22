import type { AnyElementConfig } from '@/types/elements'

interface AddTimeHandsDependencies {
  runAtomic: <T>(task: () => Promise<T>) => Promise<T>
  addElement: (config: AnyElementConfig) => Promise<unknown>
  saveHistory: () => unknown
}

export const addTimeHandsGroup = async (
  configs: AnyElementConfig[],
  dependencies: AddTimeHandsDependencies,
): Promise<void> => {
  await dependencies.runAtomic(async () => {
    for (const config of configs) {
      const result = await dependencies.addElement(config)
      if (!result) {
        throw new Error(`Unable to create Time Hands element: ${String(config.eleType)}`)
      }
    }
  })
  dependencies.saveHistory()
}
