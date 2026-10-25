import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { searchPagesPlugin } from '../../scripts/search-pages'
import { searchPages } from './searchPages'

describe('static search build', () => {
  it('emits useful public HTML, isolated noindex fallback and a truthful sitemap', async () => {
    const root = path.resolve(process.cwd(), '../generated')
    await mkdir(root, { recursive: true })
    const directory = await mkdtemp(path.join(root, 'studio-search-test-'))
    try {
      await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><head><title>Wristo Studio</title></head><body><div id="app"></div><script src="/assets/app.js"></script></body></html>')
      const writeBundle = searchPagesPlugin('http://localhost:3004').writeBundle as (options: { dir: string }) => Promise<void>
      await writeBundle({ dir: directory })
      for (const page of searchPages) {
        const file = path.join(directory, page.path === '/' ? 'index.html' : `${page.path.slice(1)}/index.html`)
        const html = await readFile(file, 'utf8')
        expect(html).toContain('<h1>')
        expect(html).toContain(`href="https://studio.wristo.io${page.path}"`)
        expect(html).toContain('application/ld+json')
        expect(html).not.toContain('localhost')
      }
      const fallback = await readFile(path.join(directory, 'app.html'), 'utf8')
      expect(fallback).toContain('noindex, follow')
      expect(fallback).not.toContain('Your watch.')
      expect(await readFile(path.join(directory, '404.html'), 'utf8')).toContain('Page not found')
      const sitemap = await readFile(path.join(directory, 'sitemap.xml'), 'utf8')
      expect(sitemap.match(/<loc>/g)?.length).toBe(3)
      expect(sitemap).not.toContain('/designs')
      expect(sitemap).not.toContain('lastmod')
      expect(await readFile(path.join(directory, 'robots.txt'), 'utf8')).toContain('Sitemap: https://studio.wristo.io/sitemap.xml')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
