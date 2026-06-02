'use client'
import { useEditorStore } from '@/store/editorStore'
import { TrackType } from '@/store/types'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  onAddTrack: (type: TrackType) => void
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 1000)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

export default function TimelineControls({ videoRef, onAddTrack }: Props) {
  const { isPlaying, setIsPlaying, currentTime, zoom, setZoom } = useEditorStore()

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const stop = () => {
    if (!videoRef.current) return
    videoRef.current.pause()
    videoRef.current.currentTime = 0
    setIsPlaying(false)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border-b border-gray-700 select-none shrink-0">
      {/* Add track */}
      <div className="relative group">
        <button className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded flex items-center gap-1">
          <span>+ Track</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl z-50 hidden group-hover:block min-w-[120px]">
          {(['video', 'audio', 'subtitle'] as TrackType[]).map(t => (
            <button
              key={t}
              onClick={() => onAddTrack(t)}
              className="block w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 capitalize"
            >
              {t === 'subtitle' ? 'Subtitle' : t === 'audio' ? 'Audio' : 'Video'} Track
            </button>
          ))}
        </div>
      </div>

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Transport */}
      <button onClick={stop} className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="5" y="5" width="14" height="14" />
        </svg>
      </button>
      <button onClick={togglePlay} className="p-1 hover:bg-gray-700 rounded text-gray-300 hover:text-white">
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <span className="text-xs font-mono text-indigo-400 ml-1">{formatTime(currentTime)}</span>

      <div className="w-px h-5 bg-gray-700 mx-1" />

      {/* Zoom */}
      <span className="text-xs text-gray-500">Zoom</span>
      <input
        type="range"
        min={20}
        max={400}
        step={10}
        value={zoom}
        onChange={e => setZoom(Number(e.target.value))}
        className="w-20 accent-indigo-500"
      />
      <span className="text-xs text-gray-500 w-10">{zoom}px/s</span>
    </div>
  )
}
