'use client'
import { useEditorStore } from '@/store/editorStore'
import { useRef } from 'react'

interface Props {
  duration: number
  totalHeight: number
}

export default function Playhead({ duration, totalHeight }: Props) {
  const { currentTime, zoom, setCurrentTime } = useEditorStore()
  const left = currentTime * zoom
  const dragging = useRef(false)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const container = (e.currentTarget as HTMLElement).closest('.timeline-scroll-area') as HTMLElement

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !container) return
      const rect = container.getBoundingClientRect()
      const x = ev.clientX - rect.left + container.scrollLeft - 140
      const time = Math.max(0, Math.min(duration, x / zoom))
      setCurrentTime(time)
    }

    const onUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      className="absolute top-0 pointer-events-none z-20"
      style={{ left: left + 140, height: totalHeight }}
    >
      {/* Head diamond */}
      <div
        className="pointer-events-auto cursor-ew-resize absolute -top-1 -translate-x-1/2"
        onMouseDown={onMouseDown}
      >
        <div className="w-3 h-3 bg-red-500 rotate-45 rounded-sm shadow-lg" />
      </div>
      {/* Line */}
      <div className="absolute top-2 left-0 -translate-x-px w-0.5 bg-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
        style={{ height: totalHeight - 8 }}
      />
    </div>
  )
}
