interface PageBackgroundProps {
  src: string
  /** top-to-bottom scrim opacity. Defaults tuned for mixed-brightness images. */
  scrimFrom?: number
  scrimTo?: number
}

export default function PageBackground({ src, scrimFrom = 0.25, scrimTo = 0.55 }: PageBackgroundProps) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: -5,
        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,${scrimFrom}) 0%, rgba(0,0,0,${scrimTo}) 100%), url('${src}')`,
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
      }}
    />
  )
}
