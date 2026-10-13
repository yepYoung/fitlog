import { v4 as uuidv4 } from 'uuid'
import { loadRecords, loadSettings } from './storage'
import { loadLocalImage } from './imageDB'
import { loadCloudData, saveCloudRecord, saveCloudSettings, uploadCloudPhoto, loadCloudPhoto } from './cloud'
import type { AppRecord, Settings } from '../types'
import { STRENGTH_GROUPS } from './constants'

const MARKER = 'fitlog_cloud_import_done'
export const localImportAvailable = () => !localStorage.getItem(MARKER) && loadRecords().length > 0

export async function importLocalData(onProgress: (done: number, total: number) => void) {
  const source = loadRecords()
  const cloud = await loadCloudData()
  const known = new Set(cloud.knownRecordIds)
  let count = 0
  for (const original of source) {
    if (!known.has(original.id)) {
      let record = { ...original }
      if (record.type === 'food' && record.photoId) {
        const photo = record.photoId.startsWith('data:')
          ? await (await fetch(record.photoId)).blob() : await loadLocalImage(record.photoId)
        if (!photo) throw new Error(`找不到 ${record.date} 的餐食照片，原记录仍保留在本机`)
        const id = record.photoId.startsWith('data:') ? uuidv4() : record.photoId
        await uploadCloudPhoto(id, photo)
        record = { ...record, photoId: id }
      }
      await saveCloudRecord(record, true)
    }
    onProgress(++count, source.length)
  }
  const settings = loadSettings()
  if (settings && Array.isArray(settings.commonStrength) && typeof settings.commonStrength[0] === 'string') {
    settings.commonStrength = STRENGTH_GROUPS.map((group) => ({ group: group.group, items: [...group.items] }))
  }
  if (settings) await saveCloudSettings(settings, true)
  const result = await loadCloudData()
  const imported = new Set(result.knownRecordIds)
  if (source.some((record) => !imported.has(record.id))) throw new Error('部分记录尚未确认导入，请重试')
  // Preserve fitlog_data and IndexedDB as the original local backup.
  localStorage.setItem(MARKER, new Date().toISOString())
  return result
}

function asDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('照片导出失败'))
    reader.readAsDataURL(blob)
  })
}

export async function exportCloudData(records: AppRecord[], settings: Settings) {
  const photos: Record<string, string> = {}
  for (const record of records) {
    if (record.type !== 'food' || !record.photoId || photos[record.photoId]) continue
    const photo = await loadCloudPhoto(record.photoId)
    if (!photo) throw new Error(`照片 ${record.date} 未能读取，导出未完成`)
    photos[record.photoId] = await asDataUrl(photo)
  }
  return { version: 2, exportedAt: new Date().toISOString(), records, settings, photos }
}
