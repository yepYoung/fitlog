import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import useStore from '../store/useStore'
import { CloudError, cloudJson, loadCloudData } from '../utils/cloud'

export default function CloudGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const keyRef = useRef<HTMLInputElement>(null)

  async function connect(accessKey?: string) {
    setBusy(true); setError('')
    try {
      if (accessKey) await cloudJson('session', 'POST', { accessKey })
      useStore.getState().activateCloud(await loadCloudData())
      setReady(true); setLocked(false)
      if (keyRef.current) keyRef.current.value = ''
    } catch (err) {
      if (err instanceof CloudError && err.status === 401) setLocked(true)
      if (accessKey || !(err instanceof CloudError && err.status === 401)) setError(err instanceof Error ? err.message : '连接失败')
    } finally { setBusy(false) }
  }

  useEffect(() => { void connect() }, [])
  useEffect(() => {
    const lock = () => setLocked(true)
    window.addEventListener('fitlog-auth-required', lock)
    const refresh = () => {
      if (document.visibilityState === 'visible') useStore.getState().refreshCloud().catch(() => {})
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const interval = window.setInterval(refresh, 60000)
    return () => {
      window.removeEventListener('fitlog-auth-required', lock)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(interval)
    }
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    void connect(keyRef.current?.value)
  }

  return <>
    {ready && <div style={{ display: locked ? 'none' : 'contents' }}>{children}</div>}
    {(!ready || locked) && <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={submit} className="glass p-7 w-full max-w-sm space-y-5">
        <h1 className="text-2xl font-bold">我的记录</h1>
        <p className="text-sm text-theme-secondary">输入访问口令，在各台设备使用同一份云端数据。</p>
        <label className="block text-sm">访问口令
          <input ref={keyRef} type="password" autoComplete="current-password" required className="input-field w-full mt-2" disabled={busy} />
        </label>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? '连接中…' : '进入'}</button>
        {error && <button type="button" className="btn-secondary w-full" onClick={() => void connect()} disabled={busy}>重新连接</button>}
      </form>
    </main>}
  </>
}
