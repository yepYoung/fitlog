import type { AppRecord, Settings } from '../types'

let active = false
export const setCloudActive = (value: boolean) => { active = value }
export const isCloudActive = () => active

export interface CloudData {
  records: AppRecord[]
  knownRecordIds: string[]
  settings: Partial<Settings>
}

export class CloudError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function cloudRequest(path: string, init: RequestInit = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`/api/${path}`, {
      ...init, credentials: 'same-origin', cache: 'no-store',
      headers: { 'X-Fitlog-Request': '1', ...init.headers },
      signal: init.signal ?? AbortSignal.timeout(30000),
    })
  } catch { throw new CloudError('连接失败，未能确认云端保存结果，请重试', 0) }
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('fitlog-auth-required'))
    const data = await response.json().catch(() => null)
    throw new CloudError(data?.error ?? `云端请求失败（${response.status}）`, response.status)
  }
  return response
}

export const cloudJson = (path: string, method: string, data: unknown) => cloudRequest(path, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
})
export const loadCloudData = async (): Promise<CloudData> => (await cloudRequest('data')).json()
export const saveCloudRecord = (record: AppRecord, importOnly = false) => cloudJson(`records/${record.id}`, 'PUT', { record, importOnly })
export const saveCloudSettings = (settings: Partial<Settings>, importOnly = false) => cloudJson('settings', 'PATCH', { settings, importOnly })
export const uploadCloudPhoto = (id: string, blob: Blob) => cloudRequest(`photos/${id}`, { method: 'PUT', body: blob })
export async function loadCloudPhoto(id: string): Promise<Blob | null> {
  try { return await (await cloudRequest(`photos/${id}`)).blob() }
  catch (error) { if (error instanceof CloudError && error.status === 404) return null; throw error }
}
