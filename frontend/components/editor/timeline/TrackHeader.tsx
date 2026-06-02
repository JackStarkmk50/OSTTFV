'use client'
import { Track, TrackType } from '@/store/types'
import { useEditorStore } from '@/store/editorStore'

const TRACK_ICONS: Record<TrackType, string> = {
  video: 'V',
  audio: 'A',
  subtitle: 'S',
}

const TRACK_COLORS: Record<TrackType, string> = {
  video: 'bg-blue-900/50 border-blue-800',
  audio: 'bg-green-900/50 border-green-800',
  subtitle: 'bg-amber-900/50 border-amber-800',
}

interface Props {
  track: Track
  height: number
}

export default function TrackHeader({ track, height }: Props) {
  const { deleteTrack, toggleMuteTrack, toggleLockTrack } = useEditorStore()

  return (
    <div
      className={`flex items-center gap-1.5 px-2 border-b border-gray-700 shrink-0 ${TRACK_COLORS[track.type]}`}
      style={{ height, width: 140 }}
    >
      <span className="text-xs font-bold text-gray-400 w-4 text-center">{TRACK_ICONS[track.type]}</span>
      <span className="text-xs text-gray-200 truncate flex-1">{track.name}</span>

      <button
        onClick={() => toggleMuteTrack(track.id)}
        title={track.muted ? 'Unmute' : 'Mute'}
        className={`text-[10px] px-1 rounded ${track.muted ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
      >
        {track.muted ? 'M' : 'm'}
      </button>

      <button
        onClick={() => toggleLockTrack(track.id)}
        title={track.locked ? 'Unlock' : 'Lock'}
        className={`text-[10px] px-1 rounded ${track.locked ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
      >
        {track.locked ? '🔒' : '🔓'}
      </button>

      <button
        onClick={() => deleteTrack(track.id)}
        title="Delete track"
        className="text-[10px] text-gray-600 hover:text-red-400 px-1"
      >
        ✕
      </button>
    </div>
  )
}
