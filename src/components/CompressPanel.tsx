import { useState } from 'react'
import { Download, ZapIcon, FileImage, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CompressPanelProps {
  imageFile: File | null
  imageDataUrl: string | null
}

interface CompressResult {
  dataUrl: string
  originalSize: number
  compressedSize: number
  ratio: number
}

export default function CompressPanel({ imageFile, imageDataUrl }: CompressPanelProps) {
  const [quality, setQuality] = useState(80)
  const [maxWidth, setMaxWidth] = useState(1920)
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<CompressResult | null>(null)

  const handleCompress = async () => {
    if (!imageDataUrl || !imageFile) return
    setIsProcessing(true)
    setResult(null)

    await new Promise(resolve => setTimeout(resolve, 800))

    const img = new Image()
    img.src = imageDataUrl
    await new Promise(resolve => { img.onload = resolve })

    const canvas = document.createElement('canvas')
    let w = img.naturalWidth
    let h = img.naturalHeight

    if (w > maxWidth) {
      h = Math.round((h * maxWidth) / w)
      w = maxWidth
    }

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)

    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg'
    const compressedDataUrl = canvas.toDataURL(mimeType, quality / 100)

    const originalSize = imageFile.size
    const base64 = compressedDataUrl.split(',')[1]
    const compressedSize = Math.round((base64.length * 3) / 4)

    setResult({
      dataUrl: compressedDataUrl,
      originalSize,
      compressedSize,
      ratio: Math.round((1 - compressedSize / originalSize) * 100),
    })
    setIsProcessing(false)
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.dataUrl
    a.download = `compressed_image.${format}`
    a.click()
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

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
      {/* 格式选择 */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 sm:mb-3 block">输出格式</label>
        <div className="flex gap-2">
          {(['jpeg', 'png', 'webp'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 py-2.5 sm:py-2 rounded-lg text-sm font-medium border transition-all duration-200 min-h-[44px] sm:min-h-0 touch-manipulation active:scale-95 ${
                format === f
                  ? 'bg-accent border-brand/50 text-accent-foreground shadow-glow-sm'
                  : 'bg-surface border-border text-muted-foreground hover:text-foreground hover:border-brand/30'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 压缩质量 */}
      <div>
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">压缩质量</label>
          <span className="text-sm font-semibold text-brand">{quality}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={quality}
          onChange={e => setQuality(Number(e.target.value))}
          className="w-full h-2 appearance-none bg-border rounded-full cursor-pointer slider-thumb touch-manipulation"
          style={{
            background: `linear-gradient(to right, hsl(262 83% 65%) ${quality}%, hsl(var(--border)) ${quality}%)`
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>最小体积</span>
          <span>最高质量</span>
        </div>
      </div>

      {/* 最大宽度 */}
      <div>
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">最大宽度</label>
          <span className="text-sm font-semibold text-brand">{maxWidth}px</span>
        </div>
        <input
          type="range"
          min="400"
          max="4000"
          step="100"
          value={maxWidth}
          onChange={e => setMaxWidth(Number(e.target.value))}
          className="w-full h-2 appearance-none bg-border rounded-full cursor-pointer slider-thumb touch-manipulation"
          style={{
            background: `linear-gradient(to right, hsl(262 83% 65%) ${((maxWidth - 400) / 3600) * 100}%, hsl(var(--border)) ${((maxWidth - 400) / 3600) * 100}%)`
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>400px</span>
          <span>4000px</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <Button
        className="w-full"
        onClick={handleCompress}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <><Loader2 className="w-4 h-4 animate-spin" />正在压缩...</>
        ) : (
          <><ZapIcon className="w-4 h-4" />开始压缩</>
        )}
      </Button>

      {/* 压缩结果 */}
      {result && (
        <div className="surface-card rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-sm font-medium text-foreground">压缩完成</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-surface-raised rounded-lg p-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">原始大小</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">{formatBytes(result.originalSize)}</p>
            </div>
            <div className="bg-surface-raised rounded-lg p-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">压缩后</p>
              <p className="text-xs sm:text-sm font-semibold text-foreground">{formatBytes(result.compressedSize)}</p>
            </div>
            <div className="bg-accent rounded-lg p-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">节省空间</p>
              <p className="text-xs sm:text-sm font-semibold text-accent-foreground">{result.ratio > 0 ? `-${result.ratio}%` : '优化'}</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleDownload}>
            <Download className="w-4 h-4" />
            下载压缩图片
          </Button>
        </div>
      )}
    </div>
  )
}
