import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Download, FileImage, Plus, Trash2, Type, Smile, AlignLeft, AlignCenter, AlignRight, Bold, Italic, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StickerPanelProps {
  imageDataUrl: string | null
}

interface TextItem {
  id: string
  type: 'text' | 'emoji'
  content: string
  x: number
  y: number
  fontSize: number
  color: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  align: 'left' | 'center' | 'right'
  rotation: number
  fontFamily: string
}

const EMOJI_GROUPS = [
  { label: '表情', emojis: ['😀','😂','🥹','😍','🤩','😎','🥳','😜','🤔','😴','🤯','😱','🥺','😭','🤣','😇'] },
  { label: '手势', emojis: ['👍','👎','✌️','🤞','🤟','🖐️','👌','🤌','💪','🙌','👏','🤝','🫶','❤️','🔥','⭐'] },
  { label: '动物', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐙','🦋','🌸','🌈'] },
  { label: '食物', emojis: ['🍎','🍊','🍋','🍇','🍓','🍑','🍕','🍔','🍜','🍣','🍦','🎂','🧁','☕','🧋','🍺'] },
]

const FONT_FAMILIES = [
  { id: 'Inter', label: '默认' },
  { id: 'Georgia', label: '衬线' },
  { id: 'Courier New', label: '等宽' },
  { id: 'Impact', label: '粗体' },
]

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#DDA0DD', '#FF8C42', '#6BCB77', '#4D96FF', '#FF595E',
]

const PRESET_TEXTS = [
  '✨ 今天也很美', '拍于 2025', '这里', 'No Filter', '❤️ Love', 'Life is Good',
  '记录美好', '就这样', 'VIBES', '难忘一刻',
]

export default function StickerPanel({ imageDataUrl }: StickerPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [items, setItems] = useState<TextItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'text' | 'emoji'>('text')
  const [activeEmojiGroup, setActiveEmojiGroup] = useState(0)
  const [newText, setNewText] = useState('')
  const [fontSize, setFontSize] = useState(32)
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('bold')
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal')
  const [fontFamily, setFontFamily] = useState('Inter')
  const [canvasScale, setCanvasScale] = useState(1)
  // drag state
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)

  useEffect(() => {
    if (!imageDataUrl) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      drawAll([])
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  useEffect(() => {
    drawAll(items)
  }, [items])

  const drawAll = useCallback((its: TextItem[]) => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const container = canvas.parentElement
    const maxW = container?.clientWidth || 480
    const scale = Math.min(1, maxW / img.naturalWidth)
    if (canvas.width !== Math.round(img.naturalWidth * scale)) {
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      setCanvasScale(scale)
    }
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    its.forEach(item => {
      ctx.save()
      ctx.translate(item.x, item.y)
      ctx.rotate((item.rotation * Math.PI) / 180)

      const ff = item.type === 'emoji' ? 'system-ui' : item.fontFamily
      ctx.font = `${item.fontStyle} ${item.fontWeight} ${item.fontSize}px ${ff}`
      ctx.textAlign = item.align
      ctx.textBaseline = 'middle'

      if (item.type === 'text') {
        ctx.shadowColor = 'rgba(0,0,0,0.6)'
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1
        ctx.fillStyle = item.color
      } else {
        ctx.font = `${item.fontSize}px system-ui`
      }

      ctx.fillText(item.content, 0, 0)
      ctx.restore()
    })
  }, [])

  const addText = () => {
    if (!newText.trim() || !imgRef.current) return
    const canvas = canvasRef.current!
    const item: TextItem = {
      id: Date.now().toString(),
      type: 'text',
      content: newText.trim(),
      x: canvas.width / 2,
      y: canvas.height / 2,
      fontSize,
      color: textColor,
      fontWeight,
      fontStyle,
      align: 'center',
      rotation: 0,
      fontFamily,
    }
    const next = [...items, item]
    setItems(next)
    setSelected(item.id)
    setNewText('')
  }

  const addPresetText = (text: string) => {
    if (!imgRef.current) return
    const canvas = canvasRef.current!
    const item: TextItem = {
      id: Date.now().toString(),
      type: 'text',
      content: text,
      x: canvas.width / 2,
      y: canvas.height * 0.15 + items.length * 40,
      fontSize: 28,
      color: textColor,
      fontWeight: 'bold',
      fontStyle: 'normal',
      align: 'center',
      rotation: 0,
      fontFamily: 'Inter',
    }
    setItems(prev => [...prev, item])
    setSelected(item.id)
  }

  const addEmoji = (emoji: string) => {
    if (!imgRef.current) return
    const canvas = canvasRef.current!
    const item: TextItem = {
      id: Date.now().toString(),
      type: 'emoji',
      content: emoji,
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height / 2 + (Math.random() - 0.5) * 80,
      fontSize: 48,
      color: '#000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      align: 'center',
      rotation: 0,
      fontFamily: 'system-ui',
    }
    setItems(prev => [...prev, item])
    setSelected(item.id)
  }

  const updateSelected = (patch: Partial<TextItem>) => {
    if (!selected) return
    setItems(prev => prev.map(it => it.id === selected ? { ...it, ...patch } : it))
  }

  const deleteSelected = () => {
    if (!selected) return
    setItems(prev => prev.filter(it => it.id !== selected))
    setSelected(null)
  }

  // Canvas mouse events for drag
  const onCanvasMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width)
    const my = (e.clientY - rect.top) * (canvas.height / rect.height)

    // Hit test: find topmost item
    let hit: TextItem | null = null
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]
      const dx = mx - it.x, dy = my - it.y
      const hitRadius = it.fontSize * it.content.length * 0.35
      if (Math.abs(dx) < hitRadius && Math.abs(dy) < it.fontSize) {
        hit = it; break
      }
    }
    if (hit) {
      setSelected(hit.id)
      dragRef.current = { id: hit.id, startX: mx, startY: my, origX: hit.x, origY: hit.y }
    } else {
      setSelected(null)
    }
  }

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width)
    const my = (e.clientY - rect.top) * (canvas.height / rect.height)
    const dx = mx - dragRef.current.startX
    const dy = my - dragRef.current.startY
    const { id, origX, origY } = dragRef.current
    setItems(prev => prev.map(it => it.id === id ? { ...it, x: origX + dx, y: origY + dy } : it))
  }

  const onCanvasMouseUp = () => { dragRef.current = null }

  const handleDownload = () => {
    const canvas = canvasRef.current!
    const img = imgRef.current!
    const out = document.createElement('canvas')
    out.width = img.naturalWidth; out.height = img.naturalHeight
    const ctx = out.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const scaleUp = img.naturalWidth / canvas.width
    items.forEach(item => {
      ctx.save()
      ctx.translate(item.x * scaleUp, item.y * scaleUp)
      ctx.rotate((item.rotation * Math.PI) / 180)
      const ff = item.type === 'emoji' ? 'system-ui' : item.fontFamily
      ctx.font = `${item.fontStyle} ${item.fontWeight} ${item.fontSize * scaleUp}px ${ff}`
      ctx.textAlign = item.align
      ctx.textBaseline = 'middle'
      if (item.type === 'text') {
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6
        ctx.fillStyle = item.color
      }
      ctx.fillText(item.content, 0, 0)
      ctx.restore()
    })
    const a = document.createElement('a'); a.href = out.toDataURL('image/jpeg', 0.95); a.download = 'sticker_image.jpg'; a.click()
  }

  const selectedItem = items.find(it => it.id === selected)

  if (!imageDataUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <FileImage className="w-10 h-10 opacity-40" />
        <p className="text-sm">请先上传图片</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 功能 Tab */}
      <div className="flex gap-1.5 p-1 bg-surface rounded-lg">
        <button onClick={() => setActiveTab('text')} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all', activeTab === 'text' ? 'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <Type className="w-3.5 h-3.5" />添加文字
        </button>
        <button onClick={() => setActiveTab('emoji')} className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all', activeTab === 'emoji' ? 'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <Smile className="w-3.5 h-3.5" />表情贴纸
        </button>
      </div>

      {/* 文字输入区 */}
      {activeTab === 'text' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addText()}
              placeholder="输入文字内容…"
              className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"
            />
            <Button onClick={addText} disabled={!newText.trim()} size="sm">
              <Plus className="w-3.5 h-3.5" />添加
            </Button>
          </div>

          {/* 快捷文字 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">快捷文字</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TEXTS.map(t => (
                <button key={t} onClick={() => addPresetText(t)} className="px-2 py-1 rounded-md text-xs bg-surface-raised border border-border text-muted-foreground hover:text-foreground hover:border-brand/40 transition-all">
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 文字样式 */}
          <div className="space-y-3 pt-1">
            <div>
              <p className="text-xs text-muted-foreground mb-2">字体颜色</p>
              <div className="flex flex-wrap gap-1.5">
                {TEXT_COLORS.map(c => (
                  <button key={c} onClick={() => { setTextColor(c); if (selected) updateSelected({ color: c }) }} className={cn('w-7 h-7 rounded-lg border-2 transition-all hover:scale-110', textColor === c ? 'border-brand scale-110 shadow-glow-sm' : 'border-transparent')} style={{ backgroundColor: c, outline: c === '#FFFFFF' ? '1px solid hsl(var(--border))' : undefined }} />
                ))}
                <input type="color" value={textColor} onChange={e => { setTextColor(e.target.value); if (selected) updateSelected({ color: e.target.value }) }} className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent" title="自定义颜色" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">字号</span>
                  <span className="text-xs font-semibold text-brand">{selectedItem ? selectedItem.fontSize : fontSize}px</span>
                </div>
                <input type="range" min="12" max="120" value={selectedItem ? selectedItem.fontSize : fontSize}
                  onChange={e => { const v = Number(e.target.value); setFontSize(v); if (selected) updateSelected({ fontSize: v }) }}
                  className="w-full h-1.5 appearance-none rounded-full cursor-pointer slider-thumb"
                  style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${((( selectedItem?.fontSize || fontSize) - 12) / 108) * 100}%, hsl(var(--border)) ${(((selectedItem?.fontSize || fontSize) - 12) / 108) * 100}%)` }} />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { const v = fontWeight === 'bold' ? 'normal' : 'bold'; setFontWeight(v); if (selected) updateSelected({ fontWeight: v }) }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all', (selectedItem?.fontWeight || fontWeight) === 'bold' ? 'bg-accent border-brand/40 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                <Bold className="w-3.5 h-3.5" />加粗
              </button>
              <button onClick={() => { const v = fontStyle === 'italic' ? 'normal' : 'italic'; setFontStyle(v); if (selected) updateSelected({ fontStyle: v }) }}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all', (selectedItem?.fontStyle || fontStyle) === 'italic' ? 'bg-accent border-brand/40 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                <Italic className="w-3.5 h-3.5" />斜体
              </button>
              {['left', 'center', 'right'].map((a, i) => {
                const Icon = [AlignLeft, AlignCenter, AlignRight][i]
                return (
                  <button key={a} onClick={() => updateSelected({ align: a as 'left' | 'center' | 'right' })}
                    className={cn('p-1.5 rounded-lg border transition-all', selectedItem?.align === a ? 'bg-accent border-brand/40 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                )
              })}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">字体</p>
              <div className="flex gap-1.5">
                {FONT_FAMILIES.map(f => (
                  <button key={f.id} onClick={() => { setFontFamily(f.id); if (selected) updateSelected({ fontFamily: f.id }) }}
                    className={cn('flex-1 py-1.5 rounded-md text-xs border transition-all', (selectedItem?.fontFamily || fontFamily) === f.id ? 'bg-accent border-brand/40 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}
                    style={{ fontFamily: f.id }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 表情贴纸区 */}
      {activeTab === 'emoji' && (
        <div className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {EMOJI_GROUPS.map((g, i) => (
              <button key={g.label} onClick={() => setActiveEmojiGroup(i)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0', activeEmojiGroup === i ? 'bg-accent border-brand/40 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                {g.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_GROUPS[activeEmojiGroup].emojis.map(emoji => (
              <button key={emoji} onClick={() => addEmoji(emoji)}
                className="text-2xl h-10 flex items-center justify-center rounded-lg hover:bg-surface-raised transition-all hover:scale-125 active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">表情大小</span>
              <span className="text-xs font-semibold text-brand">{selectedItem?.fontSize || 48}px</span>
            </div>
            <input type="range" min="20" max="120" value={selectedItem?.fontSize || 48}
              onChange={e => updateSelected({ fontSize: Number(e.target.value) })}
              className="w-full h-1.5 appearance-none rounded-full cursor-pointer slider-thumb"
              style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${(((selectedItem?.fontSize || 48) - 20) / 100) * 100}%, hsl(var(--border)) ${(((selectedItem?.fontSize || 48) - 20) / 100) * 100}%)` }} />
          </div>
        </div>
      )}

      {/* 旋转控制 (选中时显示) */}
      {selectedItem && (
        <div className="p-3 bg-accent/20 rounded-lg border border-brand/20 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">已选中: {selectedItem.content}</span>
            <Button variant="ghost" size="icon-sm" onClick={deleteSelected} className="text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-shrink-0">旋转</span>
            <input type="range" min="-180" max="180" value={selectedItem.rotation}
              onChange={e => updateSelected({ rotation: Number(e.target.value) })}
              className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer slider-thumb"
              style={{ background: `linear-gradient(to right, hsl(var(--border)) 0%, hsl(262 83% 65%) 50%, hsl(var(--border)) 100%)` }} />
            <span className="text-xs font-semibold text-brand w-10 text-right">{selectedItem.rotation}°</span>
            <Button variant="ghost" size="icon-sm" onClick={() => updateSelected({ rotation: 0 })}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* 画布 */}
      <div ref={containerRef} className="relative rounded-xl overflow-hidden bg-surface border border-border checkered-bg">
        <canvas
          ref={canvasRef}
          className="w-full block cursor-move select-none"
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
        />
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
              添加文字或表情后可拖动调整位置
            </p>
          </div>
        )}
      </div>

      {/* 图层列表 */}
      {items.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">已添加 ({items.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map(it => (
              <button key={it.id} onClick={() => setSelected(it.id === selected ? null : it.id)}
                className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all max-w-[100px]', it.id === selected ? 'bg-accent border-brand/40 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                <span className="truncate">{it.content}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 下载 */}
      <Button className="w-full" onClick={handleDownload} disabled={items.length === 0}>
        <Download className="w-4 h-4" />导出图片
      </Button>
    </div>
  )
}
