type User = { roles?: Array<{ roleCode: string; status?: number }>; studioMembership?: { consumer?: boolean; canExport?: boolean } | null } | null | undefined
export function isStudioConsumer(user: User): boolean {
  if (user?.roles?.some(role => role.status !== 0 && ['ROLE_ADMIN', 'ROLE_MERCHANT'].includes(role.roleCode))) return false
  return user?.studioMembership?.consumer ?? user?.studioMembership?.canExport !== true
}
