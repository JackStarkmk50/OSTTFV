'use client'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { TextStyle, Segment } from '@/store/types'

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
  const { project, currentTime, selectedSegmentId, selectSegment, updateSegmentStyle } = useEditorStore()
  const containerRef = useRef<HTMLDivElement>(null)

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-gray-600 text-sm">
        No video loaded
      </div>
    )
  }

  const hasVideoTrack = project.tracks.some(t => t.type === 'video' && t.clips.length > 0)
  const audioTrack = project.tracks.find(t => t.type === 'audio')
  const audioMuted = !audioTrack || audioTrack.muted

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = audioMuted
  }, [audioMuted, videoRef])

  // Collect active subtitle segment IDs
  const activeClipSegIds = new Set<number>()
  for (const track of project.tracks) {
    if (track.type !== 'subtitle') continue
    for (const clip of track.clips) {
      if (clip.segmentId !== undefined && currentTime >= clip.start && currentTime <= clip.end) {
        activeClipSegIds.add(clip.segmentId)
      }
    }
  }
  const activeSegments = project.segments.filter(seg => activeClipSegIds.has(seg.id))

  // Drag subtitle text position within viewport
  const startSubtitleDrag = (e: React.MouseEvent, seg: Segment) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    selectSegment(seg.id)

    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startPosX = seg.style.position.x
    const startPosY = seg.style.position.y

    const onMove = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / containerRect.width) * 100
      const dy = ((ev.clientY - startY) / containerRect.height) * 100
      updateSegmentStyle(seg.id, {
        position: {
          x: Math.max(5, Math.min(95, startPosX + dx)),
          y: Math.max(5, Math.min(95, startPosY + dy)),
        }
      })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div
        ref={containerRef}
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        onClick={() => selectSegment(null)}
      >
        <video
          ref={videoRef}
          src={project.videoUrl}
          className="max-w-full max-h-full object-contain"
          style={{ display: hasVideoTrack ? 'block' : 'none' }}
        />

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

        {/* Subtitle overlays — draggable */}
        {hasVideoTrack && (
          <div className="absolute inset-0">
            {activeSegments.map(seg => {
              const displayText = seg.transliterated?.trim() || seg.text
              const isSelected = selectedSegmentId === seg.id
              return (
                <div
                  key={seg.id}
                  style={{
                    ...getTextStyle(seg.style),
                    cursor: isSelected ? 'move' : 'pointer',
                    outline: isSelected ? '2px dashed rgba(99,102,241,0.9)' : 'none',
                    outlineOffset: 6,
                  }}
                  onMouseDown={isSelected
                    ? (e) => startSubtitleDrag(e, seg)
                    : (e) => { e.stopPropagation(); selectSegment(seg.id) }
                  }
                  title={isSelected ? 'Drag to reposition' : 'Click to select · drag to move'}
                >
                  {displayText}
                </div>
              )
            })}
          </div>
        )}

        {/* Hint when subtitle selected */}
        {selectedSegmentId !== null && activeSegments.some(s => s.id === selectedSegmentId) && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-gray-400 text-[10px] px-2 py-1 rounded pointer-events-none">
            Drag subtitle to reposition · use Style panel for fonts/colors
          </div>
        )}
      </div>

      {/* Bottom subtitle bar */}
      {activeSegments.length > 0 && hasVideoTrack && (
        <div className="px-3 py-1.5 bg-gray-900/90 border-t border-gray-800 text-xs text-amber-300/80 flex gap-4 truncate shrink-0">
          {activeSegments.map(seg => (
            <span key={seg.id}>{seg.transliterated?.trim() || seg.text}</span>
          ))}
        </div>
      )}
    </div>
  )
}
