'use client'
import { useEditorStore } from '@/store/editorStore'
import { TextStyle } from '@/store/types'

const FONTS = [
  'Inter', 'Roboto', 'Poppins', 'Arial',
  'Noto Sans', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Malayalam', 'Noto Sans Devanagari',
]

const ANIMATIONS = ['none', 'fade', 'slide-up', 'slide-down', 'zoom']

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-800/60">
      <label className="text-[11px] text-gray-500 shrink-0 w-20">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export default function StylePanel() {
  const { project, selectedSegmentId, updateSegmentStyle, updateSegmentText } = useEditorStore()

  if (!project || selectedSegmentId === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs text-center px-4">
        <svg className="w-8 h-8 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Select a subtitle to edit styles
      </div>
    )
  }

  const seg = project.segments.find(s => s.id === selectedSegmentId)
  if (!seg) return null

  const s = seg.style
  const upd = (patch: Partial<TextStyle>) => updateSegmentStyle(selectedSegmentId, patch)

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-2">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Text Style</div>

      {/* Original text */}
      <div className="mb-2">
        <label className="text-[11px] text-gray-500 block mb-1">Original</label>
        <textarea
          value={seg.text}
          onChange={e => updateSegmentText(selectedSegmentId, 'text', e.target.value)}
          className="w-full bg-gray-800 text-gray-200 text-xs rounded p-1.5 resize-none border border-gray-700 focus:outline-none focus:border-indigo-500"
          rows={2}
        />
      </div>

      <div className="mb-2">
        <label className="text-[11px] text-gray-500 block mb-1">Romanized / Tanglish</label>
        <textarea
          value={seg.transliterated}
          onChange={e => updateSegmentText(selectedSegmentId, 'transliterated', e.target.value)}
          className="w-full bg-gray-800 text-gray-200 text-xs rounded p-1.5 resize-none border border-gray-700 focus:outline-none focus:border-indigo-500"
          rows={2}
        />
      </div>

      <div className="border-t border-gray-700 pt-2 mt-1 space-y-0.5">
        <Row label="Font">
          <select
            value={s.font}
            onChange={e => upd({ font: e.target.value })}
            className="w-full bg-gray-800 text-gray-200 text-xs rounded p-1 border border-gray-700 focus:outline-none"
          >
            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </Row>

        <Row label="Size">
          <div className="flex items-center gap-2">
            <input
              type="range" min={12} max={120} value={s.fontSize}
              onChange={e => upd({ fontSize: Number(e.target.value) })}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-gray-400 w-7 text-right">{s.fontSize}</span>
          </div>
        </Row>

        <Row label="Color">
          <div className="flex items-center gap-2">
            <input
              type="color" value={s.color}
              onChange={e => upd({ color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs text-gray-500 font-mono">{s.color}</span>
          </div>
        </Row>

        <Row label="Style">
          <div className="flex gap-1">
            <button
              onClick={() => upd({ bold: !s.bold })}
              className={`px-2 py-0.5 text-xs rounded font-bold ${s.bold ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >B</button>
            <button
              onClick={() => upd({ italic: !s.italic })}
              className={`px-2 py-0.5 text-xs rounded italic ${s.italic ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >I</button>
          </div>
        </Row>

        <Row label="Shadow">
          <button
            onClick={() => upd({ shadow: !s.shadow })}
            className={`px-2 py-0.5 text-xs rounded ${s.shadow ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >{s.shadow ? 'On' : 'Off'}</button>
        </Row>

        <Row label="Outline">
          <div className="flex items-center gap-2">
            <button
              onClick={() => upd({ outline: !s.outline })}
              className={`px-2 py-0.5 text-xs rounded ${s.outline ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >{s.outline ? 'On' : 'Off'}</button>
            {s.outline && (
              <input
                type="color" value={s.outlineColor}
                onChange={e => upd({ outlineColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
            )}
          </div>
        </Row>

        <Row label="Animation">
          <select
            value={s.animation}
            onChange={e => upd({ animation: e.target.value as TextStyle['animation'] })}
            className="w-full bg-gray-800 text-gray-200 text-xs rounded p-1 border border-gray-700 focus:outline-none capitalize"
          >
            {ANIMATIONS.map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
          </select>
        </Row>

        <Row label="Align">
          <div className="flex gap-1">
            {(['left', 'center', 'right'] as const).map(a => (
              <button
                key={a}
                onClick={() => upd({ align: a })}
                className={`px-2 py-0.5 text-xs rounded ${s.align === a ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}
              >
                {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Pos X">
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={100} value={s.position.x}
              onChange={e => upd({ position: { ...s.position, x: Number(e.target.value) } })}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-gray-400 w-8 text-right">{s.position.x}%</span>
          </div>
        </Row>

        <Row label="Pos Y">
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={100} value={s.position.y}
              onChange={e => upd({ position: { ...s.position, y: Number(e.target.value) } })}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-gray-400 w-8 text-right">{s.position.y}%</span>
          </div>
        </Row>
      </div>
    </div>
  )
}
