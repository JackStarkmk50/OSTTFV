export type TrackType = 'video' | 'audio' | 'subtitle'

export interface TextStyle {
  font: string
  fontSize: number
  color: string
  bold: boolean
  italic: boolean
  shadow: boolean
  outline: boolean
  outlineColor: string
  animation: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'zoom'
  position: { x: number; y: number }
  align: 'left' | 'center' | 'right'
}

export const defaultStyle: TextStyle = {
  font: 'Inter',
  fontSize: 48,
  color: '#FFFFFF',
  bold: false,
  italic: false,
  shadow: true,
  outline: true,
  outlineColor: '#000000',
  animation: 'none',
  position: { x: 50, y: 85 },
  align: 'center',
}

export interface Word {
  word: string
  start: number
  end: number
  confidence: number
}

export interface Segment {
  id: number
  start: number
  end: number
  text: string
  transliterated: string
  translated_en: string
  words: Word[]
  style: TextStyle
}

export interface Clip {
  id: string
  trackId: string
  segmentId?: number
  start: number
  end: number
  type: TrackType
  label: string
  color: string
}

export interface Track {
  id: string
  type: TrackType
  name: string
  muted: boolean
  locked: boolean
  clips: Clip[]
}

export interface Project {
  jobId: string
  filename: string
  duration: number
  language: string
  videoUrl: string
  segments: Segment[]
  tracks: Track[]
}
