import { faceDetailsUrl } from './catalog'

export function faceShareUrl(origin: string, appId: number): string {
  return new URL(faceDetailsUrl(appId), origin).href
}

export function buildFaceShareLinks(url: string, title: string) {
  return [
    { label: 'X', href: `https://twitter.com/intent/tweet?${new URLSearchParams({ url, text: title })}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url })}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?${new URLSearchParams({ url, title })}` },
  ]
}
