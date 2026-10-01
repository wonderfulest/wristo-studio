import { wikiChapters, type WikiChapter, type WikiSection } from './wikiContent'

export const sectionId = (chapter: WikiChapter, section: WikiSection, index: number) => section.id || `${chapter.id}-${index + 1}`

export const wikiSections = wikiChapters.flatMap((chapter) =>
  chapter.sections.map((section, index) => {
    const text = [
      ...(section.paragraphs || []),
      ...(section.steps || []),
      ...(section.items || []),
      ...(section.table?.columns || []),
      ...(section.table?.rows.flat() || []),
      section.example,
      section.expected,
      section.note,
      ...(section.links?.map((link) => link.label) || [])
    ]
      .filter(Boolean)
      .join(' ')
    return { id: sectionId(chapter, section, index), chapter, section, text }
  })
)

export function searchWiki(query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  return wikiSections.filter(({ chapter, section, text }) => {
    const searchable = `${chapter.title} ${chapter.summary} ${section.title} ${text}`.toLocaleLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}
