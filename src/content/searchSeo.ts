import { searchPages, searchPageSchema, studioOrigin } from './searchPages'

export function applySearchSeo(path: string): void {
  const normalized = path.replace(/\/$/, '') || '/'
  const page = searchPages.find(item => item.path === normalized)
  const origin = studioOrigin(import.meta.env.VITE_WRISTO_STUDIO_URL || 'https://studio.wristo.io')
  const title = page?.title || 'Wristo Studio'
  const description = page?.description || 'Design and manage Garmin watch faces in Wristo Studio.'
  document.title = title
  const meta = (key: string, value: string, property = false) => {
    const attribute = property ? 'property' : 'name'
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
    if (!element) {
      element = document.createElement('meta')
      element.setAttribute(attribute, key)
      document.head.appendChild(element)
    }
    element.content = value
  }
  meta('description', description)
  // Index only editorial pages. Private designs and unresolved gallery details are not search landing pages.
  meta('robots', page ? 'index, follow' : 'noindex, follow')
  meta('og:title', title, true)
  meta('og:description', description, true)
  meta('og:url', origin + normalized, true)
  meta('og:type', page && page.path !== '/' ? 'article' : 'website', true)
  meta('og:site_name', 'Wristo Studio', true)
  meta('og:image', 'https://cdn.wristo.io/brands/wristo-logo/png/wristo-og-cover-1200x630.png', true)
  meta('twitter:card', 'summary_large_image')
  meta('twitter:title', title)
  meta('twitter:description', description)
  meta('twitter:image', 'https://cdn.wristo.io/brands/wristo-logo/png/wristo-og-cover-1200x630.png')
  document.head.querySelectorAll('link[rel="canonical"], script[data-studio-seo]').forEach(node => node.remove())
  if (page) {
    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = origin + page.path
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.studioSeo = 'true'
    script.textContent = JSON.stringify(searchPageSchema(page, origin)).replace(/</g, '\\u003c')
    document.head.appendChild(script)
    document.documentElement.lang = 'en'
  }
}
