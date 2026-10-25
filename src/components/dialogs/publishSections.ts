export type PublishSection = 'listing' | 'media' | 'distribution'

export function publishSectionForInvalidFields(fields: Record<string, unknown>): PublishSection {
  return Object.keys(fields).some(key => ['name', 'description', 'tagIds'].includes(key)) ? 'listing' : 'distribution'
}

export const publishSectionCopy: Record<PublishSection, { title: string; description: string }> = {
  listing: { title: 'Store listing', description: 'The name, description and tags people see in the store.' },
  media: { title: 'Visual assets', description: 'Watch face artwork, storefront images and social previews.' },
  distribution: { title: 'Availability & pricing', description: 'Store links, payment details and application identity.' },
}
