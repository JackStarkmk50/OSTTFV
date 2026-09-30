'use client'
import { useRef, useState, useCallback } from 'react'
import { useVideoPlayer } from '@/hooks/useVideoPlayer'
import { useHotkeys } from '@/hooks/useHotkeys'
import SubtitlePanel from './SubtitlePanel'
import Viewport from './Viewport'
import StylePanel from './StylePanel'
import Toolbar from './Toolbar'
import Timeline from './timeline/Timeline'

const MIN_PANEL = 180
const MAX_PANEL = 480
const DEFAULT_LEFT = 260
const DEFAULT_RIGHT = 260

export default function EditorLayout() {
  const { videoRef } = useVideoPlayer()
  useHotkeys(videoRef)

  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT)
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT)

  const leftResizeRef = useRef<{ startX: number; startW: number } | null>(null)
  const rightResizeRef = useRef<{ startX: number; startW: number } | null>(null)

  const onLeftDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    leftResizeRef.current = { startX: e.clientX, startW: leftWidth }
    const onMove = (ev: MouseEvent) => {
      if (!leftResizeRef.current) return
      const dx = ev.clientX - leftResizeRef.current.startX
      setLeftWidth(Math.max(MIN_PANEL, Math.min(MAX_PANEL, leftResizeRef.current.startW + dx)))
    }
    const onUp = () => {
      leftResizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [leftWidth])

  const onRightDividerDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    rightResizeRef.current = { startX: e.clientX, startW: rightWidth }
    const onMove = (ev: MouseEvent) => {
      if (!rightResizeRef.current) return
      const dx = rightResizeRef.current.startX - ev.clientX
      setRightWidth(Math.max(MIN_PANEL, Math.min(MAX_PANEL, rightResizeRef.current.startW + dx)))
    }
    const onUp = () => {
      rightResizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [rightWidth])

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Toolbar />

      {/* Three-panel middle */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left: Subtitle list */}
        <div
          className="shrink-0 border-r border-gray-700 bg-gray-900 overflow-hidden flex flex-col"
          style={{ width: leftWidth }}
        >
          <SubtitlePanel videoRef={videoRef} />
        </div>

        {/* Left resize divider */}
        <div
          className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors bg-transparent group flex items-center justify-center"
          onMouseDown={onLeftDividerDown}
        >
          <div className="w-px h-8 bg-gray-600 group-hover:bg-indigo-400 rounded-full" />
        </div>

        {/* Center: Viewport */}
        <div className="flex-1 min-w-0 bg-black overflow-hidden">
          <Viewport videoRef={videoRef} />
        </div>

        {/* Right resize divider */}
        <div
          className="w-1 shrink-0 cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 transition-colors bg-transparent group flex items-center justify-center"
          onMouseDown={onRightDividerDown}
        >
          <div className="w-px h-8 bg-gray-600 group-hover:bg-indigo-400 rounded-full" />
        </div>

        {/* Right: Style panel */}
        <div
          className="shrink-0 border-l border-gray-700 bg-gray-900 overflow-hidden flex flex-col"
          style={{ width: rightWidth }}
        >
          <StylePanel />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <Timeline videoRef={videoRef} />
    </div>
  )
}
