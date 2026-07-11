export type ElementRenderContext = Readonly<{
  assertDocumentCurrent: () => void
}>

export function assertElementRenderCurrent(context?: ElementRenderContext): void {
  context?.assertDocumentCurrent()
}
