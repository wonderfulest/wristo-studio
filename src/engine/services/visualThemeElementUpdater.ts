import { getElementHandler, type ElementUpdateContext } from '@/engine/registry/elementRegistry'

export async function applyVisualThemeElementPatch(
  element: Record<string, any>,
  patch: Record<string, unknown>,
  context: ElementUpdateContext = { persist: false },
): Promise<void> {
  const handler = getElementHandler(element.eleType as any)
  await Promise.resolve(handler.update?.(element as any, patch as any, context))
}
