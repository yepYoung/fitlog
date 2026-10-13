import { beforeEach, describe, expect, it, vi } from 'vitest'
import { importLocalData } from '../utils/cloudMigration'
import { loadCloudData, saveCloudRecord, saveCloudSettings, uploadCloudPhoto } from '../utils/cloud'
import { loadLocalImage } from '../utils/imageDB'
import { saveRecords } from '../utils/storage'
import type { AppRecord } from '../types'

vi.mock('../utils/cloud', () => ({
  loadCloudData: vi.fn(), saveCloudRecord: vi.fn(), saveCloudSettings: vi.fn(), uploadCloudPhoto: vi.fn(), loadCloudPhoto: vi.fn(),
}))
vi.mock('../utils/imageDB', () => ({ loadLocalImage: vi.fn() }))

const food: AppRecord = { id: 'food', type: 'food', date: '2026-10-13', time: '10:00', category: 'breakfast', items: [{ name: '鸡蛋', calories: null, note: null }], photoId: 'photo', createdAt: '2026-10-13T02:00:00Z' }
const old: AppRecord = { id: 'deleted', type: 'reflection', date: '2026-10-13', time: '10:00', content: '旧设备记录', createdAt: '2026-10-13T02:00:00Z' }

beforeEach(() => { localStorage.clear(); vi.resetAllMocks() })

describe('local migration', () => {
  it('uploads photos before records, skips tombstones, and retains the original backup', async () => {
    saveRecords([food, old])
    vi.mocked(loadCloudData).mockResolvedValueOnce({ records: [], knownRecordIds: ['deleted'], settings: {} })
      .mockResolvedValueOnce({ records: [food], knownRecordIds: ['deleted', 'food'], settings: {} })
    vi.mocked(loadLocalImage).mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' }))
    await importLocalData(() => {})
    expect(saveCloudRecord).toHaveBeenCalledTimes(1)
    expect(saveCloudRecord).toHaveBeenCalledWith(food, true)
    expect(vi.mocked(uploadCloudPhoto).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(saveCloudRecord).mock.invocationCallOrder[0])
    expect(JSON.parse(localStorage.getItem('fitlog_data')!).records).toHaveLength(2)
    expect(localStorage.getItem('fitlog_cloud_import_done')).not.toBeNull()
  })

  it('a missing local photo aborts migration without removing local data or marking success', async () => {
    saveRecords([food])
    vi.mocked(loadCloudData).mockResolvedValue({ records: [], knownRecordIds: [], settings: {} })
    vi.mocked(loadLocalImage).mockResolvedValue(null)
    await expect(importLocalData(() => {})).rejects.toThrow('找不到')
    expect(saveCloudRecord).not.toHaveBeenCalled()
    expect(saveCloudSettings).not.toHaveBeenCalled()
    expect(localStorage.getItem('fitlog_cloud_import_done')).toBeNull()
    expect(JSON.parse(localStorage.getItem('fitlog_data')!).records).toHaveLength(1)
  })
})
