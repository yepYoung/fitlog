import { useRef, useState } from 'react'

export default function SwipeToDelete({ onDelete, children }) {
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)

  function handleTouchStart(e) { startX.current = e.touches[0].clientX }
  function handleTouchMove(e) {
    const diff = startX.current - e.touches[0].clientX
    setOffset(diff > 0 ? Math.min(diff, 80) : 0)
  }
  function handleTouchEnd() { setOffset(offset > 50 ? 80 : 0) }
  function handleDelete() {
    if (window.confirm('确定要删除这条记录吗？')) onDelete()
    else setOffset(0)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center"
        style={{ background: 'var(--delete-bg)' }}>
        <button onClick={handleDelete} className="text-sm font-medium" style={{ color: 'var(--text-red)' }}>删除</button>
      </div>
      <div className="relative transition-transform duration-200 ease-out"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {children}
      </div>
    </div>
  )
}
