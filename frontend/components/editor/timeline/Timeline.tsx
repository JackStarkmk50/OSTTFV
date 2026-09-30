'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { TrackType } from '@/store/types'
import TimelineControls from './TimelineControls'
import TimeRuler from './TimeRuler'
import TrackRow from './TrackRow'
import TrackHeader from './TrackHeader'
import Playhead from './Playhead'

const MIN_HEIGHT = 180
const MAX_HEIGHT = 600
const DEFAULT_HEIGHT = 320
const HEADER_WIDTH = 160
const RULER_HEIGHT = 30

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

const TRACK_HEIGHTS: Record<string, number> = { video: 64, audio: 52, subtitle: 44 }

export default function Timeline({ videoRef }: Props) {
  const { project, addTrack, zoom, currentTime } = useEditorStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const headersRef = useRef<HTMLDivElement>(null)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [hoveredTrackId, setHoveredTrackId] = useState<string>('')
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const duration = project?.duration ?? 0
  const tracks = project?.tracks ?? []
  const totalWidth = duration * zoom
  const totalTrackHeight = tracks.reduce((sum, t) => sum + (TRACK_HEIGHTS[t.type] ?? 52), 0)

  // Auto-scroll playhead into view
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !project) return
    const playheadX = currentTime * zoom
    const { scrollLeft: sl, clientWidth } = el
    if (playheadX > sl + clientWidth - 80) {
      el.scrollLeft = playheadX - clientWidth / 2
    }
  }, [currentTime, zoom, project])

  // Drag to resize timeline height
  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizeRef.current = { startY: e.clientY, startHeight: height }
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const dy = resizeRef.current.startY - ev.clientY
      const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeRef.current.startHeight + dy))
      setHeight(newH)
    }
    const onUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [height])

  if (!project) return null

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setScrollLeft(el.scrollLeft)
    const newTop = el.scrollTop
    if (newTop !== scrollTop && headersRef.current) {
      setScrollTop(newTop)
      headersRef.current.scrollTop = newTop
    }
  }

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0)
    const time = Math.max(0, Math.min(duration, x / zoom))
    useEditorStore.getState().setCurrentTime(time)
    if (videoRef.current) videoRef.current.currentTime = time
  }

  return (
    <div
      className="flex flex-col bg-gray-900 border-t border-gray-700 select-none relative"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize z-50 group"
        onMouseDown={onResizeMouseDown}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gray-600 group-hover:bg-indigo-500 group-active:bg-indigo-400 transition-colors" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5">
          {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-indigo-400" />)}
        </div>
      </div>

      <TimelineControls videoRef={videoRef} onAddTrack={addTrack} />

      {/* Main area: fixed headers left + scrollable clips right */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Fixed left: track headers ── */}
        <div
          className="shrink-0 flex flex-col bg-gray-900 border-r border-gray-700/80 z-10"
          style={{ width: HEADER_WIDTH }}
        >
          {/* Corner (aligns with ruler height) */}
          <div
            className="shrink-0 border-b border-gray-700 flex items-center justify-center bg-gray-950"
            style={{ height: RULER_HEIGHT }}
          >
            <span className="text-[9px] text-gray-600 uppercase tracking-widest font-medium">Tracks</span>
          </div>
          {/* Headers — vertically scrolls with clips via headersRef sync */}
          <div ref={headersRef} className="flex-1 overflow-hidden">
            {tracks.map(track => (
              <TrackHeader
                key={track.id}
                track={track}
                height={TRACK_HEIGHTS[track.type] ?? 52}
              />
            ))}
            {tracks.length === 0 && (
              <div className="flex items-center justify-center h-14 text-[10px] text-gray-700">
                No tracks
              </div>
            )}
          </div>
        </div>

        {/* ── Scrollable right: ruler + clip rows ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto timeline-scroll-area"
          onScroll={onScroll}
        >
          <div style={{ width: Math.max(totalWidth, 400), minWidth: '100%', position: 'relative' }}>

            {/* Sticky ruler */}
            <div
              className="sticky top-0 z-30 cursor-pointer"
              style={{ height: RULER_HEIGHT }}
              onClick={handleRulerClick}
            >
              <TimeRuler duration={duration} scrollLeft={scrollLeft} />
            </div>

            {/* Track clip rows + playhead */}
            <div className="relative" style={{ height: totalTrackHeight || 60 }}>
              <Playhead
                duration={duration}
                totalHeight={totalTrackHeight || 60}
                videoRef={videoRef}
              />
              {tracks.map(track => (
                <TrackRow
                  key={track.id}
                  track={track}
                  duration={duration}
                  isHovered={hoveredTrackId === track.id}
                  onHover={setHoveredTrackId}
                />
              ))}
              {tracks.length === 0 && (
                <div className="flex items-center justify-center h-14 text-gray-700 text-xs">
                  Add a track to get started
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
