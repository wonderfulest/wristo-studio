export interface DataCatalogStartupOptions {
  load: (force: boolean) => Promise<unknown>
  mount: () => unknown
  report: (error: unknown) => void
  root: Element
}

const errorMessage = (error: unknown) => (error instanceof Error && error.message.trim() ? error.message : 'Unknown startup error')

export const shouldLoadDataCatalog = (pathname: string) => /^\/design\/?(?:\?|$)/.test(pathname)

export function renderDataCatalogStartupError(root: Element, error: unknown, retry: () => void) {
  const alert = document.createElement('section')
  alert.setAttribute('role', 'alert')
  alert.setAttribute('aria-live', 'assertive')
  alert.className = 'data-catalog-startup-error'

  const title = document.createElement('h1')
  title.textContent = "Studio couldn't start"
  const summary = document.createElement('p')
  summary.textContent = 'The data catalog could not be loaded.'
  const detail = document.createElement('p')
  detail.textContent = errorMessage(error)
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Retry'
  button.addEventListener('click', retry)

  alert.append(title, summary, detail, button)
  root.replaceChildren(alert)
}

export function createDataCatalogStartup(options: DataCatalogStartupOptions) {
  let mounted = false
  let pending: Promise<void> | null = null

  const attempt = (force: boolean): Promise<void> => {
    if (mounted) return Promise.resolve()
    if (pending) return pending

    pending = options
      .load(force)
      .then(() => {
        if (mounted) return
        options.root.replaceChildren()
        options.mount()
        mounted = true
      })
      .catch((error: unknown) => {
        options.report(error)
        renderDataCatalogStartupError(options.root, error, () => {
          void retry().catch(() => undefined)
        })
        throw error
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  const retry = () => attempt(true)

  return {
    start: () => attempt(false),
    retry
  }
}
