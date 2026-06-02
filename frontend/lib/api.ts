const API = 'http://localhost:8000/api'

export async function uploadVideo(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ job_id: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API}/upload`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(xhr.responseText))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(form)
  })
}

export async function startTranscription(jobId: string, language?: string) {
  const res = await fetch(`${API}/transcribe/${jobId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: language || null }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJob(jobId: string) {
  const res = await fetch(`${API}/job/${jobId}`)
  if (!res.ok) throw new Error('Job not found')
  return res.json()
}

export function createWebSocket(jobId: string): WebSocket {
  return new WebSocket(`ws://localhost:8000/ws/${jobId}`)
}

export async function translateSegments(jobId: string, mode: 'romanize' | 'english' | 'tanglish') {
  const res = await fetch(`${API}/translate/${jobId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function saveSegments(jobId: string, segments: any[]) {
  const res = await fetch(`${API}/segments/${jobId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function exportSRT(jobId: string, filename: string) {
  const res = await fetch(`${API}/export/srt/${jobId}`)
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.[^.]+$/, '.srt')
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportVideo(jobId: string, segments: any[]) {
  const res = await fetch(`${API}/export/video/${jobId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments, format: 'mp4' }),
  })
  if (!res.ok) throw new Error(await res.text())
  const { download_url } = await res.json()
  window.open(`http://localhost:8000${download_url}`, '_blank')
}

export function videoUrl(jobId: string, filename: string) {
  return `http://localhost:8000/api/video/${jobId}/${filename}`
}
