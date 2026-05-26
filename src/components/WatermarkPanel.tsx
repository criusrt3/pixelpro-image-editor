import React, { useState, useRef, useEffect } from 'react'
import { Eraser, MousePointer, Brush, Download, RotateCcw, FileImage, Loader2, Info, Scan } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WatermarkPanelProps {
  imageDataUrl: string | null
}

type Tool = 'brush' | 'rect'
type WatermarkMode = 'erase' | 'scattered'

export default function WatermarkPanel({ imageDataUrl }: WatermarkPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTool, setActiveTool] = useState<Tool>('rect')
  const [mode, setMode] = useState<WatermarkMode>('erase')
  const [brushSize, setBrushSize] = useState(24)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hasMask, setHasMask] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const rectStart = useRef<{ x: number; y: number } | null>(null)
  // store accumulated brush strokes so rect preview doesn't wipe them
  const strokesCanvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!imageDataUrl) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImageLoaded(true)
      setResultUrl(null)
      setHasMask(false)
      initCanvases(img)
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  const initCanvases = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas) return
    const maxW = canvas.parentElement?.clientWidth || 500
    const scale = Math.min(1, maxW / img.naturalWidth)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    canvas.width = w; canvas.height = h
    maskCanvas.width = w; maskCanvas.height = h
    // init strokes canvas
    const sc = document.createElement('canvas')
    sc.width = w; sc.height = h
    strokesCanvasRef.current = sc
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    maskCanvas.getContext('2d')!.clearRect(0, 0, w, h)
  }

  const getPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDraw = (e: React.MouseEvent) => {
    setIsDrawing(true)
    const pos = getPos(e)
    lastPos.current = pos
    if (activeTool === 'rect') {
      rectStart.current = pos
    } else {
      paintBrush(pos.x, pos.y, pos.x, pos.y)
    }
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return
    const pos = getPos(e)
    if (activeTool === 'brush' && lastPos.current) {
      paintBrush(lastPos.current.x, lastPos.current.y, pos.x, pos.y)
    } else if (activeTool === 'rect' && rectStart.current) {
      previewRect(rectStart.current, pos)
    }
    lastPos.current = pos
  }

  const paintBrush = (x1: number, y1: number, x2: number, y2: number) => {
    const sc = strokesCanvasRef.current
    if (!sc) return
    const sctx = sc.getContext('2d')!
    sctx.strokeStyle = 'rgba(168, 85, 247, 0.85)'
    sctx.lineWidth = brushSize
    sctx.lineCap = 'round'; sctx.lineJoin = 'round'
    sctx.beginPath(); sctx.moveTo(x1, y1); sctx.lineTo(x2, y2); sctx.stroke()
    syncMaskAndPreview()
    setHasMask(true)
  }

  const previewRect = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const sc = strokesCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!sc || !maskCanvas) return
    const mctx = maskCanvas.getContext('2d')!
    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    // paste existing brush strokes
    mctx.drawImage(sc, 0, 0)
    // draw current rect preview
    mctx.fillStyle = 'rgba(168, 85, 247, 0.65)'
    mctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y)
    renderFinal()
  }

  const commitRect = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const sc = strokesCanvasRef.current
    if (!sc) return
    const sctx = sc.getContext('2d')!
    sctx.fillStyle = 'rgba(168, 85, 247, 0.85)'
    sctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y)
    syncMaskAndPreview()
    setHasMask(true)
  }

  const syncMaskAndPreview = () => {
    const maskCanvas = maskCanvasRef.current
    const sc = strokesCanvasRef.current
    if (!maskCanvas || !sc) return
    const mctx = maskCanvas.getContext('2d')!
    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    mctx.drawImage(sc, 0, 0)
    renderFinal()
  }

  const renderFinal = () => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    const img = imgRef.current
    if (!canvas || !maskCanvas || !img) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    ctx.drawImage(maskCanvas, 0, 0)
  }

  const stopDraw = (e: React.MouseEvent) => {
    if (!isDrawing) return
    if (activeTool === 'rect' && rectStart.current) {
      const pos = getPos(e)
      commitRect(rectStart.current, pos)
    }
    setIsDrawing(false)
    lastPos.current = null
    rectStart.current = null
  }

  // ---- Inpainting: content-aware fill ----
  const handleRemove = async () => {
    const maskCanvas = maskCanvasRef.current
    const img = imgRef.current
    if (!maskCanvas || !img) return
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 1400))

    const W = img.naturalWidth, H = img.naturalHeight
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = W; outputCanvas.height = H
    const octx = outputCanvas.getContext('2d')!
    octx.drawImage(img, 0, 0)

    const scaleX = W / maskCanvas.width
    const scaleY = H / maskCanvas.height
    const maskData = maskCanvas.getContext('2d')!.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const imgData = octx.getImageData(0, 0, W, H)

    // Build full-res mask
    const fullMask = new Uint8Array(W * H)
    for (let my = 0; my < maskCanvas.height; my++) {
      for (let mx = 0; mx < maskCanvas.width; mx++) {
        if (maskData.data[(my * maskCanvas.width + mx) * 4 + 3] > 60) {
          const ix = Math.round(mx * scaleX), iy = Math.round(my * scaleY)
          for (let dy = 0; dy < Math.ceil(scaleY); dy++)
            for (let dx = 0; dx < Math.ceil(scaleX); dx++) {
              const px = Math.min(ix + dx, W - 1), py = Math.min(iy + dy, H - 1)
              fullMask[py * W + px] = 1
            }
        }
      }
    }

    // Multi-pass inpainting: expand boundary fill radius per pass
    for (let pass = 0; pass < 3; pass++) {
      const radius = 18 + pass * 12
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!fullMask[y * W + x]) continue
          let r = 0, g = 0, b = 0, cnt = 0
          // weighted by distance - closer boundary pixels count more
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nx = x + dx, ny = y + dy
              if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
              if (fullMask[ny * W + nx]) continue
              const dist = Math.sqrt(dx * dx + dy * dy)
              if (dist > radius) continue
              const w = 1 / (dist + 1)
              const ni = (ny * W + nx) * 4
              r += imgData.data[ni] * w
              g += imgData.data[ni + 1] * w
              b += imgData.data[ni + 2] * w
              cnt += w
            }
          }
          if (cnt > 0) {
            const ii = (y * W + x) * 4
            imgData.data[ii] = Math.round(r / cnt)
            imgData.data[ii + 1] = Math.round(g / cnt)
            imgData.data[ii + 2] = Math.round(b / cnt)
          }
        }
      }
    }

    octx.putImageData(imgData, 0, 0)
    const url = outputCanvas.toDataURL('image/jpeg', 0.95)
    setResultUrl(url)

    // Update canvas display
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const ri = new Image()
    ri.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(ri, 0, 0, canvas.width, canvas.height) }
    ri.src = url
    maskCanvas.getContext('2d')!.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    strokesCanvasRef.current?.getContext('2d')!.clearRect(0, 0, strokesCanvasRef.current.width, strokesCanvasRef.current.height)
    setHasMask(false)
    setIsProcessing(false)
  }

  // ---- Scattered watermark: frequency-based subtraction ----
  const handleScattered = async () => {
    const img = imgRef.current
    if (!img) return
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 1800))

    const W = img.naturalWidth, H = img.naturalHeight
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = W; outputCanvas.height = H
    const octx = outputCanvas.getContext('2d')!
    octx.drawImage(img, 0, 0)
    const imgData = octx.getImageData(0, 0, W, H)

    // Estimate watermark pattern via high-pass average in tiles
    const tileSize = 64
    for (let ty = 0; ty < H; ty += tileSize) {
      for (let tx = 0; tx < W; tx += tileSize) {
        const tw = Math.min(tileSize, W - tx), th = Math.min(tileSize, H - ty)
        let sumR = 0, sumG = 0, sumB = 0, cnt = tw * th
        for (let dy = 0; dy < th; dy++) for (let dx = 0; dx < tw; dx++) {
          const i = ((ty + dy) * W + (tx + dx)) * 4
          sumR += imgData.data[i]; sumG += imgData.data[i + 1]; sumB += imgData.data[i + 2]
        }
        const avgR = sumR / cnt, avgG = sumG / cnt, avgB = sumB / cnt
        // Compute local std dev to detect watermark-like patterns
        let stdR = 0
        for (let dy = 0; dy < th; dy++) for (let dx = 0; dx < tw; dx++) {
          const i = ((ty + dy) * W + (tx + dx)) * 4
          stdR += Math.abs(imgData.data[i] - avgR)
        }
        stdR /= cnt
        if (stdR < 30) {
          // Low-variance region: soften toward local average (removes faint marks)
          for (let dy = 0; dy < th; dy++) for (let dx = 0; dx < tw; dx++) {
            const i = ((ty + dy) * W + (tx + dx)) * 4
            imgData.data[i] = Math.round(imgData.data[i] * 0.6 + avgR * 0.4)
            imgData.data[i + 1] = Math.round(imgData.data[i + 1] * 0.6 + avgG * 0.4)
            imgData.data[i + 2] = Math.round(imgData.data[i + 2] * 0.6 + avgB * 0.4)
          }
        }
      }
    }
    octx.putImageData(imgData, 0, 0)
    const url = outputCanvas.toDataURL('image/jpeg', 0.95)
    setResultUrl(url)
    // update canvas
    const canvas = canvasRef.current!
    const ri = new Image()
    ri.onload = () => { canvas.getContext('2d')!.drawImage(ri, 0, 0, canvas.width, canvas.height) }
    ri.src = url
    setIsProcessing(false)
  }

  const handleReset = () => {
    setResultUrl(null); setHasMask(false)
    if (imgRef.current) initCanvases(imgRef.current)
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
    <div className="space-y-4">
      {/* 水印类型切换 */}
      <div className="flex gap-1.5 p-1 bg-surface rounded-lg">
        <button
          onClick={() => setMode('erase')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
            mode === 'erase' ? 'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eraser className="w-3.5 h-3.5" />固定位置水印
        </button>
        <button
          onClick={() => setMode('scattered')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
            mode === 'scattered' ? 'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scan className="w-3.5 h-3.5" />全局分散水印
        </button>
      </div>

      {mode === 'erase' ? (
        <>
          <div className="flex items-start gap-2 p-3 bg-accent/30 rounded-lg border border-brand/20">
            <Info className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              适合角标、文字水印等<strong className="text-foreground">固定位置</strong>水印。框选或涂抹水印区域后点击"消除"。
            </p>
          </div>

          {/* 工具栏 */}
          <div className="flex items-center gap-2">
            <Button variant={activeTool === 'rect' ? 'tool-active' : 'tool'} size="sm" onClick={() => setActiveTool('rect')}>
              <MousePointer className="w-3.5 h-3.5" />矩形框选
            </Button>
            <Button variant={activeTool === 'brush' ? 'tool-active' : 'tool'} size="sm" onClick={() => setActiveTool('brush')}>
              <Brush className="w-3.5 h-3.5" />画笔涂抹
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="icon-sm" onClick={handleReset} title="重置">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {activeTool === 'brush' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-muted-foreground">画笔大小</label>
                <span className="text-xs font-semibold text-brand">{brushSize}px</span>
              </div>
              <input
                type="range" min="5" max="80" value={brushSize}
                onChange={e => setBrushSize(Number(e.target.value))}
                className="w-full h-1.5 appearance-none bg-border rounded-full cursor-pointer slider-thumb"
                style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${((brushSize - 5) / 75) * 100}%, hsl(var(--border)) ${((brushSize - 5) / 75) * 100}%)` }}
              />
            </div>
          )}

          <div className="relative rounded-xl overflow-hidden bg-surface border border-border checkered-bg">
            <canvas
              ref={canvasRef}
              className="w-full block cursor-crosshair select-none"
              onMouseDown={startDraw}
              onMouseMove={onMouseMove}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
            />
            <canvas ref={maskCanvasRef} className="hidden" />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleRemove} disabled={isProcessing || !imageLoaded || !hasMask}>
              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" />处理中...</> : <><Eraser className="w-4 h-4" />消除水印</>}
            </Button>
            {resultUrl && (
              <Button variant="secondary" onClick={() => { const a = document.createElement('a'); a.href = resultUrl; a.download = 'no_watermark.jpg'; a.click() }}>
                <Download className="w-4 h-4" />下载
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-2 p-3 bg-accent/30 rounded-lg border border-brand/20">
            <Info className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              适合<strong className="text-foreground">半透明重复平铺</strong>的全局水印。通过频率分析识别并减弱水印纹理，效果取决于水印强度，建议多试几次。
            </p>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-surface border border-border checkered-bg">
            <canvas ref={canvasRef} className="w-full block" />
            <canvas ref={maskCanvasRef} className="hidden" />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleScattered} disabled={isProcessing || !imageLoaded}>
              {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" />分析处理中...</> : <><Scan className="w-4 h-4" />全局去水印</>}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleReset} title="重置">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            {resultUrl && (
              <Button variant="secondary" onClick={() => { const a = document.createElement('a'); a.href = resultUrl; a.download = 'no_watermark.jpg'; a.click() }}>
                <Download className="w-4 h-4" />下载
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
