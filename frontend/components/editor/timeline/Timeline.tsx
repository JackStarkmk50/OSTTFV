'use client'
import { useRef, useState, useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { TrackType } from '@/store/types'
import TimelineControls from './TimelineControls'
import TimeRuler from './TimeRuler'
import TrackRow from './TrackRow'
import Playhead from './Playhead'

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export default function Timeline({ videoRef }: Props) {
  const { project, addTrack, zoom, currentTime } = useEditorStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [hoveredTrackId, setHoveredTrackId] = useState<string>('')

  if (!project) return null

  const { duration, tracks } = project
  const totalWidth = duration * zoom

  const trackHeights: Record<string, number> = { video: 60, audio: 52, subtitle: 44 }
  const totalTrackHeight = tracks.reduce((sum, t) => sum + (trackHeights[t.type] ?? 52), 0)

  // Auto-scroll playhead into view
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const playheadX = currentTime * zoom + 140
    const { scrollLeft, clientWidth } = el
    if (playheadX > scrollLeft + clientWidth - 60) {
      el.scrollLeft = playheadX - clientWidth / 2
    }
  }, [currentTime, zoom])

  const onScroll = () => {
    setScrollLeft(scrollRef.current?.scrollLeft ?? 0)
  }

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + scrollLeft
    const time = Math.max(0, Math.min(duration, x / zoom))
    useEditorStore.getState().setCurrentTime(time)
    if (videoRef.current) videoRef.current.currentTime = time
  }

  return (
    <div className="flex flex-col bg-gray-900 border-t-2 border-gray-700 select-none" style={{ height: 300 }}>
      <TimelineControls videoRef={videoRef} onAddTrack={addTrack} />

      {/* Scrollable timeline body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto timeline-scroll-area relative"
        onScroll={onScroll}
      >
        <div style={{ width: totalWidth + 140, minWidth: '100%', position: 'relative' }}>
          {/* Sticky track headers column + ruler row */}
          <div className="flex sticky top-0 z-30 bg-gray-900">
            {/* Corner */}
            <div className="shrink-0 bg-gray-900 border-b border-r border-gray-700" style={{ width: 140, height: 28 }} />
            {/* Ruler */}
            <div className="flex-1 overflow-hidden cursor-pointer" onClick={handleRulerClick}>
              <TimeRuler duration={duration} scrollLeft={scrollLeft} />
            </div>
          </div>

          {/* Track rows with relative positioning for playhead */}
          <div className="relative">
            <Playhead duration={duration} totalHeight={totalTrackHeight} />
            {tracks.map(track => (
              <TrackRow
                key={track.id}
                track={track}
                duration={duration}
                isHovered={hoveredTrackId === track.id}
                onHover={setHoveredTrackId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
