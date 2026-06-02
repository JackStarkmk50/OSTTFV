'use client'
import { useEditorStore } from '@/store/editorStore'

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 100)
  return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export default function SubtitlePanel({ videoRef }: Props) {
  const { project, currentTime, selectedSegmentId, selectSegment, setCurrentTime } = useEditorStore()

  if (!project) return (
    <div className="flex items-center justify-center h-full text-gray-600 text-sm">
      No subtitles
    </div>
  )

  const { segments } = project

  const seekTo = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2 border-b border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-gray-900 z-10">
        Subtitles ({segments.length})
      </div>
      {segments.map(seg => {
        const isActive = currentTime >= seg.start && currentTime <= seg.end
        const isSelected = selectedSegmentId === seg.id
        return (
          <div
            key={seg.id}
            onClick={() => { seekTo(seg.start); selectSegment(seg.id) }}
            className={`px-3 py-2 border-b border-gray-800 cursor-pointer transition-colors ${
              isSelected
                ? 'bg-indigo-900/40 border-l-2 border-l-indigo-500'
                : isActive
                ? 'bg-gray-800/60 border-l-2 border-l-amber-500'
                : 'hover:bg-gray-800/30'
            }`}
          >
            <div className="text-[10px] text-gray-500 font-mono mb-0.5">
              {formatTime(seg.start)} → {formatTime(seg.end)}
            </div>
            {seg.text && (
              <div className="text-xs text-gray-300 leading-tight mb-0.5 font-medium">
                {seg.text}
              </div>
            )}
            {seg.transliterated && seg.transliterated !== seg.text && (
              <div className="text-xs text-amber-300/80 leading-tight">
                {seg.transliterated}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
