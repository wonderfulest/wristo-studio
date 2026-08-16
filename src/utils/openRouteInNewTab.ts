import type { RouteLocationRaw } from 'vue-router'

type RouteResolver = { resolve: (route: RouteLocationRaw) => { href: string } }
type WindowOpener = (url?: string | URL, target?: string, features?: string) => Window | null

export function openRouteInNewTab(
  router: RouteResolver,
  route: RouteLocationRaw,
  openWindow: WindowOpener = window.open.bind(window),
): void {
  const openedWindow = openWindow(router.resolve(route).href, '_blank', 'noopener')
  if (openedWindow) openedWindow.opener = null
}
