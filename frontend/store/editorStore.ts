import { create } from 'zustand'
import { Project, Track, Clip, Segment, TextStyle, TrackType, defaultStyle } from './types'

let trackCounter = 0
let clipCounter = 0

function genTrackId() { return `track-${++trackCounter}` }
function genClipId() { return `clip-${++clipCounter}` }

interface EditorState {
  project: Project | null
  currentTime: number
  isPlaying: boolean
  zoom: number
  selectedClipId: string | null
  selectedSegmentId: number | null

  setProject: (p: Project) => void
  setCurrentTime: (t: number) => void
  setIsPlaying: (v: boolean) => void
  setZoom: (z: number) => void
  selectClip: (id: string | null) => void
  selectSegment: (id: number | null) => void

  addTrack: (type: TrackType) => void
  deleteTrack: (id: string) => void
  toggleMuteTrack: (id: string) => void
  toggleLockTrack: (id: string) => void

  moveClip: (clipId: string, newTrackId: string, newStart: number) => void
  trimClipStart: (clipId: string, newStart: number) => void
  trimClipEnd: (clipId: string, newEnd: number) => void
  deleteClip: (clipId: string) => void

  updateSegmentStyle: (segmentId: number, style: Partial<TextStyle>) => void
  updateSegmentText: (segmentId: number, field: 'text' | 'transliterated', value: string) => void
  updateSegmentTiming: (segmentId: number, start: number, end: number) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: null,
  currentTime: 0,
  isPlaying: false,
  zoom: 80,
  selectedClipId: null,
  selectedSegmentId: null,

  setProject: (p) => set({ project: p }),
  setCurrentTime: (t) => set({ currentTime: Math.max(0, t) }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setZoom: (z) => set({ zoom: Math.min(400, Math.max(20, z)) }),
  selectClip: (id) => set({ selectedClipId: id }),
  selectSegment: (id) => set({ selectedSegmentId: id }),

  addTrack: (type) => set((s) => {
    if (!s.project) return s
    const names: Record<TrackType, string> = { video: 'Video', audio: 'Audio', subtitle: 'Subtitles' }
    const newTrack: Track = {
      id: genTrackId(),
      type,
      name: names[type],
      muted: false,
      locked: false,
      clips: [],
    }
    return {
      project: { ...s.project, tracks: [...s.project.tracks, newTrack] }
    }
  }),

  deleteTrack: (id) => set((s) => {
    if (!s.project) return s
    return {
      project: { ...s.project, tracks: s.project.tracks.filter(t => t.id !== id) }
    }
  }),

  toggleMuteTrack: (id) => set((s) => {
    if (!s.project) return s
    return {
      project: {
        ...s.project,
        tracks: s.project.tracks.map(t => t.id === id ? { ...t, muted: !t.muted } : t)
      }
    }
  }),

  toggleLockTrack: (id) => set((s) => {
    if (!s.project) return s
    return {
      project: {
        ...s.project,
        tracks: s.project.tracks.map(t => t.id === id ? { ...t, locked: !t.locked } : t)
      }
    }
  }),

  moveClip: (clipId, newTrackId, newStart) => set((s) => {
    if (!s.project) return s
    let movedClip: Clip | null = null

    const tracks = s.project.tracks.map(t => {
      const clip = t.clips.find(c => c.id === clipId)
      if (clip) {
        movedClip = { ...clip, trackId: newTrackId, start: Math.max(0, newStart), end: Math.max(0, newStart) + (clip.end - clip.start) }
        return { ...t, clips: t.clips.filter(c => c.id !== clipId) }
      }
      return t
    })

    if (!movedClip) return s

    const finalTracks = tracks.map(t =>
      t.id === newTrackId ? { ...t, clips: [...t.clips, movedClip!] } : t
    )

    return { project: { ...s.project, tracks: finalTracks } }
  }),

  trimClipStart: (clipId, newStart) => set((s) => {
    if (!s.project) return s
    return {
      project: {
        ...s.project,
        tracks: s.project.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => {
            if (c.id !== clipId) return c
            const start = Math.max(0, Math.min(newStart, c.end - 0.1))
            return { ...c, start }
          })
        }))
      }
    }
  }),

  trimClipEnd: (clipId, newEnd) => set((s) => {
    if (!s.project) return s
    const duration = s.project.duration
    return {
      project: {
        ...s.project,
        tracks: s.project.tracks.map(t => ({
          ...t,
          clips: t.clips.map(c => {
            if (c.id !== clipId) return c
            const end = Math.min(duration, Math.max(newEnd, c.start + 0.1))
            return { ...c, end }
          })
        }))
      }
    }
  }),

  deleteClip: (clipId) => set((s) => {
    if (!s.project) return s
    return {
      project: {
        ...s.project,
        tracks: s.project.tracks.map(t => ({
          ...t,
          clips: t.clips.filter(c => c.id !== clipId)
        }))
      }
    }
  }),

  updateSegmentStyle: (segmentId, style) => set((s) => {
    if (!s.project) return s
    return {
      project: {
        ...s.project,
        segments: s.project.segments.map(seg =>
          seg.id === segmentId ? { ...seg, style: { ...seg.style, ...style } } : seg
        )
      }
    }
  }),

  updateSegmentText: (segmentId, field, value) => set((s) => {
    if (!s.project) return s
    return {
      project: {
        ...s.project,
        segments: s.project.segments.map(seg =>
          seg.id === segmentId ? { ...seg, [field]: value } : seg
        )
      }
    }
  }),

  updateSegmentTiming: (segmentId, start, end) => set((s) => {
    if (!s.project) return s
    return {
      project: {
        ...s.project,
        segments: s.project.segments.map(seg =>
          seg.id === segmentId ? { ...seg, start, end } : seg
        )
      }
    }
  }),
}))

export function buildTracksFromResult(result: {
  job_id: string
  filename: string
  duration: number
  language: string
  segments: any[]
}, videoUrl: string): Project {
  const segments: Segment[] = result.segments.map((s: any) => ({
    ...s,
    style: s.style ?? { ...defaultStyle },
  }))

  const videoTrack: Track = {
    id: genTrackId(),
    type: 'video',
    name: 'Video',
    muted: false,
    locked: false,
    clips: [{
      id: genClipId(),
      trackId: 'video-0',
      start: 0,
      end: result.duration,
      type: 'video',
      label: result.filename,
      color: '#3b82f6',
    }],
  }
  videoTrack.clips[0].trackId = videoTrack.id

  const audioTrack: Track = {
    id: genTrackId(),
    type: 'audio',
    name: 'Audio',
    muted: false,
    locked: false,
    clips: [{
      id: genClipId(),
      trackId: 'audio-0',
      start: 0,
      end: result.duration,
      type: 'audio',
      label: 'Audio',
      color: '#22c55e',
    }],
  }
  audioTrack.clips[0].trackId = audioTrack.id

  const subtitleTrack: Track = {
    id: genTrackId(),
    type: 'subtitle',
    name: 'Subtitles',
    muted: false,
    locked: false,
    clips: segments.map(seg => ({
      id: genClipId(),
      trackId: 'sub-0',
      segmentId: seg.id,
      start: seg.start,
      end: seg.end,
      type: 'subtitle' as TrackType,
      label: seg.transliterated || seg.text,
      color: '#f59e0b',
    })),
  }
  subtitleTrack.clips.forEach(c => { c.trackId = subtitleTrack.id })

  return {
    jobId: result.job_id,
    filename: result.filename,
    duration: result.duration,
    language: result.language,
    videoUrl,
    segments,
    tracks: [videoTrack, audioTrack, subtitleTrack],
  }
}
