export const isLocalProject = (id: string) => /^local-[a-zA-Z0-9-]+$/.test(id)
export const localProjectDraftKey = (id: string) => `studio-local-project:${id}`
