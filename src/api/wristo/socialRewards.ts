import instance from '@/config/axios'
import type { ApiResponse } from '@/types/api/api'
export interface SocialSettings { enabled: boolean; credits: number; monthlyLimit: number }
export interface SocialScreenshot { id: string; url: string }
export interface SocialSubmission { id: string; revision: number; userId: string; platform: string; shareUrl: string; notes: string; screenshots: SocialScreenshot[]; status: 'PENDING' | 'APPROVED' | 'REJECTED'; credits: number; reviewNote: string; reviewedBy: string | null; createdAt: string; updatedAt: string; reviewedAt: string | null }
export interface SocialPage { items: SocialSubmission[]; total: number; page: number; pageSize: number }
export interface SocialProgress extends SocialPage { settings: SocialSettings; month: string; approvedThisMonth: number }
export interface SocialInput { platform: string; shareUrl: string; notes: string; screenshotIds: string[] }
const base = '/user/studio-credits/tasks/social'
export const socialRewardsApi = {
  list: (page = 1): Promise<ApiResponse<SocialProgress>> => instance.get(base, { params: { page, pageSize: 10 } }),
  submit: (data: SocialInput, id?: string): Promise<ApiResponse<SocialSubmission>> => id ? instance.put(`${base}/${encodeURIComponent(id)}`, data) : instance.post(base, data),
  upload: (file: File): Promise<ApiResponse<SocialScreenshot>> => { const body = new FormData(); body.append('file', file); return instance.post(`${base}/screenshots`, body, { headers: { 'Content-Type': 'multipart/form-data' } }) },
}
