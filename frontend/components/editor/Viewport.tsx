'use client'
import { useRef, useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { Segment, TextStyle } from '@/store/types'

function getTextStyle(style: TextStyle): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${style.position.x}%`,
    top: `${style.position.y}%`,
    transform: 'translate(-50%, -50%)',
    fontFamily: style.font,
    fontSize: style.fontSize,
    color: style.color,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.align,
    textShadow: style.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
    WebkitTextStroke: style.outline ? `2px ${style.outlineColor}` : 'none',
    userSelect: 'none',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    maxWidth: '90%',
    lineHeight: 1.2,
  }
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export default function Viewport({ videoRef }: Props) {
  const { project, currentTime, selectedSegmentId, selectSegment, setCurrentTime } = useEditorStore()
  const containerRef = useRef<HTMLDivElement>(null)

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-gray-600 text-sm">
        No video loaded
      </div>
    )
  }

  // Find segments active at currentTime
  const activeSegments = project.segments.filter(
    seg => currentTime >= seg.start && currentTime <= seg.end
  )

  const handleVideoClick = (e: React.MouseEvent) => {
    // Click on video area (not overlay) → deselect
    selectSegment(null)
  }

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Video container */}
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        onClick={handleVideoClick}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            src={project.videoUrl}
            className="max-w-full max-h-full object-contain"
            onTimeUpdate={handleVideoTimeUpdate}
            style={{ display: 'block' }}
          />

          {/* Text overlays */}
          <div className="absolute inset-0 pointer-events-none">
            {activeSegments.map(seg => {
              const displayText = seg.transliterated || seg.text
              const isSelected = selectedSegmentId === seg.id
              return (
                <div
                  key={seg.id}
                  style={{
                    ...getTextStyle(seg.style),
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                    outline: isSelected ? '2px dashed rgba(99,102,241,0.8)' : 'none',
                    outlineOffset: 4,
                  }}
                  onClick={(e) => { e.stopPropagation(); selectSegment(seg.id) }}
                >
                  {displayText}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      {activeSegments.length > 0 && (
        <div className="px-3 py-1.5 bg-gray-900/90 border-t border-gray-800 text-xs text-gray-400 flex gap-4">
          {activeSegments.map(seg => (
            <span key={seg.id}>
              <span className="text-amber-400">{seg.text}</span>
              {seg.transliterated && seg.transliterated !== seg.text && (
                <span className="ml-2 text-gray-500">({seg.transliterated})</span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
