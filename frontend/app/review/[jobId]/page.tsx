'use client'
import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getJob, createWebSocket, translateSegments, saveSegments, exportSRT, videoUrl } from '@/lib/api'

interface Word { word: string; start: number; end: number; confidence: number }
interface Segment {
  id: number; start: number; end: number
  text: string; transliterated: string; translated_en: string
  words: Word[]; style: any
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(1).padStart(4, '0')
  return `${m}:${sec}`
}

const LANG_NAMES: Record<string, string> = {
  ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', hi: 'Hindi', kn: 'Kannada', en: 'English', bn: 'Bengali'
}

export default function ReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [phase, setPhase] = useState<'loading' | 'transcribing' | 'ready' | 'error'>('loading')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('Connecting...')
  const [segments, setSegments] = useState<Segment[]>([])
  const [filename, setFilename] = useState('')
  const [language, setLanguage] = useState('')
  const [duration, setDuration] = useState(0)
  const [vidUrl, setVidUrl] = useState('')
  const [error, setError] = useState('')
  const [translating, setTranslating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  useEffect(() => {
    if (!jobId) return
    let ws: WebSocket | null = null

    const loadResult = (result: any) => {
      setSegments(result.segments ?? [])
      setLanguage(result.language ?? '')
      setDuration(result.duration ?? 0)
      setFilename(result.filename ?? '')
      setVidUrl(videoUrl(jobId, result.filename))
      setPhase('ready')
    }

    const init = async () => {
      try {
        const job = await getJob(jobId)
        setFilename(job.result?.filename ?? '')

        if (job.status === 'done' && job.result) {
          loadResult(job.result)
          return
        }

        setPhase('transcribing')
        ws = createWebSocket(jobId)
        ws.onmessage = (ev) => {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'progress') {
            setProgress(msg.progress ?? 0)
            setProgressMsg(msg.message ?? '')
          } else if (msg.type === 'done') {
            ws?.close()
            loadResult(msg.data)
          } else if (msg.type === 'error') {
            ws?.close()
            setError(msg.message ?? 'Transcription failed')
            setPhase('error')
          }
        }
        ws.onerror = () => { setError('WebSocket connection failed'); setPhase('error') }
      } catch (e: any) {
        setError(e.message ?? 'Failed to load job')
        setPhase('error')
      }
    }

    init()
    return () => { ws?.close() }
  }, [jobId])

  const seekTo = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time
  }

  const updateSegText = (id: number, field: 'text' | 'transliterated', val: string) => {
    setSegments(segs => segs.map(s => s.id === id ? { ...s, [field]: val } : s))
  }

  const handleTranslate = async (mode: 'romanize' | 'tanglish' | 'english') => {
    setTranslating(true)
    try {
      const res = await translateSegments(jobId, mode)
      setSegments(res.segments)
    } finally {
      setTranslating(false)
    }
  }

  const handleContinue = async () => {
    setSaving(true)
    try {
      await saveSegments(jobId, segments)
    } catch {
      // non-fatal — editor reloads from job file
    } finally {
      setSaving(false)
      router.push(`/editor/${jobId}`)
    }
  }

  const handleExportSRT = () => exportSRT(jobId, filename)

  if (phase === 'loading' || phase === 'transcribing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-100">
        <div className="w-full max-w-md px-8 text-center">
          <div className="text-indigo-400 font-semibold text-xl mb-2">Transcribing</div>
          <p className="text-gray-500 text-sm mb-6">{progressMsg}</p>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-600 mt-1">{Math.round(progress)}%</div>
          <p className="text-xs text-gray-700 mt-6">Whisper · Auto-detecting language</p>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-100">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Transcription failed</div>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-xs text-indigo-400 hover:underline">← Back to upload</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden">

      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <button onClick={() => router.push('/')} className="text-gray-500 hover:text-gray-300 text-sm">← Back</button>
        <div className="w-px h-4 bg-gray-700" />
        <span className="text-indigo-400 font-semibold text-sm">OSTTFV</span>
        <span className="text-gray-600 text-xs">/</span>
        <span className="text-xs text-gray-400 max-w-[220px] truncate">{filename}</span>
        {language && (
          <span className="text-[10px] bg-gray-800 text-gray-500 rounded px-1.5 py-0.5">
            {LANG_NAMES[language] ?? language.toUpperCase()} · {segments.length} segments · {fmt(duration)}
          </span>
        )}
        <div className="flex-1" />
        <span className="text-xs text-gray-600">Review & translate — then open editor when ready</span>
      </div>

      {/* Mini video player */}
      <div className="shrink-0 bg-black border-b border-gray-800 flex items-center gap-4 px-4 py-2">
        <video
          ref={videoRef}
          src={vidUrl}
          className="h-20 rounded shadow-lg"
          controls
          style={{ maxWidth: 240 }}
        />
        <div className="text-xs text-gray-500 space-y-1.5">
          <p>Click timestamps to seek</p>
          <p>Edit text directly in either panel</p>
          <p className="text-amber-500/80">Tip: run "AI Tanglish" or "English" before opening editor</p>
        </div>
      </div>

      {/* Two-panel review */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT — Original STT */}
        <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
          <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Original STT</span>
            <span className="text-[10px] text-gray-600">{LANG_NAMES[language] ?? language} — as heard</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {segments.map(seg => (
              <div
                key={seg.id}
                className={`border-b border-gray-800/60 px-4 py-2.5 transition-colors ${activeId === seg.id ? 'bg-indigo-900/20' : 'hover:bg-gray-900/40'}`}
              >
                <button
                  className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 mb-1 block"
                  onClick={() => { seekTo(seg.start); setActiveId(seg.id) }}
                  title="Click to seek"
                >
                  ▶ {fmt(seg.start)} → {fmt(seg.end)}
                </button>
                <textarea
                  value={seg.text}
                  onChange={e => updateSegText(seg.id, 'text', e.target.value)}
                  onFocus={() => setActiveId(seg.id)}
                  className="w-full bg-transparent text-sm text-gray-200 resize-none focus:outline-none focus:bg-gray-800/40 rounded px-1 leading-relaxed"
                  rows={Math.max(1, Math.ceil(seg.text.length / 50))}
                />
                {seg.words.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {seg.words.map((w, i) => (
                      <span
                        key={i}
                        className={`text-[9px] px-1 rounded cursor-default ${
                          w.confidence > 0.8 ? 'text-green-600' : w.confidence > 0.5 ? 'text-yellow-600' : 'text-red-600'
                        }`}
                        title={`${w.word} — ${Math.round(w.confidence * 100)}% confidence`}
                      >
                        {w.word.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Romanized / Translated */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Romanized / Translated</span>
            <span className="text-[10px] text-gray-600">editable</span>
            <div className="flex-1" />
            <button
              onClick={() => handleTranslate('romanize')}
              disabled={translating}
              className="text-[10px] px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded disabled:opacity-40"
              title="Convert script to Roman letters"
            >
              {translating ? '...' : 'Romanize'}
            </button>
            <button
              onClick={() => handleTranslate('tanglish')}
              disabled={translating}
              className="text-[10px] px-2 py-1 bg-amber-900/60 hover:bg-amber-800/60 text-amber-300 rounded disabled:opacity-40 border border-amber-800/40"
              title="AI-powered natural Tanglish"
            >
              {translating ? '...' : 'AI Tanglish'}
            </button>
            <button
              onClick={() => handleTranslate('english')}
              disabled={translating}
              className="text-[10px] px-2 py-1 bg-blue-900/60 hover:bg-blue-800/60 text-blue-300 rounded disabled:opacity-40 border border-blue-800/40"
              title="Full English translation"
            >
              {translating ? '...' : 'English'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {segments.map(seg => (
              <div
                key={seg.id}
                className={`border-b border-gray-800/60 px-4 py-2.5 transition-colors ${activeId === seg.id ? 'bg-indigo-900/20' : 'hover:bg-gray-900/40'}`}
              >
                <button
                  className="text-[10px] font-mono text-indigo-400/60 mb-1 block"
                  onClick={() => { seekTo(seg.start); setActiveId(seg.id) }}
                >
                  ▶ {fmt(seg.start)} → {fmt(seg.end)}
                </button>
                <textarea
                  value={seg.transliterated || seg.text}
                  onChange={e => updateSegText(seg.id, 'transliterated', e.target.value)}
                  onFocus={() => setActiveId(seg.id)}
                  className="w-full bg-transparent text-sm text-amber-200/90 resize-none focus:outline-none focus:bg-gray-800/40 rounded px-1 leading-relaxed"
                  rows={Math.max(1, Math.ceil((seg.transliterated || seg.text).length / 50))}
                />
                {seg.translated_en && seg.translated_en !== seg.transliterated && (
                  <p className="text-[10px] text-blue-400/60 mt-1 px-1 italic border-l-2 border-blue-800/40 pl-2">
                    {seg.translated_en}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-t border-gray-800 shrink-0">
        <span className="text-xs text-gray-600">
          {segments.length} segments · {fmt(duration)} · {LANG_NAMES[language] ?? language}
        </span>
        <button
          onClick={handleExportSRT}
          className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
        >
          Export SRT Draft
        </button>
        <div className="flex-1" />
        <span className="text-xs text-gray-600">Edits are saved when you open the editor</span>
        <button
          onClick={handleContinue}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm flex items-center gap-2"
        >
          {saving ? 'Saving...' : 'Open Editor →'}
        </button>
      </div>
    </div>
  )
}
