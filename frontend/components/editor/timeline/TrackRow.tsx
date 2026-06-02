'use client'
import { Track } from '@/store/types'
import { useEditorStore } from '@/store/editorStore'
import ClipBlock from './Clip'
import TrackHeader from './TrackHeader'

const TRACK_HEIGHT: Record<string, number> = {
  video: 60,
  audio: 52,
  subtitle: 44,
}

interface Props {
  track: Track
  duration: number
  isHovered: boolean
  onHover: (id: string) => void
}

export default function TrackRow({ track, duration, isHovered, onHover }: Props) {
  const { zoom, selectClip, moveClip } = useEditorStore()
  const height = TRACK_HEIGHT[track.type] ?? 52
  const totalWidth = duration * zoom

  const onClipAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement) === e.currentTarget) {
      selectClip(null)
    }
  }

  return (
    <div className="flex shrink-0 border-b border-gray-700/60" style={{ height }}>
      {/* Fixed header */}
      <TrackHeader track={track} height={height} />

      {/* Clip area */}
      <div
        className={`relative flex-1 overflow-hidden ${isHovered ? 'bg-indigo-900/10' : ''}`}
        style={{ minWidth: totalWidth }}
        onClick={onClipAreaClick}
        onMouseEnter={() => onHover(track.id)}
      >
        {/* Grid lines every 5s */}
        {Array.from({ length: Math.ceil(duration / 5) + 1 }, (_, i) => i * 5).map(t => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-gray-700/30"
            style={{ left: t * zoom }}
          />
        ))}

        {track.clips.map(clip => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            zoom={zoom}
            trackId={track.id}
            duration={duration}
          />
        ))}
      </div>
    </div>
  )
}
