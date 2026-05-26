import React, { useState, useEffect, useRef } from 'react'
import { Download, Loader2, FileImage, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EnhancePanelProps {
  imageDataUrl: string | null
}

interface Adjustments {
  brightness: number
  contrast: number
  saturation: number
  sharpness: number
  warmth: number
  vignette: number
  blur: number
}

const FILTERS = [
  { id: 'none', label: '原图', css: '' },
  { id: 'vivid', label: '鲜艳', css: 'saturate(1.8) contrast(1.1)' },
  { id: 'cool', label: '冷色', css: 'hue-rotate(30deg) saturate(1.2) brightness(1.05)' },
  { id: 'warm', label: '暖色', css: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id: 'vintage', label: '复古', css: 'sepia(0.5) contrast(1.1) brightness(0.9) saturate(0.8)' },
  { id: 'blackwhite', label: '黑白', css: 'grayscale(1)' },
  { id: 'fade', label: '褪色', css: 'contrast(0.85) brightness(1.15) saturate(0.7)' },
  { id: 'drama', label: '戏剧', css: 'contrast(1.5) saturate(1.3) brightness(0.85)' },
]

const defaultAdj: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 0,
  warmth: 0,
  vignette: 0,
  blur: 0,
}

export default function EnhancePanel({ imageDataUrl }: EnhancePanelProps) {
  const [activeFilter, setActiveFilter] = useState('none')
  const [adj, setAdj] = useState<Adjustments>(defaultAdj)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const previewRef = useRef<HTMLImageElement>(null)

  const getFilterCss = () => {
    const base = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%) blur(${adj.blur}px)`
    const filter = FILTERS.find(f => f.id === activeFilter)
    return filter?.css ? `${base} ${filter.css}` : base
  }

  const handleReset = () => {
    setAdj(defaultAdj)
    setActiveFilter('none')
    setResultUrl(null)
  }

  const handleApply = async () => {
    if (!imageDataUrl) return
    setIsProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 600))

    const img = new Image()
    img.src = imageDataUrl
    await new Promise(r => { img.onload = r })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!

    ctx.filter = getFilterCss()
    ctx.drawImage(img, 0, 0)

    if (adj.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      )
      gradient.addColorStop(0.5, 'transparent')
      gradient.addColorStop(1, `rgba(0,0,0,${adj.vignette / 100})`)
      ctx.filter = 'none'
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    if (adj.warmth !== 0) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const warmAmount = adj.warmth / 100
      for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i] = Math.min(255, imgData.data[i] + warmAmount * 30)
        imgData.data[i + 2] = Math.max(0, imgData.data[i + 2] - warmAmount * 20)
      }
      ctx.putImageData(imgData, 0, 0)
    }

    setResultUrl(canvas.toDataURL('image/jpeg', 0.95))
    setIsProcessing(false)
  }

  const handleDownload = () => {
    if (!resultUrl) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = 'enhanced_image.jpg'
    a.click()
  }

  const SLIDERS = [
    { key: 'brightness', label: '亮度', min: 0, max: 200, default: 100 },
    { key: 'contrast', label: '对比度', min: 0, max: 200, default: 100 },
    { key: 'saturation', label: '饱和度', min: 0, max: 300, default: 100 },
    { key: 'blur', label: '模糊', min: 0, max: 10, default: 0 },
    { key: 'warmth', label: '色温', min: -100, max: 100, default: 0 },
    { key: 'vignette', label: '暗角', min: 0, max: 100, default: 0 },
  ]

  if (!imageDataUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <FileImage className="w-10 h-10 opacity-40" />
        <p className="text-sm">请先上传图片</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 滤镜选择 */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">滤镜效果</label>
        <div className="grid grid-cols-4 gap-2">
          {FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                activeFilter === filter.id ? 'border-brand shadow-glow-sm' : 'border-border hover:border-brand/40'
              }`}
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={imageDataUrl}
                  alt={filter.label}
                  className="w-full h-full object-cover"
                  style={{ filter: filter.css || 'none' }}
                />
              </div>
              <div className={`absolute inset-x-0 bottom-0 py-1 text-center text-xs font-medium transition-colors ${
                activeFilter === filter.id ? 'bg-brand text-white' : 'bg-black/50 text-white'
              }`}>
                {filter.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 实时预览 */}
      <div className="relative rounded-xl overflow-hidden border border-border">
        <img
          ref={previewRef}
          src={resultUrl || imageDataUrl}
          alt="实时预览"
          className="w-full block"
          style={{ filter: resultUrl ? 'none' : getFilterCss() }}
        />
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
          实时预览
        </div>
      </div>

      {/* 调节滑块 */}
      <div className="space-y-3">
        {SLIDERS.map(({ key, label, min, max, default: def }) => {
          const val = adj[key as keyof Adjustments]
          const pct = ((val - min) / (max - min)) * 100
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-muted-foreground">{label}</label>
                <span className="text-xs font-semibold text-brand">
                  {key === 'brightness' || key === 'contrast' || key === 'saturation' ? `${val}%` : val}
                </span>
              </div>
              <input
                type="range" min={min} max={max} value={val}
                onChange={e => setAdj(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                className="w-full h-1.5 appearance-none rounded-full cursor-pointer slider-thumb"
                style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${pct}%, hsl(var(--border)) ${pct}%)` }}
              />
            </div>
          )
        })}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RefreshCw className="w-3.5 h-3.5" />重置
        </Button>
        <Button className="flex-1" onClick={handleApply} disabled={isProcessing}>
          {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" />处理中...</> : '应用效果'}
        </Button>
        {resultUrl && (
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            <Download className="w-3.5 h-3.5" />下载
          </Button>
        )}
      </div>
    </div>
  )
}
