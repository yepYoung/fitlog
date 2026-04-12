import useStore from '../store/useStore'

export default function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 toast-enter">
      <div className="glass px-5 py-2.5 rounded-full text-sm shadow-lg">{toast}</div>
    </div>
  )
}
