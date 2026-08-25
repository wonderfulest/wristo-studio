import type { LayoutGroupBinding } from '@/types/layoutGroup'

export interface LayoutGroupBindableElement {
  id: string
  dataProperty?: string | null
  goalProperty?: string | null
}

export interface LayoutGroupBindingState {
  binding: LayoutGroupBinding | null
  overriddenElementIds: string[]
}

const normalizedBinding = (element: LayoutGroupBindableElement): LayoutGroupBinding | null => {
  const goalProperty = String(element.goalProperty ?? '').trim()
  if (goalProperty) return { kind: 'goal', propertyKey: goalProperty }
  const dataProperty = String(element.dataProperty ?? '').trim()
  if (dataProperty) return { kind: 'data', propertyKey: dataProperty }
  return null
}

const sameBinding = (left: LayoutGroupBinding | null, right: LayoutGroupBinding | null): boolean =>
  left?.kind === right?.kind && left?.propertyKey === right?.propertyKey

export function resolveLayoutGroupBindingState(
  persistedBinding: LayoutGroupBinding | undefined,
  elements: readonly LayoutGroupBindableElement[],
): LayoutGroupBindingState {
  const binding = persistedBinding ?? (() => {
    if (elements.length === 0) return null
    const first = normalizedBinding(elements[0])
    if (!first || elements.some((element) => !sameBinding(normalizedBinding(element), first))) return null
    return first
  })()

  if (!binding) return { binding: null, overriddenElementIds: [] }
  return {
    binding,
    overriddenElementIds: elements
      .filter((element) => !sameBinding(normalizedBinding(element), binding))
      .map((element) => String(element.id)),
  }
}
