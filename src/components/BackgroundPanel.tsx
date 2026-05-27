import { useState, useRef, useEffect } from 'react'
import { Download, Loader2, FileImage, Layers, Brush, RotateCcw, Info, Eraser as EraserIcon, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePinchZoom } from '@/hooks/usePinchZoom'
import ZoomControls from '@/components/ZoomControls'
import bgNature from '@/assets/images/bg-nature.png'
import bgCity from '@/assets/images/bg-city.png'

interface BackgroundPanelProps {
  imageDataUrl: string | null
}

const PRESET_BACKGROUNDS = [
  { id: 'nature', label: '自然风景', url: bgNature },
  { id: 'city', label: '城市夜景', url: bgCity },
  { id: 'gradient1', label: '紫色渐变', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'gradient2', label: '日落渐变', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'gradient3', label: '海洋渐变', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'gradient4', label: '森林渐变', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'solid-white', label: '纯白', color: '#ffffff' },
  { id: 'solid-black', label: '纯黑', color: '#000000' },
  { id: 'solid-gray', label: '浅灰', color: '#f0f0f0' },
  { id: 'solid-blue', label: '证件蓝', color: '#438EDB' },
  { id: 'solid-red', label: '证件红', color: '#CC0001' },
]

const SOLID_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']

type Mode = 'auto' | 'manual'

export default function BackgroundPanel({ imageDataUrl }: BackgroundPanelProps) {
  const [mode, setMode] = useState<Mode>('auto')
  const [selectedBg, setSelectedBg] = useState<string | null>(null)
  const [bgTab, setBgTab] = useState<'preset' | 'color'>('preset')
  const [customColor, setCustomColor] = useState('#438EDB')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [customBgUrl, setCustomBgUrl] = useState<string | null>(null)
  const [tolerance, setTolerance] = useState(30)
  const [brushSize, setBrushSize] = useState(20)
  const [brushMode, setBrushMode] = useState<'keep' | 'remove'>('keep')
  const [hasMask, setHasMask] = useState(false)

  // canvas refs for manual mode
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null) // green=keep, red=remove
  const imgRef = useRef<HTMLImageElement | null>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const pinch = usePinchZoom({
    onSingleTouchStart: (cx, cy) => {
      isDrawing.current = true
      const pos = getPosFromClient(cx, cy)
      lastPos.current = pos
      paintMask(pos.x, pos.y, pos.x, pos.y)
    },
    onSingleTouchMove: (cx, cy) => {
      if (!isDrawing.current || !lastPos.current) return
      const pos = getPosFromClient(cx, cy)
      paintMask(lastPos.current.x, lastPos.current.y, pos.x, pos.y)
      lastPos.current = pos
    },
    onSingleTouchEnd: () => { isDrawing.current = false; lastPos.current = null },
  })

  useEffect(() => {
    if (!imageDataUrl) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setResultUrl(null)
      setHasMask(false)
      if (mode === 'manual') initManualCanvas(img)
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  useEffect(() => {
    if (mode === 'manual' && imgRef.current) initManualCanvas(imgRef.current)
  }, [mode])

  const initManualCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas) return
    const maxW = canvas.parentElement?.clientWidth || 480
    const scale = Math.min(1, maxW / img.naturalWidth)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    canvas.width = w; canvas.height = h
    maskCanvas.width = w; maskCanvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    maskCanvas.getContext('2d')!.clearRect(0, 0, w, h)
    setHasMask(false)
  }

  const getPosFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const getPos = (e: React.MouseEvent) => getPosFromClient(e.clientX, e.clientY)

  const paintMask = (x1: number, y1: number, x2: number, y2: number) => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const mctx = maskCanvas.getContext('2d')!
    mctx.globalCompositeOperation = 'source-over'
    // green = keep foreground, red = remove (mark as background)
    mctx.strokeStyle = brushMode === 'keep' ? 'rgba(0,200,100,0.7)' : 'rgba(220,50,50,0.7)'
    mctx.lineWidth = brushSize
    mctx.lineCap = 'round'; mctx.lineJoin = 'round'
    mctx.beginPath(); mctx.moveTo(x1, y1); mctx.lineTo(x2, y2); mctx.stroke()
    renderPreview()
    setHasMask(true)
  }

  const renderPreview = () => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    const img = imgRef.current
    if (!canvas || !maskCanvas || !img) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    // tint overlay
    const mctx = maskCanvas.getContext('2d')!
    const md = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < md.data.length; i += 4) {
      if (md.data[i + 3] > 30) {
        // green channel dominant = keep (tint green), red = remove (tint red)
        const isKeep = md.data[i + 1] > md.data[i]
        if (isKeep) {
          id.data[i] = Math.round(id.data[i] * 0.6)
          id.data[i + 1] = Math.min(255, Math.round(id.data[i + 1] * 0.6 + 80))
          id.data[i + 2] = Math.round(id.data[i + 2] * 0.6)
        } else {
          id.data[i] = Math.min(255, Math.round(id.data[i] * 0.6 + 80))
          id.data[i + 1] = Math.round(id.data[i + 1] * 0.6)
          id.data[i + 2] = Math.round(id.data[i + 2] * 0.6)
        }
      }
    }
    ctx.putImageData(id, 0, 0)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isDrawing.current = true
    const pos = getPos(e)
    lastPos.current = pos
    paintMask(pos.x, pos.y, pos.x, pos.y)
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current || !lastPos.current) return
    const pos = getPos(e)
    paintMask(lastPos.current.x, lastPos.current.y, pos.x, pos.y)
    lastPos.current = pos
  }
  const handleMouseUp = () => { isDrawing.current = false; lastPos.current = null }

  const handleReset = () => {
    setResultUrl(null); setHasMask(false)
    if (imgRef.current) initManualCanvas(imgRef.current)
  }

  // Draw background onto ctx — accept explicit params to avoid stale closure issues
  const drawBg = async (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    curSelectedBg: string | null,
    curBgTab: 'preset' | 'color',
    curCustomColor: string,
    curCustomBgUrl: string | null,
  ) => {
    const bg = PRESET_BACKGROUNDS.find(b => b.id === curSelectedBg)
    const imgUrl = bg?.url || curCustomBgUrl
    if (imgUrl) {
      const bgImg = new Image()
      // Only set crossOrigin for external URLs (data URLs and same-origin don't need it)
      if (imgUrl.startsWith('http')) bgImg.crossOrigin = 'anonymous'
      bgImg.src = imgUrl
      await new Promise<void>(r => { bgImg.onload = () => r(); bgImg.onerror = () => r() })
      // Only draw if image actually loaded
      if (bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, w, h)
        return
      }
      // Image failed to load — fall through to gradient/color fallback
    }
    if (bg?.gradient) {
      const stops = bg.gradient.match(/#[0-9a-fA-F]{6}/g) || ['#667eea', '#764ba2']
      const grad = ctx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, stops[0])
      grad.addColorStop(1, stops[1] || stops[0])
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    } else if (bg?.color) {
      ctx.fillStyle = bg.color
      ctx.fillRect(0, 0, w, h)
    } else if (curBgTab === 'color') {
      ctx.fillStyle = curCustomColor
      ctx.fillRect(0, 0, w, h)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
    }
  }

  // ---- Auto mode: chroma key / flood fill from edges ----
  const handleAutoRemove = async () => {
    const img = imgRef.current
    if (!img) return
    // Snapshot state values before any await to avoid stale closure
    const curSelectedBg = selectedBg
    const curBgTab = bgTab
    const curCustomColor = customColor
    const curCustomBgUrl = customBgUrl
    const curTolerance = tolerance
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 800))

    const W = img.naturalWidth, H = img.naturalHeight
    const srcCanvas = document.createElement('canvas')
    srcCanvas.width = W; srcCanvas.height = H
    const sctx = srcCanvas.getContext('2d')!
    sctx.drawImage(img, 0, 0)
    const imgData = sctx.getImageData(0, 0, W, H)
    const d = imgData.data

    // Sample background color from corners
    const corners = [
      [0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1],
      [Math.floor(W / 2), 0], [0, Math.floor(H / 2)], [W - 1, Math.floor(H / 2)], [Math.floor(W / 2), H - 1]
    ]
    let bgR = 0, bgG = 0, bgB = 0
    corners.forEach(([x, y]) => {
      const i = (y * W + x) * 4
      bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]
    })
    bgR /= corners.length; bgG /= corners.length; bgB /= corners.length

    // Create alpha mask via flood fill from edges within tolerance
    const alpha = new Uint8Array(W * H) // 0=bg(transparent), 255=fg(keep)
    alpha.fill(255)
    const queue: number[] = []
    const visited = new Uint8Array(W * H)

    const colorDist = (i: number) => {
      const dr = d[i] - bgR, dg = d[i + 1] - bgG, db = d[i + 2] - bgB
      return Math.sqrt(dr * dr + dg * dg + db * db)
    }

    // Seed from all 4 edges
    for (let x = 0; x < W; x++) {
      queue.push(0 * W + x); queue.push((H - 1) * W + x)
    }
    for (let y = 1; y < H - 1; y++) {
      queue.push(y * W + 0); queue.push(y * W + (W - 1))
    }

    let qi = 0
    while (qi < queue.length) {
      const idx = queue[qi++]
      if (visited[idx]) continue
      visited[idx] = 1
      const pi = idx * 4
      if (colorDist(pi) <= curTolerance) {
        alpha[idx] = 0
        const x = idx % W, y = Math.floor(idx / W)
        if (x > 0) queue.push(idx - 1)
        if (x < W - 1) queue.push(idx + 1)
        if (y > 0) queue.push(idx - W)
        if (y < H - 1) queue.push(idx + W)
      }
    }

    // Feather edges: soften transition
    const featherRadius = 2
    const smoothAlpha = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sum = 0, cnt = 0
        for (let dy = -featherRadius; dy <= featherRadius; dy++) {
          for (let dx = -featherRadius; dx <= featherRadius; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) { sum += alpha[ny * W + nx]; cnt++ }
          }
        }
        smoothAlpha[y * W + x] = Math.round(sum / cnt)
      }
    }

    // Compose: new bg + masked fg
    const outCanvas = document.createElement('canvas')
    outCanvas.width = W; outCanvas.height = H
    const octx = outCanvas.getContext('2d')!
    await drawBg(octx, W, H, curSelectedBg, curBgTab, curCustomColor, curCustomBgUrl)
    const bgData = octx.getImageData(0, 0, W, H)
    const outData = octx.createImageData(W, H)
    for (let i = 0; i < W * H; i++) {
      const a = smoothAlpha[i] / 255
      const pi = i * 4
      outData.data[pi] = Math.round(d[pi] * a + bgData.data[pi] * (1 - a))
      outData.data[pi + 1] = Math.round(d[pi + 1] * a + bgData.data[pi + 1] * (1 - a))
      outData.data[pi + 2] = Math.round(d[pi + 2] * a + bgData.data[pi + 2] * (1 - a))
      outData.data[pi + 3] = 255
    }
    octx.putImageData(outData, 0, 0)
    setResultUrl(outCanvas.toDataURL('image/jpeg', 0.94))
    setIsProcessing(false)
  }

  // ---- Manual mode: use painted mask ----
  const handleManualApply = async () => {
    const img = imgRef.current
    const maskCanvas = maskCanvasRef.current
    if (!img || !maskCanvas) return
    // Snapshot state values before any await to avoid stale closure
    const curSelectedBg = selectedBg
    const curBgTab = bgTab
    const curCustomColor = customColor
    const curCustomBgUrl = customBgUrl
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 600))

    const W = img.naturalWidth, H = img.naturalHeight
    const mScaleX = W / maskCanvas.width, mScaleY = H / maskCanvas.height

    const srcCanvas = document.createElement('canvas')
    srcCanvas.width = W; srcCanvas.height = H
    const sctx = srcCanvas.getContext('2d')!
    sctx.drawImage(img, 0, 0)
    const imgData = sctx.getImageData(0, 0, W, H)
    const d = imgData.data

    const mctx = maskCanvas.getContext('2d')!
    const mData = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    const md = mData.data

    // Build keep/remove map at full res
    const keepMap = new Int8Array(W * H) // 1=keep, -1=remove, 0=unknown
    for (let my = 0; my < maskCanvas.height; my++) {
      for (let mx = 0; mx < maskCanvas.width; mx++) {
        const mi = (my * maskCanvas.width + mx) * 4
        if (md[mi + 3] > 30) {
          const ix = Math.round(mx * mScaleX), iy = Math.round(my * mScaleY)
          const isKeep = md[mi + 1] > md[mi]
          for (let dy = 0; dy < Math.ceil(mScaleY); dy++) {
            for (let dx = 0; dx < Math.ceil(mScaleX); dx++) {
              const px = Math.min(ix + dx, W - 1), py = Math.min(iy + dy, H - 1)
              keepMap[py * W + px] = isKeep ? 1 : -1
            }
          }
        }
      }
    }

    // Flood fill from "remove" seeds using color similarity
    const alpha = new Uint8Array(W * H)
    alpha.fill(255) // default keep

    // Mark explicit removes first
    for (let i = 0; i < W * H; i++) {
      if (keepMap[i] === -1) alpha[i] = 0
    }

    // Expand remove region to similar adjacent pixels
    const queue: number[] = []
    for (let i = 0; i < W * H; i++) if (keepMap[i] === -1) queue.push(i)
    const visited = new Uint8Array(W * H)
    const expandTol = 40

    let qi = 0
    while (qi < queue.length) {
      const idx = queue[qi++]
      if (visited[idx]) continue
      visited[idx] = 1
      const pi = idx * 4
      const x = idx % W, y = Math.floor(idx / W)
      const neighbors = []
      if (x > 0) neighbors.push(idx - 1)
      if (x < W - 1) neighbors.push(idx + 1)
      if (y > 0) neighbors.push(idx - W)
      if (y < H - 1) neighbors.push(idx + W)
      for (const ni of neighbors) {
        if (visited[ni] || keepMap[ni] === 1) continue
        const npi = ni * 4
        const dr = d[pi] - d[npi], dg = d[pi + 1] - d[npi + 1], db = d[pi + 2] - d[npi + 2]
        if (Math.sqrt(dr * dr + dg * dg + db * db) <= expandTol) {
          alpha[ni] = 0; queue.push(ni)
        }
      }
    }

    // Feather
    const smooth = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let s = 0, c = 0
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) { s += alpha[ny * W + nx]; c++ }
        }
        smooth[y * W + x] = Math.round(s / c)
      }
    }

    const outCanvas = document.createElement('canvas')
    outCanvas.width = W; outCanvas.height = H
    const octx = outCanvas.getContext('2d')!
    await drawBg(octx, W, H, curSelectedBg, curBgTab, curCustomColor, curCustomBgUrl)
    const bgData = octx.getImageData(0, 0, W, H)
    const outData = octx.createImageData(W, H)
    for (let i = 0; i < W * H; i++) {
      const a = smooth[i] / 255, pi = i * 4
      outData.data[pi] = Math.round(d[pi] * a + bgData.data[pi] * (1 - a))
      outData.data[pi + 1] = Math.round(d[pi + 1] * a + bgData.data[pi + 1] * (1 - a))
      outData.data[pi + 2] = Math.round(d[pi + 2] * a + bgData.data[pi + 2] * (1 - a))
      outData.data[pi + 3] = 255
    }
    octx.putImageData(outData, 0, 0)
    setResultUrl(outCanvas.toDataURL('image/jpeg', 0.94))
    setIsProcessing(false)
  }

  const hasBgSelected = selectedBg !== null || bgTab === 'color'

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

      {/* 抠图模式切换 */}
      <div className="flex gap-1.5 p-1 bg-surface rounded-lg">
        <button onClick={() => { setMode('auto'); setResultUrl(null) }}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 rounded-md text-xs font-medium transition-all min-h-[40px] touch-manipulation active:scale-95',
            mode === 'auto' ? 'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <Wand2 className="w-3.5 h-3.5" />自动抠图
        </button>
        <button onClick={() => { setMode('manual'); setResultUrl(null) }}
          className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 rounded-md text-xs font-medium transition-all min-h-[40px] touch-manipulation active:scale-95',
            mode === 'manual' ? 'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <Brush className="w-3.5 h-3.5" />手动涂抹
        </button>
      </div>

      {/* 提示说明 */}
      <div className="flex items-start gap-2 p-3 bg-accent/30 rounded-lg border border-brand/20">
        <Info className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {mode === 'auto'
            ? '适合纯色/接近纯色背景（白底证件照等）。调节容差控制去除范围，再选择新背景应用。'
            : '用绿色画笔涂抹要保留的前景，红色画笔涂抹要去除的背景，再应用新背景。'}
        </p>
      </div>

      {/* 自动模式：容差控制 */}
      {mode === 'auto' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-muted-foreground">背景容差（越大去除越多）</label>
            <span className="text-xs font-semibold text-brand">{tolerance}</span>
          </div>
          <input type="range" min="5" max="100" value={tolerance}
            onChange={e => setTolerance(Number(e.target.value))}
            className="w-full h-2 appearance-none rounded-full cursor-pointer slider-thumb touch-manipulation"
            style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${((tolerance - 5) / 95) * 100}%, hsl(var(--border)) ${((tolerance - 5) / 95) * 100}%)` }} />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>精细</span><span>宽松</span>
          </div>
        </div>
      )}

      {/* 手动模式：画笔工具 */}
      {mode === 'manual' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setBrushMode('keep')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all',
                brushMode === 'keep' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
              <Brush className="w-3.5 h-3.5" />保留前景
            </button>
            <button onClick={() => setBrushMode('remove')}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all',
                brushMode === 'remove' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
              <EraserIcon className="w-3.5 h-3.5" />去除背景
            </button>
            <Button variant="ghost" size="icon-sm" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">画笔大小</span>
              <span className="text-xs font-semibold text-brand">{brushSize}px</span>
            </div>
            <input type="range" min="5" max="60" value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              className="w-full h-2 appearance-none rounded-full cursor-pointer slider-thumb touch-manipulation"
              style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${((brushSize - 5) / 55) * 100}%, hsl(var(--border)) ${((brushSize - 5) / 55) * 100}%)` }} />
          </div>
          <div ref={pinch.viewportRef} className="relative rounded-xl overflow-hidden border border-border checkered-bg">
            <div style={pinch.wrapperStyle}>
              <canvas ref={canvasRef} className="w-full block cursor-crosshair select-none"
                style={{ touchAction: 'none' }}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                {...pinch.handlers} />
              <canvas ref={maskCanvasRef} className="hidden" />
              <div className="absolute bottom-2 left-2 flex gap-2 text-xs pointer-events-none">
                <span className="bg-emerald-500/80 text-white px-2 py-0.5 rounded">绿=保留</span>
                <span className="bg-red-500/80 text-white px-2 py-0.5 rounded">红=去除</span>
              </div>
            </div>
            <ZoomControls zoom={pinch.zoom} onZoomIn={() => pinch.setZoom(z => z + 0.25)} onZoomOut={() => pinch.setZoom(z => z - 0.25)} onReset={pinch.resetView} />
          </div>
        </div>
      )}

      {/* 新背景选择 */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">选择新背景</p>
        <div className="flex gap-1 p-1 bg-surface rounded-lg mb-3">
          <button onClick={() => setBgTab('preset')}
            className={cn('flex-1 py-1.5 rounded-md text-xs font-medium transition-all', bgTab === 'preset' ? 'bg-accent text-accent-foreground border border-brand/30' : 'text-muted-foreground hover:text-foreground')}>
            预设背景
          </button>
          <button onClick={() => setBgTab('color')}
            className={cn('flex-1 py-1.5 rounded-md text-xs font-medium transition-all', bgTab === 'color' ? 'bg-accent text-accent-foreground border border-brand/30' : 'text-muted-foreground hover:text-foreground')}>
            纯色
          </button>
        </div>

        {bgTab === 'preset' && (
          <div className="grid grid-cols-4 gap-1.5">
            {PRESET_BACKGROUNDS.map(bg => (
              <button key={bg.id} onClick={() => setSelectedBg(bg.id)}
                className={cn('relative h-12 rounded-lg overflow-hidden border-2 transition-all duration-200',
                  selectedBg === bg.id ? 'border-brand shadow-glow-sm' : 'border-border hover:border-brand/40')}
                style={bg.url
                  ? { backgroundImage: `url(${bg.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : bg.gradient ? { background: bg.gradient } : { backgroundColor: bg.color, outline: bg.color === '#ffffff' ? '1px solid hsl(var(--border))' : undefined }}>
                <div className="absolute inset-0 bg-black/20 flex items-end">
                  <span className="text-white text-[10px] px-1 pb-0.5 font-medium leading-tight drop-shadow">{bg.label}</span>
                </div>
                {selectedBg === bg.id && (
                  <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-brand rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
              </button>
            ))}
            <label className={cn('relative h-12 rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-200 bg-surface flex items-center justify-center',
              selectedBg === 'custom' ? 'border-brand shadow-glow-sm' : 'border-dashed border-border hover:border-brand/40')}>
              <input type="file" accept="image/*" className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { setCustomBgUrl(ev.target?.result as string); setSelectedBg('custom') }; r.readAsDataURL(f) }} />
              {customBgUrl
                ? <div className="absolute inset-0" style={{ backgroundImage: `url(${customBgUrl})`, backgroundSize: 'cover' }} />
                : <div className="flex flex-col items-center gap-0.5"><span className="text-base text-muted-foreground">+</span><span className="text-[10px] text-muted-foreground">上传</span></div>}
            </label>
          </div>
        )}

        {bgTab === 'color' && (
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
              {SOLID_COLORS.map(color => (
                <button key={color} onClick={() => { setCustomColor(color); setSelectedBg(null) }}
                  className={cn('h-8 rounded-lg border-2 transition-all hover:scale-105', customColor === color && bgTab === 'color' ? 'border-brand scale-110 shadow-glow-sm' : 'border-transparent')}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input type="color" value={customColor} onChange={e => { setCustomColor(e.target.value); setSelectedBg(null) }}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent" />
              <input type="text" value={customColor} onChange={e => { setCustomColor(e.target.value); setSelectedBg(null) }}
                className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground outline-none focus:border-brand transition-colors" />
            </div>
          </div>
        )}
      </div>

      {/* 结果预览 */}
      {resultUrl && (
        <div className="rounded-xl overflow-hidden border border-border animate-fade-in">
          <img src={resultUrl} alt="换背景结果" className="w-full block" />
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button className="flex-1"
          onClick={mode === 'auto' ? handleAutoRemove : handleManualApply}
          disabled={isProcessing || !hasBgSelected || (mode === 'manual' && !hasMask)}>
          {isProcessing
            ? <><Loader2 className="w-4 h-4 animate-spin" />处理中...</>
            : <><Layers className="w-4 h-4" />{mode === 'auto' ? '自动换背景' : '应用背景'}</>}
        </Button>
        {resultUrl && (
          <Button variant="secondary" onClick={() => { const a = document.createElement('a'); a.href = resultUrl; a.download = 'bg_changed.jpg'; a.click() }}>
            <Download className="w-4 h-4" />下载
          </Button>
        )}
      </div>
    </div>
  )
}
