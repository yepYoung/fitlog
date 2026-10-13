import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import useStore from '../store/useStore'
import { setCloudActive } from '../utils/cloud'

const weight = { type: 'weight' as const, date: '2026-10-13', time: '10:00', weight: 70, note: null }

beforeEach(() => {
  localStorage.clear()
  useStore.setState({ saving: false, toast: null })
  useStore.getState().activateCloud({ records: [], knownRecordIds: [], settings: {} })
})
afterEach(() => { vi.unstubAllGlobals(); setCloudActive(false); useStore.setState({ storageMode: 'local', saving: false }) })

describe('cloud saves', () => {
  it('does not mark a failed write as saved or replace the legacy local backup', async () => {
    localStorage.setItem('fitlog_data', JSON.stringify({ records: [{ id: 'legacy' }] }))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(useStore.getState().addRecord(weight)).rejects.toThrow('连接失败')
    expect(useStore.getState().records).toEqual([])
    expect(useStore.getState().saving).toBe(false)
    expect(JSON.parse(localStorage.getItem('fitlog_data')!).records).toEqual([{ id: 'legacy' }])
  })

  it('waits for the server before adding a record', async () => {
    let finish!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { finish = resolve })))
    const save = useStore.getState().addRecord(weight)
    expect(useStore.getState().records).toHaveLength(0)
    expect(useStore.getState().saving).toBe(true)
    finish(new Response('{}', { status: 200 }))
    await save
    expect(useStore.getState().records).toHaveLength(1)
    expect(localStorage.getItem('fitlog_data')).toBeNull()
  })

  it('a slow refresh cannot erase a newly saved record', async () => {
    let finish!: (response: Response) => void
    const fetch = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    const refresh = useStore.getState().refreshCloud()
    await useStore.getState().addRecord(weight)
    finish(new Response(JSON.stringify({ records: [], knownRecordIds: [], settings: {} }), { status: 200 }))
    await refresh
    expect(useStore.getState().records).toHaveLength(1)
  })

  it('a failed delete keeps the record visible and reports the error', async () => {
    useStore.setState({ records: [{ ...weight, id: 'a', createdAt: '2026-10-13T02:00:00Z' }] })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '云端暂时不可用' }), { status: 503 })))
    await useStore.getState().deleteRecord('a')
    expect(useStore.getState().records).toHaveLength(1)
    expect(useStore.getState().toast).toBe('云端暂时不可用')
  })

  it('retry after a lost response reuses the record id', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('lost response')).mockResolvedValueOnce(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    await expect(useStore.getState().addRecord({ ...weight, weight: 81 })).rejects.toThrow()
    await useStore.getState().addRecord({ ...weight, weight: 81 })
    const first = JSON.parse(fetch.mock.calls[0][1].body)
    const retry = JSON.parse(fetch.mock.calls[1][1].body)
    expect(first.record.id).toBe(retry.record.id)
    expect(useStore.getState().records).toHaveLength(1)
  })
})
