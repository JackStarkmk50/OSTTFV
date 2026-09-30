'use client'
import { useRef } from 'react'
import { Clip as ClipType } from '@/store/types'
import { useEditorStore } from '@/store/editorStore'

interface Props {
  clip: ClipType
  zoom: number
  trackId: string
  duration: number
}

function fmtDur(s: number): string {
  if (s < 1) return `${Math.round(s * 1000)}ms`
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m${Math.floor(s % 60)}s`
}

const CLIP_STYLE: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  video:    { bg: 'bg-blue-800/80',  border: 'border-blue-500/70', text: 'text-blue-100',   accent: 'bg-blue-400' },
  audio:    { bg: 'bg-emerald-800/80', border: 'border-emerald-500/70', text: 'text-emerald-100', accent: 'bg-emerald-400' },
  subtitle: { bg: 'bg-amber-700/80', border: 'border-amber-400/70', text: 'text-amber-50',   accent: 'bg-amber-400' },
}

// Fake waveform bars for audio clips
function WaveformBars({ width }: { width: number }) {
  const count = Math.max(4, Math.floor(width / 5))
  const heights = Array.from({ length: count }, (_, i) => {
    // Deterministic pattern using index
    const v = Math.sin(i * 1.3) * 0.4 + Math.sin(i * 0.7) * 0.3 + 0.4
    return Math.max(0.15, Math.min(0.9, v))
  })
  return (
    <div className="absolute inset-x-2 inset-y-0 flex items-center gap-px pointer-events-none overflow-hidden opacity-50">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-0.5 shrink-0 rounded-full bg-emerald-300"
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  )
}

// Film strip notches for video clips
function FilmStrip({ width }: { width: number }) {
  const count = Math.max(1, Math.floor(width / 20))
  return (
    <div className="absolute inset-0 flex items-stretch overflow-hidden opacity-30 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-1 border-r border-blue-300/30 flex flex-col justify-between py-0.5 px-px">
          <div className="h-1 w-full bg-blue-300/40 rounded-sm" />
          <div className="h-1 w-full bg-blue-300/40 rounded-sm" />
        </div>
      ))}
    </div>
  )
}

export default function ClipBlock({ clip, zoom, trackId, duration }: Props) {
  const { selectedClipId, selectClip, moveClip, trimClipStart, trimClipEnd } = useEditorStore()
  const selected = selectedClipId === clip.id

  const dragRef = useRef<{
    type: 'move' | 'trim-left' | 'trim-right'
    startX: number
    origStart: number
    origEnd: number
  } | null>(null)

  const clipWidth = Math.max(4, (clip.end - clip.start) * zoom)
  const clipLeft = clip.start * zoom
  const clipDur = clip.end - clip.start

  const style = CLIP_STYLE[clip.type] ?? { bg: 'bg-gray-700', border: 'border-gray-500', text: 'text-gray-100', accent: 'bg-gray-400' }

  const snap = (val: number, shiftKey: boolean) =>
    shiftKey ? Math.round(val * 10) / 10 : val

  const onMouseDown = (e: React.MouseEvent, type: 'move' | 'trim-left' | 'trim-right') => {
    e.stopPropagation()
    e.preventDefault()
    selectClip(clip.id)

    dragRef.current = {
      type,
      startX: e.clientX,
      origStart: clip.start,
      origEnd: clip.end,
    }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = ev.clientX - dragRef.current.startX
      const dt = dx / zoom

      if (dragRef.current.type === 'move') {
        const raw = Math.max(0, dragRef.current.origStart + dt)
        moveClip(clip.id, trackId, snap(raw, ev.shiftKey))
      } else if (dragRef.current.type === 'trim-left') {
        const raw = Math.max(0, Math.min(dragRef.current.origStart + dt, clip.end - 0.1))
        trimClipStart(clip.id, snap(raw, ev.shiftKey))
      } else {
        const raw = Math.min(duration, Math.max(dragRef.current.origEnd + dt, clip.start + 0.1))
        trimClipEnd(clip.id, snap(raw, ev.shiftKey))
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

  return (
    <div
      className={`
        absolute top-1 bottom-1 rounded border overflow-hidden
        cursor-grab active:cursor-grabbing
        ${style.bg} ${style.border}
        ${selected
          ? 'ring-2 ring-white/80 ring-offset-1 ring-offset-transparent shadow-xl z-10'
          : 'hover:brightness-110 hover:shadow-md'}
        flex items-center group transition-shadow
      `}
      style={{ left: clipLeft, width: clipWidth }}
      onMouseDown={e => onMouseDown(e, 'move')}
    >
      {/* Decorative background (type-specific) */}
      {clip.type === 'audio' && clipWidth > 30 && <WaveformBars width={clipWidth} />}
      {clip.type === 'video' && clipWidth > 30 && <FilmStrip width={clipWidth} />}

      {/* Accent bar on left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${style.accent}`} />

      {/* Left trim handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/20 z-10 rounded-l"
        onMouseDown={e => onMouseDown(e, 'trim-left')}
      />

      {/* Label + duration */}
      <div className={`relative flex flex-col px-3 py-0.5 truncate flex-1 pointer-events-none z-[1] ${style.text}`}>
        <span className="text-[10px] font-medium truncate leading-tight drop-shadow-sm">{clip.label}</span>
        {clipWidth > 60 && (
          <span className="text-[8px] opacity-60 leading-tight">{fmtDur(clipDur)}</span>
        )}
      </div>

      {/* Right trim handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/20 z-10 rounded-r"
        onMouseDown={e => onMouseDown(e, 'trim-right')}
      />

      {/* Shift-snap hint */}
      {selected && (
        <div className="absolute -bottom-4 left-0 text-[8px] text-gray-500 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          Hold Shift to snap 0.1s
        </div>
      )}
    </div>
  )
}
