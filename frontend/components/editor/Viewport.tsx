'use client'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { TextStyle } from '@/store/types'

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
    textShadow: style.shadow ? '2px 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)' : 'none',
    WebkitTextStroke: style.outline ? `2px ${style.outlineColor}` : 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    maxWidth: '90%',
    lineHeight: 1.2,
  }
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
}

export default function Viewport({ videoRef }: Props) {
  const { project, currentTime, selectedSegmentId, selectSegment } = useEditorStore()

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-gray-600 text-sm">
        No video loaded
      </div>
    )
  }

  // Track-aware: video hidden if video track deleted, audio muted if audio track deleted
  const hasVideoTrack = project.tracks.some(t => t.type === 'video' && t.clips.length > 0)
  const audioTrack = project.tracks.find(t => t.type === 'audio')
  const audioMuted = !audioTrack || audioTrack.muted

  // Sync audio mute state to video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = audioMuted
  }, [audioMuted, videoRef])

  const activeSegments = project.segments.filter(
    seg => currentTime >= seg.start && currentTime <= seg.end
  )

  return (
    <div className="flex flex-col h-full bg-black">
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        onClick={() => selectSegment(null)}
      >
        {/* Video element — always mounted, hidden via CSS when no video track */}
        <video
          ref={videoRef}
          src={project.videoUrl}
          className="max-w-full max-h-full object-contain"
          style={{ display: hasVideoTrack ? 'block' : 'none' }}
        />

        {/* No video track placeholder */}
        {!hasVideoTrack && (
          <div className="flex flex-col items-center gap-2 text-gray-700">
            <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              <line x1="3" y1="3" x2="21" y2="21" strokeWidth={1.5} />
            </svg>
            <span className="text-xs">Video track removed</span>
          </div>
        )}

        {/* Subtitle overlays — only romanized text, no native script */}
        {hasVideoTrack && (
          <div className="absolute inset-0 pointer-events-none">
            {activeSegments.map(seg => {
              // Always show romanized. If romanized empty (e.g. English source), show original.
              const displayText = seg.transliterated.trim() || seg.text
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
                  onClick={e => { e.stopPropagation(); selectSegment(seg.id) }}
                >
                  {displayText}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom bar — romanized only */}
      {activeSegments.length > 0 && hasVideoTrack && (
        <div className="px-3 py-1 bg-gray-900/90 border-t border-gray-800 text-xs text-amber-300/80 flex gap-4 truncate">
          {activeSegments.map(seg => (
            <span key={seg.id}>{seg.transliterated.trim() || seg.text}</span>
          ))}
        </div>
      )}
    </div>
  )
}
