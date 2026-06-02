'use client'
import { useEffect } from 'react'
import { useEditorStore } from '@/store/editorStore'

export function useHotkeys(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const { isPlaying, setIsPlaying, setCurrentTime, currentTime, zoom, setZoom, selectedClipId, deleteClip } = useEditorStore()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (isPlaying) {
            videoRef.current?.pause()
            setIsPlaying(false)
          } else {
            videoRef.current?.play()
            setIsPlaying(true)
          }
          break
        case 'KeyK':
          videoRef.current?.pause()
          setIsPlaying(false)
          break
        case 'KeyJ':
          e.preventDefault()
          setCurrentTime(Math.max(0, currentTime - 5))
          if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 5)
          break
        case 'KeyL':
          e.preventDefault()
          setCurrentTime(currentTime + 5)
          if (videoRef.current) videoRef.current.currentTime = currentTime + 5
          break
        case 'ArrowLeft':
          e.preventDefault()
          setCurrentTime(Math.max(0, currentTime - 1 / 30))
          if (videoRef.current) videoRef.current.currentTime = Math.max(0, currentTime - 1 / 30)
          break
        case 'ArrowRight':
          e.preventDefault()
          setCurrentTime(currentTime + 1 / 30)
          if (videoRef.current) videoRef.current.currentTime = currentTime + 1 / 30
          break
        case 'Equal':
        case 'NumpadAdd':
          e.preventDefault()
          setZoom(zoom + 20)
          break
        case 'Minus':
        case 'NumpadSubtract':
          e.preventDefault()
          setZoom(zoom - 20)
          break
        case 'Delete':
        case 'Backspace':
          if (selectedClipId) {
            deleteClip(selectedClipId)
          }
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPlaying, currentTime, zoom, selectedClipId, videoRef, setIsPlaying, setCurrentTime, setZoom, deleteClip])
}
