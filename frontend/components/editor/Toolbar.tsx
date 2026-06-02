'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEditorStore } from '@/store/editorStore'
import { exportSRT, exportVideo, translateSegments } from '@/lib/api'

export default function Toolbar() {
  const router = useRouter()
  const { project, setProject } = useEditorStore()
  const [exporting, setExporting] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateOpen, setTranslateOpen] = useState(false)
  const translateRef = useRef<HTMLDivElement>(null)

  // Close translate dropdown on outside click
  useEffect(() => {
    if (!translateOpen) return
    const handler = (e: MouseEvent) => {
      if (translateRef.current && !translateRef.current.contains(e.target as Node)) {
        setTranslateOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [translateOpen])

  if (!project) return null

  const handleExportSRT = async () => {
    setExporting(true)
    try { await exportSRT(project.jobId, project.filename) }
    finally { setExporting(false) }
  }

  const handleExportVideo = async () => {
    setExporting(true)
    try { await exportVideo(project.jobId, project.segments) }
    finally { setExporting(false) }
  }

  const handleTranslate = async (mode: 'romanize' | 'english' | 'tanglish') => {
    setTranslateOpen(false)
    setTranslating(true)
    try {
      const res = await translateSegments(project.jobId, mode)
      setProject({
        ...project,
        segments: res.segments,
        tracks: project.tracks.map(t =>
          t.type === 'subtitle'
            ? {
                ...t,
                clips: t.clips.map(c => {
                  if (c.segmentId === undefined) return c
                  const seg = res.segments.find((s: any) => s.id === c.segmentId)
                  return seg ? { ...c, label: seg.transliterated || seg.text } : c
                })
              }
            : t
        )
      })
    } finally {
      setTranslating(false)
    }
  }

  const langLabel: Record<string, string> = {
    ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', hi: 'Hindi', en: 'English'
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-950 border-b border-gray-800 shrink-0">
      <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-300 text-sm">
        ← Back
      </button>

      <div className="w-px h-5 bg-gray-800 mx-1" />

      <span className="text-sm font-semibold text-indigo-400">OSTTFV</span>
      <span className="text-gray-600 text-xs">/</span>
      <span className="text-xs text-gray-400 max-w-[200px] truncate">{project.filename}</span>
      <span className="text-[10px] bg-gray-800 text-gray-500 rounded px-1.5 py-0.5">
        {langLabel[project.language] ?? project.language.toUpperCase()}
      </span>

      <div className="flex-1" />

      {/* Translate — click-based dropdown */}
      <div ref={translateRef} className="relative">
        <button
          disabled={translating}
          onClick={() => setTranslateOpen(o => !o)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 rounded disabled:opacity-50"
        >
          {translating ? 'Translating...' : 'Translate ▾'}
        </button>
        {translateOpen && (
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded shadow-xl z-50 min-w-[170px]">
            <button onClick={() => handleTranslate('romanize')} className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700">
              Romanize (Tanglish script)
            </button>
            <button onClick={() => handleTranslate('tanglish')} className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700">
              Smart Tanglish (AI)
            </button>
            <button onClick={() => handleTranslate('english')} className="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-700">
              English Translation
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleExportSRT}
        disabled={exporting}
        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded disabled:opacity-50"
      >
        Export SRT
      </button>

      <button
        onClick={handleExportVideo}
        disabled={exporting}
        className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50"
      >
        {exporting ? 'Exporting...' : 'Export Video'}
      </button>
    </div>
  )
}
