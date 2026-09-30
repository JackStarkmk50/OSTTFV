'use client'
import { Track } from '@/store/types'
import { useEditorStore } from '@/store/editorStore'
import ClipBlock from './Clip'

const TRACK_HEIGHT: Record<string, number> = {
  video: 64,
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
  const { zoom, selectClip } = useEditorStore()
  const height = TRACK_HEIGHT[track.type] ?? 52
  const totalWidth = duration * zoom

  const onClipAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement) === e.currentTarget) {
      selectClip(null)
    }
  }

  return (
    <div
      className={`relative border-b border-gray-700/50 transition-colors ${
        isHovered ? 'bg-indigo-900/10' : ''
      }`}
      style={{ height, minWidth: totalWidth }}
      onClick={onClipAreaClick}
      onMouseEnter={() => onHover(track.id)}
      onMouseLeave={() => onHover('')}
    >
      {/* Subtle grid lines every 5s */}
      {Array.from({ length: Math.ceil(duration / 5) + 1 }, (_, i) => i * 5).map(t => (
        <div
          key={t}
          className="absolute top-0 bottom-0 w-px bg-gray-700/25 pointer-events-none"
          style={{ left: t * zoom }}
        />
      ))}

      {/* 1s fine grid lines */}
      {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => i).map(t => (
        t % 5 !== 0 && (
          <div
            key={`f-${t}`}
            className="absolute top-0 bottom-0 w-px bg-gray-800/40 pointer-events-none"
            style={{ left: t * zoom }}
          />
        )
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
  )
}
