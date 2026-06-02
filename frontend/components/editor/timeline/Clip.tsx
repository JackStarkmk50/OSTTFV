'use client'
import { useRef } from 'react'
import { Clip as ClipType } from '@/store/types'
import { useEditorStore } from '@/store/editorStore'

interface Props {
  clip: ClipType
  zoom: number
  trackId: string
  duration: number
  onTrackHover?: (trackId: string) => void
}

export default function ClipBlock({ clip, zoom, trackId, duration, onTrackHover }: Props) {
  const { selectedClipId, selectClip, moveClip, trimClipStart, trimClipEnd } = useEditorStore()
  const selected = selectedClipId === clip.id

  const dragRef = useRef<{
    type: 'move' | 'trim-left' | 'trim-right'
    startX: number
    origStart: number
    origEnd: number
    targetTrackId: string
  } | null>(null)

  const clipWidth = Math.max(4, (clip.end - clip.start) * zoom)
  const clipLeft = clip.start * zoom

  const onMouseDown = (e: React.MouseEvent, type: 'move' | 'trim-left' | 'trim-right') => {
    e.stopPropagation()
    e.preventDefault()
    selectClip(clip.id)

    dragRef.current = {
      type,
      startX: e.clientX,
      origStart: clip.start,
      origEnd: clip.end,
      targetTrackId: trackId,
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dt = dx / zoom

      if (dragRef.current.type === 'move') {
        const newStart = Math.max(0, dragRef.current.origStart + dt)
        moveClip(clip.id, dragRef.current.targetTrackId, newStart)
      } else if (dragRef.current.type === 'trim-left') {
        const newStart = Math.max(0, Math.min(dragRef.current.origStart + dt, clip.end - 0.1))
        trimClipStart(clip.id, newStart)
      } else {
        const newEnd = Math.min(duration, Math.max(dragRef.current.origEnd + dt, clip.start + 0.1))
        trimClipEnd(clip.id, newEnd)
      }
    }

    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const clipColors: Record<string, string> = {
    video: 'bg-blue-700 border-blue-500',
    audio: 'bg-green-700 border-green-500',
    subtitle: 'bg-amber-600 border-amber-400',
  }

  const colorClass = clipColors[clip.type] ?? 'bg-gray-600 border-gray-500'

  return (
    <div
      className={`absolute top-1 bottom-1 rounded border ${colorClass} ${selected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''} flex items-center overflow-hidden group`}
      style={{ left: clipLeft, width: clipWidth }}
      onMouseDown={e => onMouseDown(e, 'move')}
    >
      {/* Left trim handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 z-10 shrink-0"
        onMouseDown={e => onMouseDown(e, 'trim-left')}
      />

      {/* Label */}
      <span className="text-[10px] text-white/90 px-3 truncate select-none flex-1 pointer-events-none">
        {clip.label}
      </span>

      {/* Right trim handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 z-10 shrink-0"
        onMouseDown={e => onMouseDown(e, 'trim-right')}
      />
    </div>
  )
}
