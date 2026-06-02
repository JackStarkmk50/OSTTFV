'use client'
import { useVideoPlayer } from '@/hooks/useVideoPlayer'
import { useHotkeys } from '@/hooks/useHotkeys'
import SubtitlePanel from './SubtitlePanel'
import Viewport from './Viewport'
import StylePanel from './StylePanel'
import Toolbar from './Toolbar'
import Timeline from './timeline/Timeline'

export default function EditorLayout() {
  const { videoRef } = useVideoPlayer()
  useHotkeys(videoRef)

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Toolbar />

      {/* Three-panel middle */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Subtitle list */}
        <div className="w-[280px] shrink-0 border-r border-gray-700 bg-gray-900 overflow-hidden flex flex-col">
          <SubtitlePanel videoRef={videoRef} />
        </div>

        {/* Center: Viewport */}
        <div className="flex-1 min-w-0 bg-black overflow-hidden">
          <Viewport videoRef={videoRef} />
        </div>

        {/* Right: Style panel */}
        <div className="w-[260px] shrink-0 border-l border-gray-700 bg-gray-900 overflow-hidden flex flex-col">
          <StylePanel />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <Timeline videoRef={videoRef} />
    </div>
  )
}
