import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface PrgInstallerTicket {
  ticket: string
  expiresInSeconds: number
}

const TICKET_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

export async function createPrgInstallerTicket(releaseId: number): Promise<PrgInstallerTicket> {
  const response = await instance.post('/dsn/products/prg-installer/tickets', { releaseId }) as ApiResponse<PrgInstallerTicket>
  if (!response.data) {
    throw new Error('PrgInstaller ticket response is missing')
  }
  return response.data
}

export function buildPrgInstallerDeepLink(ticket: string): string {
  if (!TICKET_PATTERN.test(ticket)) {
    throw new Error('Invalid prgInstaller ticket')
  }
  return `wristo-prg-installer://run?ticket=${ticket}`
}

export function createPrgInstallerTicketCache(
  createTicket: (releaseId: number) => Promise<PrgInstallerTicket> = createPrgInstallerTicket,
  now: () => number = Date.now,
) {
  const tickets = new Map<number, { ticket: string; expiresAt: number }>()
  const pending = new Map<number, Promise<void>>()

  const prepare = (releaseId: number): Promise<void> => {
    const cached = tickets.get(releaseId)
    if (cached && cached.expiresAt > now()) return Promise.resolve()
    const existing = pending.get(releaseId)
    if (existing) return existing

    const request = createTicket(releaseId)
      .then(({ ticket, expiresInSeconds }) => {
        tickets.set(releaseId, {
          ticket,
          expiresAt: now() + Math.max(0, expiresInSeconds - 5) * 1000,
        })
      })
      .finally(() => pending.delete(releaseId))
    pending.set(releaseId, request)
    return request
  }

  const take = (releaseId: number): string | undefined => {
    const cached = tickets.get(releaseId)
    tickets.delete(releaseId)
    return cached && cached.expiresAt > now() ? cached.ticket : undefined
  }

  return { prepare, take }
}
