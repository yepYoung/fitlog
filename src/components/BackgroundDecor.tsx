const blobs = [
  {
    // Purple — top left
    color: 'rgba(139, 92, 246, 0.10)',
    size: 350,
    top: '5%',
    left: '-10%',
    animation: 'blobDrift1 35s ease-in-out infinite',
  },
  {
    // Blue — center right
    color: 'rgba(59, 130, 246, 0.08)',
    size: 300,
    top: '35%',
    left: '60%',
    animation: 'blobDrift2 40s ease-in-out infinite',
  },
  {
    // Teal — bottom left
    color: 'rgba(16, 185, 129, 0.07)',
    size: 280,
    top: '65%',
    left: '5%',
    animation: 'blobDrift3 38s ease-in-out infinite',
  },
  {
    // Pink — top right
    color: 'rgba(236, 72, 153, 0.06)',
    size: 240,
    top: '10%',
    left: '70%',
    animation: 'blobDrift4 42s ease-in-out infinite',
  },
]

export default function BackgroundDecor() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden>
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full will-change-transform"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            animation: b.animation,
          }}
        />
      ))}
    </div>
  )
}
