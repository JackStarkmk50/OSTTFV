'use client'
import { FC } from 'react'
import { Track, TrackType } from '@/store/types'
import { useEditorStore } from '@/store/editorStore'

const TRACK_BG: Record<TrackType, string> = {
  video:    'bg-blue-950/60',
  audio:    'bg-green-950/60',
  subtitle: 'bg-amber-950/60',
}

const TRACK_ACCENT: Record<TrackType, string> = {
  video:    'bg-blue-500',
  audio:    'bg-green-500',
  subtitle: 'bg-amber-400',
}

function VideoIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14v-4zM3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
    </svg>
  )
}

function AudioIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
    </svg>
  )
}

function SubtitleIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h8v2H4v-2z" />
    </svg>
  )
}

const ICONS: Record<TrackType, FC> = {
  video: VideoIcon,
  audio: AudioIcon,
  subtitle: SubtitleIcon,
}

interface Props {
  track: Track
  height: number
}

export default function TrackHeader({ track, height }: Props) {
  const { deleteTrack, toggleMuteTrack, toggleLockTrack } = useEditorStore()
  const Icon = ICONS[track.type]

  return (
    <div
      className={`flex items-center gap-1.5 px-2 border-b border-gray-800 shrink-0 ${TRACK_BG[track.type]}`}
      style={{ height, width: 160 }}
    >
      {/* Colored accent bar */}
      <div className={`w-0.5 self-stretch rounded-full mr-0.5 ${TRACK_ACCENT[track.type]}`} />

      {/* Icon */}
      <span className="text-gray-400 shrink-0"><Icon /></span>

      {/* Name */}
      <span className="text-xs text-gray-200 truncate flex-1 font-medium">{track.name}</span>

      {/* Controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => toggleMuteTrack(track.id)}
          title={track.muted ? 'Unmute' : 'Mute'}
          className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-colors ${
            track.muted
              ? 'bg-red-600/80 text-white'
              : 'text-gray-600 hover:text-gray-300 hover:bg-gray-700/60'
          }`}
        >
          M
        </button>

        <button
          onClick={() => toggleLockTrack(track.id)}
          title={track.locked ? 'Unlock' : 'Lock'}
          className={`w-5 h-5 rounded flex items-center justify-center text-[9px] transition-colors ${
            track.locked
              ? 'bg-yellow-600/80 text-white'
              : 'text-gray-600 hover:text-gray-300 hover:bg-gray-700/60'
          }`}
        >
          {track.locked ? '🔒' : 'L'}
        </button>

        <button
          onClick={() => deleteTrack(track.id)}
          title="Delete track"
          className="w-5 h-5 rounded flex items-center justify-center text-[9px] text-gray-700 hover:text-red-400 hover:bg-gray-700/60 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
