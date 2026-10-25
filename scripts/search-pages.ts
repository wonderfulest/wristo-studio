import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'
import { escapeHtml, renderSearchPage, searchPages, searchPageSchema, studioOrigin } from '../src/content/searchPages'

/** Deterministic static HTML: no browser install, API or authenticated session needed. */
export function searchPagesPlugin(site: string): Plugin {
  const origin = studioOrigin(site)
  return {
    name: 'studio-search-pages',
    apply: 'build',
    enforce: 'post',
    async writeBundle(options) {
      const directory = path.resolve(options.dir || 'dist')
      const shell = await readFile(path.join(directory, 'index.html'), 'utf8')
      // The SPA fallback must never present the public home as a private route's content.
      const fallback = shell.replace('<title>Wristo Studio</title>', '<title>Wristo Studio</title><meta name="robots" content="noindex, follow">')
      await writeFile(path.join(directory, 'app.html'), fallback)
      await writeFile(path.join(directory, '404.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, follow"><title>Page not found | Wristo Studio</title><link rel="stylesheet" href="/studio-public.css"></head><body class="studio-public"><main class="public-hero"><h1>Page not found.</h1><p>This address does not match a Studio page.</p><a href="/">Return to Wristo Studio →</a></main></body></html>')
      for (const page of searchPages) {
        const url = origin + page.path
        const image = 'https://cdn.wristo.io/brands/wristo-logo/png/wristo-og-cover-1200x630.png'
        const head = `<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(url)}">
<meta property="og:site_name" content="Wristo Studio">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${escapeHtml(url)}">
<meta property="og:type" content="${page.path === '/' ? 'website' : 'article'}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(page.title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
<meta name="twitter:image" content="${image}">
<script type="application/ld+json" data-studio-seo="true">${JSON.stringify(searchPageSchema(page, origin)).replace(/</g, '\\u003c')}</script>`
        const html = shell.replace('<title>Wristo Studio</title>', head).replace('<div id="app"></div>', `<div id="app">${renderSearchPage(page)}</div>`)
        const file = path.join(directory, page.path === '/' ? 'index.html' : `${page.path.slice(1)}/index.html`)
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, html)
      }
      await writeFile(path.join(directory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${searchPages.map(page => `<url><loc>${escapeHtml(origin + page.path)}</loc></url>`).join('')}</urlset>\n`)
      // Let crawlers see noindex on app pages; authentication still protects private data.
      await writeFile(path.join(directory, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`)
      console.log(`[seo] Generated ${searchPages.length} public Studio pages, sitemap and robots.txt.`)
    },
  }
}
