'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { uploadVideo, startTranscription } from '@/lib/api'

const ACCEPTED = '.mp4,.mov,.mkv,.avi,.webm,.m4v'

const LANGS = [
  { code: '', label: 'Auto Detect' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'hi', label: 'Hindi' },
  { code: 'en', label: 'English' },
]

type SubtitleMode = 'sentence' | 'word' | 'group'

const MODES: { value: SubtitleMode; label: string; desc: string }[] = [
  { value: 'sentence', label: 'Sentence', desc: 'Natural sentences (Whisper default)' },
  { value: 'word',     label: 'Word by Word', desc: 'Each word = 1 subtitle stamp' },
  { value: 'group',    label: 'N Words', desc: 'Group N words per subtitle' },
]

export default function UploadZone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('')
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('sentence')
  const [wordCount, setWordCount] = useState(3)
  const [uploadPct, setUploadPct] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'starting' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleFile = (f: File) => setFile(f)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const startProcess = async () => {
    if (!file) return
    setStatus('uploading')
    setError('')
    setUploadPct(0)
    try {
      const { job_id } = await uploadVideo(file, pct => setUploadPct(pct))
      setStatus('starting')
      await startTranscription(job_id, language || undefined, subtitleMode, wordCount)
      setStatus('done')
      router.push(`/editor/${job_id}`)
    } catch (e: any) {
      setStatus('error')
      setError(e.message ?? 'Upload failed')
    }
  }

  const fmtSize = (b: number) =>
    b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

  const busy = status === 'uploading' || status === 'starting'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-400 tracking-tight">OSTTFV</h1>
        <p className="text-gray-500 mt-2 text-sm">Open Source Subtitle & Text Tool for Video</p>
      </div>

      {/* Drop zone */}
      <div
        className={`w-full max-w-xl border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-indigo-500 bg-indigo-900/20' : file ? 'border-green-600 bg-green-900/10' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div>
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-green-400 font-medium">{file.name}</p>
            <p className="text-gray-500 text-sm mt-1">{fmtSize(file.size)}</p>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); setStatus('idle') }}
              className="mt-3 text-xs text-gray-600 hover:text-red-400"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-4 opacity-40">📁</div>
            <p className="text-gray-300 font-medium">Drop your video here</p>
            <p className="text-gray-600 text-sm mt-1">or click to browse</p>
            <p className="text-gray-700 text-xs mt-3">MP4  MOV  MKV  AVI  WebM  M4V</p>
          </div>
        )}
      </div>

      <div className="mt-6 w-full max-w-xl space-y-5">
        {/* Language */}
        <div>
          <label className="text-xs text-gray-500 mb-2 block">Audio Language</label>
          <div className="flex flex-wrap gap-2">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  language === l.code
                    ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle Mode */}
        <div>
          <label className="text-xs text-gray-500 mb-2 block">Subtitle Mode</label>
          <div className="flex gap-2">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setSubtitleMode(m.value)}
                title={m.desc}
                className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors text-center ${
                  subtitleMode === m.value
                    ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {MODES.find(m => m.value === subtitleMode)?.desc}
          </p>

          {/* Word count input for group mode */}
          {subtitleMode === 'group' && (
            <div className="mt-2 flex items-center gap-3">
              <label className="text-xs text-gray-400 shrink-0">Words per subtitle:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={wordCount}
                onChange={e => setWordCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-gray-600">
                {wordCount === 1 ? '(same as Word by Word)' : `e.g. "vanakkam makkaley eppaddi" → 1 card`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress */}
      {busy && (
        <div className="mt-6 w-full max-w-xl">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{status === 'uploading' ? 'Uploading...' : 'Starting transcription...'}</span>
            <span>{Math.round(uploadPct)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${status === 'starting' ? 100 : uploadPct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 text-xs text-red-400 bg-red-900/20 border border-red-900 rounded px-4 py-2 w-full max-w-xl">
          {error}
        </div>
      )}

      <button
        onClick={startProcess}
        disabled={!file || busy}
        className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-colors"
      >
        {status === 'uploading' ? 'Uploading...' : status === 'starting' ? 'Starting...' : 'Transcribe & Open Editor'}
      </button>

      <p className="mt-6 text-xs text-gray-700 text-center">
        <kbd className="bg-gray-800 px-1 rounded">Space</kbd> play/pause ·
        <kbd className="bg-gray-800 px-1 mx-1 rounded">J/K/L</kbd> shuttle ·
        <kbd className="bg-gray-800 px-1 rounded">←→</kbd> frame step ·
        <kbd className="bg-gray-800 px-1 mx-1 rounded">+/-</kbd> zoom ·
        <kbd className="bg-gray-800 px-1 rounded">Del</kbd> delete clip
      </p>
    </div>
  )
}
