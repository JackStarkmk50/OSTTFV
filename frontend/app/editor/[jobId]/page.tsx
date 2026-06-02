'use client'
import { useEffect, useState, use } from 'react'
import { useEditorStore, buildTracksFromResult } from '@/store/editorStore'
import { getJob, createWebSocket, videoUrl } from '@/lib/api'
import EditorLayout from '@/components/editor/EditorLayout'

interface Props {
  params: Promise<{ jobId: string }>
}

export default function EditorPage({ params }: Props) {
  const { jobId } = use(params)
  const { project, setProject } = useEditorStore()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Loading...')
  const [wsError, setWsError] = useState('')

  useEffect(() => {
    if (!jobId) return

    const loadJob = async () => {
      try {
        const job = await getJob(jobId)

        if (job.status === 'done' && job.result) {
          const url = videoUrl(jobId, job.result.filename)
          const p = buildTracksFromResult(job.result, url)
          setProject(p)
          setLoading(false)
          return
        }

        // Connect WebSocket to watch progress
        const ws = createWebSocket(jobId)

        ws.onmessage = (ev) => {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'progress') {
            setProgress(msg.progress ?? 0)
            setMessage(msg.message ?? 'Processing...')
          } else if (msg.type === 'done') {
            ws.close()
            const url = videoUrl(jobId, msg.data.filename)
            const p = buildTracksFromResult(msg.data, url)
            setProject(p)
            setLoading(false)
          } else if (msg.type === 'error') {
            ws.close()
            setWsError(msg.message ?? 'Transcription failed')
            setLoading(false)
          }
        }

        ws.onerror = () => setWsError('WebSocket connection failed')

        return () => ws.close()
      } catch (e: any) {
        setWsError(e.message ?? 'Failed to load job')
        setLoading(false)
      }
    }

    loadJob()
  }, [jobId, setProject])

  if (wsError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-100">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-500 text-sm">{wsError}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-100">
        <div className="w-full max-w-md px-8">
          <div className="text-center mb-6">
            <div className="text-indigo-400 font-semibold text-lg mb-1">Transcribing</div>
            <p className="text-gray-500 text-sm">{message}</p>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right text-xs text-gray-600 mt-1">{Math.round(progress)}%</div>
          <p className="text-center text-xs text-gray-700 mt-4">
            Using Whisper large-v3-turbo · RTX 4060
          </p>
        </div>
      </div>
    )
  }

  return <EditorLayout />
}
