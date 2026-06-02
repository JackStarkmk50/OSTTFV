'use client'
import { useEditorStore } from '@/store/editorStore'
import { useRef } from 'react'

interface Props {
  duration: number
  scrollLeft: number
}

function formatRulerTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function TimeRuler({ duration, scrollLeft }: Props) {
  const { zoom, setCurrentTime } = useEditorStore()

  const totalWidth = duration * zoom
  const step = zoom >= 100 ? 1 : zoom >= 50 ? 2 : zoom >= 20 ? 5 : 10
  const ticks: number[] = []
  for (let t = 0; t <= duration; t += step) ticks.push(t)

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const time = Math.max(0, Math.min(duration, x / zoom))
    setCurrentTime(time)
  }

  return (
    <div
      className="relative h-7 bg-gray-900 border-b border-gray-700 cursor-pointer select-none shrink-0"
      style={{ width: totalWidth, minWidth: '100%' }}
      onClick={handleClick}
    >
      {ticks.map(t => (
        <div
          key={t}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: t * zoom }}
        >
          <div className="w-px h-3 bg-gray-600" />
          <span className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap" style={{ transform: 'translateX(-50%)' }}>
            {formatRulerTime(t)}
          </span>
        </div>
      ))}
    </div>
  )
}
