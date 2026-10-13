import { useState } from 'react'
import useStore from '../store/useStore'
import { cloudRequest } from '../utils/cloud'
import { importLocalData, localImportAvailable } from '../utils/cloudMigration'

export default function CloudSettings() {
  const lastSynced = useStore((s) => s.lastSynced)
  const saving = useStore((s) => s.saving)
  const showToast = useStore((s) => s.showToast)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [canImport, setCanImport] = useState(localImportAvailable)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action() }
    catch (err) { setError(err instanceof Error ? err.message : '操作失败，请重试') }
    finally { setBusy(false); setProgress('') }
  }

  return <section className="glass p-5 mb-4 space-y-3">
    <h2 className="text-base font-semibold text-theme-secondary">云端数据</h2>
    <p className="text-sm text-theme-tertiary">{lastSynced ? `最近同步 ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '连接中'}</p>
    <button className="btn-secondary w-full" disabled={busy || saving} onClick={() => void run(async () => {
      await useStore.getState().refreshCloud(); showToast('已同步')
    })}>同步最新数据</button>
    {canImport && <>
      <p className="text-sm text-theme-secondary">这台设备有旧记录，可连同照片迁入云端。本机原始数据会保留。</p>
      <button className="btn-primary w-full" disabled={busy || saving} onClick={() => void run(async () => {
        useStore.setState({ saving: true })
        try {
        const result = await importLocalData((done, total) => setProgress(`迁入中 ${done}/${total}`))
        useStore.getState().activateCloud(result); setCanImport(false); showToast('旧记录已迁入云端')
        } finally { useStore.setState({ saving: false }) }
      })}>{progress || '迁入本机旧记录'}</button>
    </>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    <button className="text-sm text-theme-tertiary" disabled={busy || saving} onClick={() => void run(async () => {
      await cloudRequest('session', { method: 'DELETE' }); window.location.reload()
    })}>退出此设备</button>
  </section>
}
