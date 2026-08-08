import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'

export interface LauncherTicket {
  ticket: string
  expiresInSeconds: number
}

const TICKET_PATTERN = /^[A-Za-z0-9_-]{32,128}$/

export async function createLauncherTicket(releaseId: number): Promise<LauncherTicket> {
  const response = await instance.post('/dsn/products/launcher/tickets', { releaseId }) as ApiResponse<LauncherTicket>
  if (!response.data) {
    throw new Error('Launcher ticket response is missing')
  }
  return response.data
}

export function buildLauncherDeepLink(ticket: string): string {
  if (!TICKET_PATTERN.test(ticket)) {
    throw new Error('Invalid launcher ticket')
  }
  return `wristo-ciq://run?ticket=${ticket}`
}

export function createLauncherTicketCache(
  createTicket: (releaseId: number) => Promise<LauncherTicket> = createLauncherTicket,
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
