'use client'
import { useEditorStore } from '@/store/editorStore'

interface Props {
  duration: number
  scrollLeft: number
}

function formatRulerTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
}

export default function TimeRuler({ duration, scrollLeft }: Props) {
  const { zoom, setCurrentTime } = useEditorStore()

  const totalWidth = duration * zoom

  // Major tick interval (labeled)
  const majorStep = zoom >= 200 ? 0.5 : zoom >= 80 ? 1 : zoom >= 40 ? 2 : zoom >= 20 ? 5 : 10
  // Minor tick interval (unlabeled)
  const minorStep = majorStep / 5

  const majorTicks: number[] = []
  for (let t = 0; t <= duration + majorStep; t = Math.round((t + majorStep) * 1000) / 1000) {
    if (t > duration) break
    majorTicks.push(t)
  }

  const minorTicks: number[] = []
  for (let t = 0; t <= duration; t = Math.round((t + minorStep) * 1000) / 1000) {
    const isMajor = Math.abs(t % majorStep) < 0.0001 || Math.abs(t % majorStep - majorStep) < 0.0001
    if (!isMajor) minorTicks.push(t)
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const time = Math.max(0, Math.min(duration, x / zoom))
    setCurrentTime(time)
  }

  return (
    <div
      className="relative bg-gray-950 border-b border-gray-700 cursor-pointer select-none"
      style={{ width: totalWidth, minWidth: '100%', height: 28 }}
      onClick={handleClick}
    >
      {/* Minor ticks */}
      {minorTicks.map(t => (
        <div
          key={`m-${t}`}
          className="absolute bottom-0 w-px bg-gray-700/60"
          style={{ left: t * zoom, height: 6 }}
        />
      ))}

      {/* Major ticks + labels */}
      {majorTicks.map(t => (
        <div
          key={`M-${t}`}
          className="absolute bottom-0 flex flex-col items-center"
          style={{ left: t * zoom }}
        >
          <span
            className="text-[9px] text-gray-500 whitespace-nowrap absolute"
            style={{ bottom: 10, transform: 'translateX(-50%)' }}
          >
            {formatRulerTime(t)}
          </span>
          <div className="w-px bg-gray-600" style={{ height: 10 }} />
        </div>
      ))}

      {/* Hover highlight area */}
      <div className="absolute inset-0 hover:bg-white/[0.02] transition-colors" />
    </div>
  )
}
