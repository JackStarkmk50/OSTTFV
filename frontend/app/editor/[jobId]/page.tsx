'use client'
import { useEffect, useState, use } from 'react'
import { useEditorStore, buildTracksFromResult } from '@/store/editorStore'
import { getJob, videoUrl } from '@/lib/api'
import EditorLayout from '@/components/editor/EditorLayout'

interface Props {
  params: Promise<{ jobId: string }>
}

export default function EditorPage({ params }: Props) {
  const { jobId } = use(params)
  const { setProject } = useEditorStore()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!jobId) return
    getJob(jobId)
      .then(job => {
        if (!job.result) throw new Error('No transcription result — go through review first')
        const url = videoUrl(jobId, job.result.filename)
        setProject(buildTracksFromResult(job.result, url))
        setReady(true)
      })
      .catch(e => setError(e.message ?? 'Failed to load project'))
  }, [jobId, setProject])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-100">
        <div className="text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-500 text-sm">{error}</p>
          <a href="/" className="mt-4 block text-xs text-indigo-400 hover:underline">← Back to upload</a>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400 text-sm">
        Loading project...
      </div>
    )
  }

  return <EditorLayout />
}
