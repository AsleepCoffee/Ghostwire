import { useEffect, useRef } from 'react'

/**
 * A subtle animated "particle network" rendered on a full-viewport canvas behind
 * the UI (drifting dots with lines between nearby ones), tinted with the live
 * theme accent. Pauses when the window is hidden and honours prefers-reduced-motion.
 */
export function ParticleBackground(): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let raf = 0
    let parts: { x: number; y: number; vx: number; vy: number }[] = []
    const LINK = 140 // px distance to draw a connecting line

    const accent = (): string =>
      (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '34 211 238').replace(/\s+/g, ',')

    const resize = (): void => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const target = Math.max(24, Math.min(100, Math.round((w * h) / 20000)))
      parts = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
      }))
    }

    const draw = (): void => {
      const c = accent()
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
      ctx.lineWidth = 1
      for (let i = 0; i < parts.length; i++) {
        const a = parts[i]
        for (let j = i + 1; j < parts.length; j++) {
          const b = parts[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d2 = dx * dx + dy * dy
          if (d2 < LINK * LINK) {
            const o = (1 - Math.sqrt(d2) / LINK) * 0.18
            ctx.strokeStyle = `rgba(${c},${o})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      ctx.fillStyle = `rgba(${c},0.55)`
      for (const p of parts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    const onVisibility = (): void => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(draw)
    }

    resize()
    raf = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} className="app-particles" aria-hidden="true" />
}
