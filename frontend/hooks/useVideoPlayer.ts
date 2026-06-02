'use client'
import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/store/editorStore'

const FRAME_RATE = 30

export function snapToFrame(t: number): number {
  return Math.round(t * FRAME_RATE) / FRAME_RATE
}

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const { setCurrentTime, setIsPlaying } = useEditorStore()
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const tick = () => {
      setCurrentTime(video.currentTime)
      if (!video.paused && !video.ended) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    const onPlay = () => {
      setIsPlaying(true)
      rafRef.current = requestAnimationFrame(tick)
    }
    const onPause = () => {
      setIsPlaying(false)
      cancelAnimationFrame(rafRef.current)
      setCurrentTime(video.currentTime)
    }
    const onEnded = () => {
      setIsPlaying(false)
      cancelAnimationFrame(rafRef.current)
    }
    const onSeeked = () => setCurrentTime(video.currentTime)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    video.addEventListener('seeked', onSeeked)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('seeked', onSeeked)
      cancelAnimationFrame(rafRef.current)
    }
  }, [setCurrentTime, setIsPlaying])

  const seekTo = (time: number) => {
    const t = snapToFrame(Math.max(0, time))
    if (videoRef.current) {
      videoRef.current.currentTime = t
      setCurrentTime(t)
    }
  }

  return { videoRef, seekTo }
}
