import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Download, FileImage, Loader2, Info, Brush, Eraser as EraserIcon,
  RotateCcw, Wand2, Layers, Upload, Trash2,
  Plus, FlipHorizontal, RotateCcw as RotateIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePinchZoom } from '@/hooks/usePinchZoom'
import ZoomControls from '@/components/ZoomControls'

interface CutoutPanelProps {
  imageDataUrl: string | null
}

type Step = 'cutout' | 'compose'
type CutoutMode = 'auto' | 'manual'
type ManualTool = 'keep' | 'erase'

// ── Placed element on compose canvas ─────────────────────────
interface PlacedItem {
  id: string
  dataUrl: string   // cutout PNG with transparency
  x: number
  y: number
  scale: number
  flipX: boolean
  rotation: number
}

export default function CutoutPanel({ imageDataUrl }: CutoutPanelProps) {
  // ── Step ────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('cutout')

  // ── Cutout state ────────────────────────────────────────────
  const [cutoutMode, setCutoutMode] = useState<CutoutMode>('auto')
  const [tolerance, setTolerance] = useState(35)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cutoutDataUrl, setCutoutDataUrl] = useState<string | null>(null)
  const [manualTool, setManualTool] = useState<ManualTool>('keep')
  const [brushSize, setBrushSize] = useState(22)
  const [hasMask, setHasMask] = useState(false)

  const cutoutCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<HTMLCanvasElement | null>(null)
  const cutoutImgRef = useRef<HTMLImageElement | null>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // ── Compose state ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_bgDataUrl, setBgDataUrl] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState('#1a1a2e')
  const [bgType, setBgType] = useState<'upload' | 'color' | 'transparent'>('color')
  const [items, setItems] = useState<PlacedItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_composeZoom, _setComposeZoom] = useState(100)
  const composeCanvasRef = useRef<HTMLCanvasElement>(null)
  const composeBgRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ id: string; startMx: number; startMy: number; origX: number; origY: number } | null>(null)

  const BG_PRESETS = [
    { id: 'transparent', label: '透明', type: 'transparent' as const },
    { id: 'white', label: '白色', color: '#ffffff' },
    { id: 'black', label: '黑色', color: '#000000' },
    { id: 'navy', label: '深蓝', color: '#1a1a2e' },
    { id: 'grad1', label: '渐变1', colors: ['#667eea', '#764ba2'] },
    { id: 'grad2', label: '渐变2', colors: ['#f093fb', '#f5576c'] },
    { id: 'grad3', label: '渐变3', colors: ['#4facfe', '#00f2fe'] },
  ]

  // ── Init cutout canvas ──────────────────────────────────────
  useEffect(() => {
    if (!imageDataUrl) return
    const img = new Image()
    img.onload = () => {
      cutoutImgRef.current = img
      setCutoutDataUrl(null)
      setHasMask(false)
      initCutoutCanvas(img)
    }
    img.src = imageDataUrl
  }, [imageDataUrl])

  useEffect(() => {
    if (cutoutMode === 'manual' && cutoutImgRef.current) {
      initCutoutCanvas(cutoutImgRef.current)
    }
  }, [cutoutMode])

  const initCutoutCanvas = (img: HTMLImageElement) => {
    const canvas = cutoutCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    if (!canvas || !maskCanvas) return
    const maxW = canvas.parentElement?.clientWidth || 460
    const scale = Math.min(1, maxW / img.naturalWidth)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    canvas.width = w; canvas.height = h
    maskCanvas.width = w; maskCanvas.height = h
    canvas.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, w, h)
    maskCanvas.getContext('2d', { willReadFrequently: true })!.clearRect(0, 0, w, h)
    const sc = document.createElement('canvas'); sc.width = w; sc.height = h
    strokesRef.current = sc
    setHasMask(false)
  }

  // ── Compose canvas render ───────────────────────────────────
  const renderCompose = useCallback(() => {
    const canvas = composeCanvasRef.current
    if (!canvas) return
    const size = Math.min(canvas.parentElement?.clientWidth || 480, 480)
    if (canvas.width !== size) { canvas.width = size; canvas.height = size }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.clearRect(0, 0, size, size)

    // background
    if (bgType === 'transparent') {
      const ts = 14
      for (let y = 0; y < size; y += ts)
        for (let x = 0; x < size; x += ts) {
          ctx.fillStyle = ((x / ts + y / ts) % 2 === 0) ? '#d0d0d0' : '#f0f0f0'
          ctx.fillRect(x, y, ts, ts)
        }
    } else if (bgType === 'color') {
      ctx.fillStyle = bgColor; ctx.fillRect(0, 0, size, size)
    } else if (bgType === 'upload' && composeBgRef.current) {
      ctx.drawImage(composeBgRef.current, 0, 0, size, size)
    }

    // draw items
    items.forEach(item => {
      const img = new Image(); img.src = item.dataUrl
      // items are already loaded since they came from canvas.toDataURL
      ctx.save()
      ctx.translate(item.x, item.y)
      ctx.rotate((item.rotation * Math.PI) / 180)
      ctx.scale(item.flipX ? -item.scale : item.scale, item.scale)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight)
      ctx.restore()

      // selection highlight
      if (item.id === selectedItem) {
        ctx.save()
        ctx.translate(item.x, item.y)
        ctx.rotate((item.rotation * Math.PI) / 180)
        const hw = (img.naturalWidth * item.scale) / 2
        const hh = (img.naturalHeight * item.scale) / 2
        ctx.strokeStyle = 'hsl(262 83% 65%)'; ctx.lineWidth = 2; ctx.setLineDash([6, 3])
        ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
        ctx.setLineDash([])
        ctx.restore()
      }
    })
  }, [bgType, bgColor, items, selectedItem])

  useEffect(() => {
    // Pre-load all item images then render
    if (items.length === 0) { renderCompose(); return }
    let loaded = 0
    items.forEach(item => {
      const img = new Image()
      img.onload = () => { loaded++; if (loaded === items.length) renderCompose() }
      img.src = item.dataUrl
    })
  }, [renderCompose, items])

  useEffect(() => { if (step === 'compose') renderCompose() }, [step, renderCompose])

  // ── Manual paint helpers ────────────────────────────────────
  const getPos = (e: React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const getPosFromClient = (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const paintStroke = (x1: number, y1: number, x2: number, y2: number) => {
    const sc = strokesRef.current; if (!sc) return
    const sctx = sc.getContext('2d', { willReadFrequently: true })!
    sctx.strokeStyle = manualTool === 'keep' ? 'rgba(50,200,100,0.85)' : 'rgba(220,50,50,0.85)'
    sctx.lineWidth = brushSize; sctx.lineCap = 'round'; sctx.lineJoin = 'round'
    sctx.beginPath(); sctx.moveTo(x1, y1); sctx.lineTo(x2, y2); sctx.stroke()
    syncMaskPreview(); setHasMask(true)
  }

  const syncMaskPreview = () => {
    const canvas = cutoutCanvasRef.current
    const maskCanvas = maskCanvasRef.current
    const img = cutoutImgRef.current
    const sc = strokesRef.current
    if (!canvas || !maskCanvas || !img || !sc) return
    const mctx = maskCanvas.getContext('2d', { willReadFrequently: true })!
    mctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height)
    mctx.drawImage(sc, 0, 0)
    // composite: draw img + overlay
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const md = mctx.getImageData(0, 0, canvas.width, canvas.height)
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < md.data.length; i += 4) {
      if (md.data[i + 3] > 20) {
        const isKeep = md.data[i + 1] > md.data[i]
        if (isKeep) {
          id.data[i] = Math.round(id.data[i] * 0.55)
          id.data[i + 1] = Math.min(255, Math.round(id.data[i + 1] * 0.55 + 90))
          id.data[i + 2] = Math.round(id.data[i + 2] * 0.55)
        } else {
          id.data[i] = Math.min(255, Math.round(id.data[i] * 0.55 + 90))
          id.data[i + 1] = Math.round(id.data[i + 1] * 0.55)
          id.data[i + 2] = Math.round(id.data[i + 2] * 0.55)
        }
      }
    }
    ctx.putImageData(id, 0, 0)
  }

  const handleCutoutMouseDown = (e: React.MouseEvent) => {
    if (cutoutMode !== 'manual') return
    isDrawing.current = true
    const pos = getPos(e, cutoutCanvasRef.current!)
    lastPos.current = pos; paintStroke(pos.x, pos.y, pos.x, pos.y)
  }
  const handleCutoutMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current || !lastPos.current || cutoutMode !== 'manual') return
    const pos = getPos(e, cutoutCanvasRef.current!)
    paintStroke(lastPos.current.x, lastPos.current.y, pos.x, pos.y)
    lastPos.current = pos
  }
  const handleCutoutMouseUp = () => { isDrawing.current = false; lastPos.current = null }

  // ── Pinch zoom for cutout canvas (draw mode) ──────────────────
  const cutoutPinch = usePinchZoom({
    onSingleTouchStart: (cx, cy) => {
      if (cutoutMode !== 'manual') return
      isDrawing.current = true
      const pos = getPosFromClient(cx, cy, cutoutCanvasRef.current!)
      lastPos.current = pos; paintStroke(pos.x, pos.y, pos.x, pos.y)
    },
    onSingleTouchMove: (cx, cy) => {
      if (!isDrawing.current || !lastPos.current || cutoutMode !== 'manual') return
      const pos = getPosFromClient(cx, cy, cutoutCanvasRef.current!)
      paintStroke(lastPos.current.x, lastPos.current.y, pos.x, pos.y)
      lastPos.current = pos
    },
    onSingleTouchEnd: () => { isDrawing.current = false; lastPos.current = null },
  })

  // ── Pinch zoom for compose canvas (drag mode) ─────────────────
  const composePinch = usePinchZoom({
    onSingleTouchStart: (cx, cy) => {
      const canvas = composeCanvasRef.current!
      const pos = getPosFromClient(cx, cy, canvas)
      // hit test from top
      let hit: PlacedItem | null = null
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]
        const img = new Image(); img.src = it.dataUrl
        const hw = (img.naturalWidth * it.scale) / 2
        const hh = (img.naturalHeight * it.scale) / 2
        const dx = pos.x - it.x, dy = pos.y - it.y
        if (Math.abs(dx) < hw + 20 && Math.abs(dy) < hh + 20) { hit = it; break }
      }
      if (hit) {
        setSelectedItem(hit.id)
        dragRef.current = { id: hit.id, startMx: pos.x, startMy: pos.y, origX: hit.x, origY: hit.y }
      } else setSelectedItem(null)
    },
    onSingleTouchMove: (cx, cy) => {
      if (!dragRef.current) return
      const canvas = composeCanvasRef.current!
      const pos = getPosFromClient(cx, cy, canvas)
      const { id, startMx, startMy, origX, origY } = dragRef.current
      setItems(prev => prev.map(it => it.id === id ? { ...it, x: origX + pos.x - startMx, y: origY + pos.y - startMy } : it))
    },
    onSingleTouchEnd: () => { dragRef.current = null },
  })

  // ── Auto cutout (flood fill from edges) ─────────────────────
  const runAutoCutout = async () => {
    const img = cutoutImgRef.current; if (!img) return
    setIsProcessing(true)
    await new Promise(r => setTimeout(r, 900))

    const W = img.naturalWidth, H = img.naturalHeight
    const src = document.createElement('canvas'); src.width = W; src.height = H
    const sctx = src.getContext('2d', { willReadFrequently: true })!; sctx.drawImage(img, 0, 0)
    const d = sctx.getImageData(0, 0, W, H).data

    // sample background from corners + edges midpoints
    const samples = [
      [0,0],[W-1,0],[0,H-1],[W-1,H-1],
      [Math.floor(W/2),0],[0,Math.floor(H/2)],[W-1,Math.floor(H/2)],[Math.floor(W/2),H-1]
    ]
    let bgR=0,bgG=0,bgB=0
    samples.forEach(([x,y])=>{const i=(y*W+x)*4;bgR+=d[i];bgG+=d[i+1];bgB+=d[i+2]})
    bgR/=samples.length;bgG/=samples.length;bgB/=samples.length

    const alpha = new Uint8Array(W*H); alpha.fill(255)
    const visited = new Uint8Array(W*H)
    const queue: number[] = []

    const colorDist = (i: number) => {
      const dr=d[i]-bgR,dg=d[i+1]-bgG,db=d[i+2]-bgB
      return Math.sqrt(dr*dr+dg*dg+db*db)
    }

    // Seed edges
    for(let x=0;x<W;x++){queue.push(x);queue.push((H-1)*W+x)}
    for(let y=1;y<H-1;y++){queue.push(y*W);queue.push(y*W+W-1)}

    let qi=0
    while(qi<queue.length){
      const idx=queue[qi++]; if(visited[idx])continue; visited[idx]=1
      const pi=idx*4
      if(colorDist(pi)<=tolerance){
        alpha[idx]=0
        const x=idx%W,y=Math.floor(idx/W)
        if(x>0)queue.push(idx-1)
        if(x<W-1)queue.push(idx+1)
        if(y>0)queue.push(idx-W)
        if(y<H-1)queue.push(idx+W)
      }
    }

    // feather
    const smooth = new Uint8Array(W*H)
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      let s=0,c=0
      for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
        const nx=x+dx,ny=y+dy
        if(nx>=0&&nx<W&&ny>=0&&ny<H){s+=alpha[ny*W+nx];c++}
      }
      smooth[y*W+x]=Math.round(s/c)
    }

    // Build RGBA PNG with transparency
    const out = document.createElement('canvas'); out.width=W; out.height=H
    const octx=out.getContext('2d', { willReadFrequently: true })!
    const imgData=sctx.getImageData(0,0,W,H)
    for(let i=0;i<W*H;i++){imgData.data[i*4+3]=smooth[i]}
    octx.putImageData(imgData,0,0)
    const url=out.toDataURL('image/png')
    setCutoutDataUrl(url)

    // Show on preview canvas
    const canvas=cutoutCanvasRef.current!
    const ctx=canvas.getContext('2d', { willReadFrequently: true })!
    ctx.clearRect(0,0,canvas.width,canvas.height)
    // checkered behind
    const ts=10
    for(let y=0;y<canvas.height;y+=ts) for(let x=0;x<canvas.width;x+=ts){
      ctx.fillStyle=((x/ts+y/ts)%2===0)?'#d0d0d0':'#f0f0f0'; ctx.fillRect(x,y,ts,ts)
    }
    const pv=new Image(); pv.onload=()=>ctx.drawImage(pv,0,0,canvas.width,canvas.height); pv.src=url
    setIsProcessing(false)
  }

  // ── Manual cutout apply ──────────────────────────────────────
  const runManualCutout = async () => {
    const img=cutoutImgRef.current
    const maskCanvas=maskCanvasRef.current
    if(!img||!maskCanvas)return
    setIsProcessing(true)
    await new Promise(r=>setTimeout(r,700))

    const W=img.naturalWidth,H=img.naturalHeight
    const mScaleX=W/maskCanvas.width,mScaleY=H/maskCanvas.height
    const src=document.createElement('canvas');src.width=W;src.height=H
    const sctx=src.getContext('2d', { willReadFrequently: true })!;sctx.drawImage(img,0,0)
    const d=sctx.getImageData(0,0,W,H).data

    const mctx=maskCanvas.getContext('2d', { willReadFrequently: true })!
    const md=mctx.getImageData(0,0,maskCanvas.width,maskCanvas.height).data

    // build keep map
    const keepMap=new Int8Array(W*H) // 1=keep -1=remove
    for(let my=0;my<maskCanvas.height;my++) for(let mx=0;mx<maskCanvas.width;mx++){
      const mi=(my*maskCanvas.width+mx)*4
      if(md[mi+3]>20){
        const isKeep=md[mi+1]>md[mi]
        const ix=Math.round(mx*mScaleX),iy=Math.round(my*mScaleY)
        for(let dy=0;dy<Math.ceil(mScaleY);dy++) for(let dx=0;dx<Math.ceil(mScaleX);dx++){
          const px=Math.min(ix+dx,W-1),py=Math.min(iy+dy,H-1)
          keepMap[py*W+px]=isKeep?1:-1
        }
      }
    }

    // flood fill remove from erase seeds
    const alpha=new Uint8Array(W*H);alpha.fill(255)
    for(let i=0;i<W*H;i++) if(keepMap[i]===-1)alpha[i]=0

    const queue:number[]=[]
    for(let i=0;i<W*H;i++) if(keepMap[i]===-1)queue.push(i)
    const visited=new Uint8Array(W*H)
    const expandTol=45
    let qi=0
    while(qi<queue.length){
      const idx=queue[qi++];if(visited[idx])continue;visited[idx]=1
      const pi=idx*4,x=idx%W,y=Math.floor(idx/W)
      const neighbors=[]
      if(x>0)neighbors.push(idx-1);if(x<W-1)neighbors.push(idx+1)
      if(y>0)neighbors.push(idx-W);if(y<H-1)neighbors.push(idx+W)
      for(const ni of neighbors){
        if(visited[ni]||keepMap[ni]===1)continue
        const npi=ni*4
        const dr=d[pi]-d[npi],dg=d[pi+1]-d[npi+1],db=d[pi+2]-d[npi+2]
        if(Math.sqrt(dr*dr+dg*dg+db*db)<=expandTol){alpha[ni]=0;queue.push(ni)}
      }
    }

    // feather
    const smooth=new Uint8Array(W*H)
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      let s=0,c=0
      for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){
        const nx=x+dx,ny=y+dy
        if(nx>=0&&nx<W&&ny>=0&&ny<H){s+=smooth[ny*W+nx]||alpha[ny*W+nx];c++}
      }
      smooth[y*W+x]=Math.round(s/c)||alpha[y*W+x]
    }

    const out=document.createElement('canvas');out.width=W;out.height=H
    const octx=out.getContext('2d', { willReadFrequently: true })!
    const imgData=sctx.getImageData(0,0,W,H)
    for(let i=0;i<W*H;i++)imgData.data[i*4+3]=smooth[i]
    octx.putImageData(imgData,0,0)
    const url=out.toDataURL('image/png')
    setCutoutDataUrl(url)

    // preview
    const canvas=cutoutCanvasRef.current!
    const ctx=canvas.getContext('2d', { willReadFrequently: true })!
    ctx.clearRect(0,0,canvas.width,canvas.height)
    const ts=10
    for(let y=0;y<canvas.height;y+=ts) for(let x=0;x<canvas.width;x+=ts){
      ctx.fillStyle=((x/ts+y/ts)%2===0)?'#d0d0d0':'#f0f0f0';ctx.fillRect(x,y,ts,ts)
    }
    const pv=new Image();pv.onload=()=>ctx.drawImage(pv,0,0,canvas.width,canvas.height);pv.src=url
    setIsProcessing(false)
  }

  const handleReset = () => {
    setCutoutDataUrl(null);setHasMask(false)
    if(cutoutImgRef.current)initCutoutCanvas(cutoutImgRef.current)
  }

  // ── Compose interactions ─────────────────────────────────────
  const addToCompose = () => {
    if(!cutoutDataUrl)return
    const canvas=composeCanvasRef.current
    const size=canvas?.width||480
    const item:PlacedItem={
      id:Date.now().toString(),
      dataUrl:cutoutDataUrl,
      x:size/2,y:size/2,
      scale:0.4,flipX:false,rotation:0
    }
    setItems(prev=>[...prev,item])
    setSelectedItem(item.id)
    setStep('compose')
  }

  const handleComposeMouseDown=(e:React.MouseEvent)=>{
    const canvas=composeCanvasRef.current!
    const rect=canvas.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width)
    const my=(e.clientY-rect.top)*(canvas.height/rect.height)

    // hit test from top
    let hit:PlacedItem|null=null
    for(let i=items.length-1;i>=0;i--){
      const it=items[i]
      const img=new Image();img.src=it.dataUrl
      const hw=(img.naturalWidth*it.scale)/2
      const hh=(img.naturalHeight*it.scale)/2
      const dx=mx-it.x,dy=my-it.y
      if(Math.abs(dx)<hw+20&&Math.abs(dy)<hh+20){hit=it;break}
    }
    if(hit){
      setSelectedItem(hit.id)
      dragRef.current={id:hit.id,startMx:mx,startMy:my,origX:hit.x,origY:hit.y}
    } else setSelectedItem(null)
  }
  const handleComposeMouseMove=(e:React.MouseEvent)=>{
    if(!dragRef.current)return
    const canvas=composeCanvasRef.current!
    const rect=canvas.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*(canvas.width/rect.width)
    const my=(e.clientY-rect.top)*(canvas.height/rect.height)
    const{id,startMx,startMy,origX,origY}=dragRef.current
    setItems(prev=>prev.map(it=>it.id===id?{...it,x:origX+mx-startMx,y:origY+my-startMy}:it))
  }
  const handleComposeMouseUp=()=>{dragRef.current=null}

  const updateItem=(patch:Partial<PlacedItem>)=>{
    if(!selectedItem)return
    setItems(prev=>prev.map(it=>it.id===selectedItem?{...it,...patch}:it))
  }

  const handleBgUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f)return
    const r=new FileReader()
    r.onload=ev=>{
      const url=ev.target?.result as string
      setBgDataUrl(url);setBgType('upload')
      const img=new Image();img.onload=()=>{composeBgRef.current=img;renderCompose()};img.src=url
    }
    r.readAsDataURL(f)
  }

  // ── Download cutout ──────────────────────────────────────────
  const downloadCutout=()=>{
    if(!cutoutDataUrl)return
    const a=document.createElement('a');a.href=cutoutDataUrl;a.download='cutout.png';a.click()
  }

  // ── Export compose ───────────────────────────────────────────
  const exportCompose=()=>{
    const canvas=composeCanvasRef.current;if(!canvas)return
    const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='compose.png';a.click()
  }

  const selItem=items.find(it=>it.id===selectedItem)

  if(!imageDataUrl){
    return(
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <FileImage className="w-10 h-10 opacity-40"/>
        <p className="text-sm">请先上传图片</p>
      </div>
    )
  }

  return(
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <button onClick={()=>setStep('cutout')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all',
            step==='cutout'?'bg-accent border-brand/50 text-accent-foreground shadow-glow-sm':'bg-surface border-border text-muted-foreground hover:text-foreground')}>
          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',step==='cutout'?'bg-brand text-white':'bg-surface-overlay text-muted-foreground')}>1</div>
          抠图
        </button>
        <div className="w-6 h-px bg-border flex-shrink-0"/>
        <button onClick={()=>cutoutDataUrl&&setStep('compose')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all',
            step==='compose'?'bg-accent border-brand/50 text-accent-foreground shadow-glow-sm':cutoutDataUrl?'bg-surface border-border text-muted-foreground hover:text-foreground':'bg-surface border-border text-muted-foreground/40 cursor-not-allowed')}>
          <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',step==='compose'?'bg-brand text-white':cutoutDataUrl?'bg-surface-overlay text-muted-foreground':'bg-surface-overlay text-muted-foreground/40')}>2</div>
          合成拼图
        </button>
      </div>

      {/* ══ STEP 1: CUTOUT ══════════════════════════════════════ */}
      {step==='cutout'&&(
        <>
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-surface rounded-lg">
            <button onClick={()=>{setCutoutMode('auto');handleReset()}}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 rounded-md text-xs font-medium transition-all min-h-[40px] touch-manipulation active:scale-95',
                cutoutMode==='auto'?'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm':'text-muted-foreground hover:text-foreground')}>
              <Wand2 className="w-3.5 h-3.5"/>自动抠图
            </button>
            <button onClick={()=>{setCutoutMode('manual');handleReset()}}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 rounded-md text-xs font-medium transition-all min-h-[40px] touch-manipulation active:scale-95',
                cutoutMode==='manual'?'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm':'text-muted-foreground hover:text-foreground')}>
              <Brush className="w-3.5 h-3.5"/>手动涂抹
            </button>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-2 p-3 bg-accent/25 rounded-lg border border-brand/20">
            <Info className="w-4 h-4 text-brand mt-0.5 flex-shrink-0"/>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {cutoutMode==='auto'
                ?'适合纯色/接近纯色背景。调节容差后点击"开始抠图"，抠好后可直接进入拼图。'
                :'用绿色画笔涂抹要保留的主体，红色画笔涂抹要去除的背景，再点击"生成抠图"。'}
            </p>
          </div>

          {/* Auto: tolerance */}
          {cutoutMode==='auto'&&(
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs text-muted-foreground">背景容差</span>
                <span className="text-xs font-semibold text-brand">{tolerance}</span>
              </div>
              <input type="range" min="5" max="120" value={tolerance}
                onChange={e=>setTolerance(Number(e.target.value))}
                className="w-full h-2 appearance-none rounded-full cursor-pointer slider-thumb touch-manipulation"
                style={{background:`linear-gradient(to right,hsl(262 83% 65%) ${((tolerance-5)/115)*100}%,hsl(var(--border)) ${((tolerance-5)/115)*100}%)`}}/>
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>精细</span><span>宽松</span></div>
            </div>
          )}

          {/* Manual: tools */}
          {cutoutMode==='manual'&&(
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={()=>setManualTool('keep')}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 rounded-lg text-xs font-medium border transition-all min-h-[40px] touch-manipulation active:scale-95',
                    manualTool==='keep'?'bg-emerald-500/20 border-emerald-500/50 text-emerald-400':'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                  <Brush className="w-3.5 h-3.5"/>保留主体
                </button>
                <button onClick={()=>setManualTool('erase')}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2.5 sm:py-2 rounded-lg text-xs font-medium border transition-all min-h-[40px] touch-manipulation active:scale-95',
                    manualTool==='erase'?'bg-red-500/20 border-red-500/50 text-red-400':'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                  <EraserIcon className="w-3.5 h-3.5"/>去除背景
                </button>
                <Button variant="ghost" size="icon-sm" onClick={handleReset}><RotateCcw className="w-3.5 h-3.5"/></Button>
              </div>
              <div>
                <div className="flex justify-between mb-1.5"><span className="text-xs text-muted-foreground">画笔大小</span><span className="text-xs font-semibold text-brand">{brushSize}px</span></div>
                <input type="range" min="5" max="60" value={brushSize} onChange={e=>setBrushSize(Number(e.target.value))}
                  className="w-full h-2 appearance-none rounded-full cursor-pointer slider-thumb touch-manipulation"
                  style={{background:`linear-gradient(to right,hsl(262 83% 65%) ${((brushSize-5)/55)*100}%,hsl(var(--border)) ${((brushSize-5)/55)*100}%)`}}/>
              </div>
            </div>
          )}

          {/* Canvas preview */}
          <div ref={cutoutPinch.viewportRef} className="relative rounded-xl overflow-hidden border border-border checkered-bg">
            <div style={cutoutPinch.wrapperStyle}>
              <canvas ref={cutoutCanvasRef}
                className={cn('w-full block select-none',cutoutMode==='manual'?'cursor-crosshair':'cursor-default')}
                style={{ touchAction: 'none' }}
                onMouseDown={handleCutoutMouseDown} onMouseMove={handleCutoutMouseMove}
                onMouseUp={handleCutoutMouseUp} onMouseLeave={handleCutoutMouseUp}
                {...cutoutPinch.handlers}/>
              <canvas ref={maskCanvasRef} className="hidden"/>
              {cutoutMode==='manual'&&(
                <div className="absolute bottom-2 left-2 flex gap-2 pointer-events-none">
                  <span className="text-[10px] bg-emerald-500/80 text-white px-1.5 py-0.5 rounded">绿=保留</span>
                  <span className="text-[10px] bg-red-500/80 text-white px-1.5 py-0.5 rounded">红=去除</span>
                </div>
              )}
            </div>
            <ZoomControls zoom={cutoutPinch.zoom} onZoomIn={() => cutoutPinch.setZoom(z => z + 0.25)} onZoomOut={() => cutoutPinch.setZoom(z => z - 0.25)} onReset={cutoutPinch.resetView} />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button className="flex-1"
              onClick={cutoutMode==='auto'?runAutoCutout:runManualCutout}
              disabled={isProcessing||(cutoutMode==='manual'&&!hasMask)}>
              {isProcessing?<><Loader2 className="w-4 h-4 animate-spin"/>处理中...</>
                :<><Wand2 className="w-4 h-4"/>{cutoutMode==='auto'?'开始抠图':'生成抠图'}</>}
            </Button>
            {cutoutDataUrl&&(<>
              <Button variant="secondary" size="sm" onClick={downloadCutout} title="下载PNG">
                <Download className="w-4 h-4"/>PNG
              </Button>
              <Button variant="secondary" size="sm" onClick={addToCompose}>
                <Layers className="w-4 h-4"/>去拼图
              </Button>
            </>)}
          </div>

          {cutoutDataUrl&&(
            <p className="text-xs text-center text-muted-foreground animate-fade-in">
              ✅ 抠图完成！点击"去拼图"将其合成到其他图片上
            </p>
          )}
        </>
      )}

      {/* ══ STEP 2: COMPOSE ═════════════════════════════════════ */}
      {step==='compose'&&(
        <>
          {/* Background picker */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">选择画布背景</p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {BG_PRESETS.map(b=>(
                <button key={b.id} onClick={()=>{
                  if(b.type==='transparent'){setBgType('transparent')}
                  else if('color' in b&&b.color){setBgType('color');setBgColor(b.color)}
                  else if('colors' in b&&b.colors){
                    // create gradient via off-screen canvas
                    const tmp=document.createElement('canvas');tmp.width=2;tmp.height=2
                    setBgType('color');setBgColor((b as {colors:string[]}).colors[0])
                  }
                }}
                  className={cn('relative h-10 rounded-lg overflow-hidden border-2 transition-all',
                    bgType!=='upload'&&((b.type==='transparent'&&bgType==='transparent')||(b.id!=='transparent'&&'color' in b&&b.color===bgColor))
                      ?'border-brand shadow-glow-sm':'border-border hover:border-brand/40')}
                  style={
                    b.type==='transparent'?{}:
                    'colors' in b&&b.colors?{background:`linear-gradient(135deg,${(b.colors as string[]).join(',')})`}:
                    'color' in b&&b.color?{backgroundColor:b.color}:{}
                  }>
                  {b.type==='transparent'&&<div className="absolute inset-0 checkered-bg"/>}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn('text-[10px] font-medium drop-shadow',
                      b.type==='transparent'||('color' in b&&b.color==='#ffffff')?'text-gray-500':'text-white')}>
                      {b.label}
                    </span>
                  </div>
                </button>
              ))}
              {/* upload bg */}
              <label className={cn('relative h-10 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all',
                bgType==='upload'?'border-brand shadow-glow-sm bg-accent':'border-dashed border-border hover:border-brand/40 bg-surface')}>
                <input type="file" accept="image/*" className="sr-only" onChange={handleBgUpload}/>
                <div className="flex flex-col items-center gap-0.5">
                  <Upload className="w-3 h-3 text-muted-foreground"/>
                  <span className="text-[10px] text-muted-foreground">上传背景</span>
                </div>
              </label>
            </div>
            {bgType==='color'&&(
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={e=>setBgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"/>
                <span className="text-xs text-muted-foreground">自定义颜色</span>
              </div>
            )}
          </div>

          {/* Compose canvas */}
          <div ref={composePinch.viewportRef} className="relative rounded-xl overflow-hidden border border-border">
            <div style={composePinch.wrapperStyle}>
              <canvas ref={composeCanvasRef} className="w-full block cursor-move select-none"
                style={{ touchAction: 'none' }}
                onMouseDown={handleComposeMouseDown} onMouseMove={handleComposeMouseMove}
                onMouseUp={handleComposeMouseUp} onMouseLeave={handleComposeMouseUp}
                {...composePinch.handlers}/>
            </div>
            {items.length===0&&(
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-muted-foreground bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm">
                  点击"添加抠图"将抠好的图片放到这里
                </p>
              </div>
            )}
            <ZoomControls zoom={composePinch.zoom} onZoomIn={() => composePinch.setZoom(z => z + 0.25)} onZoomOut={() => composePinch.setZoom(z => z - 0.25)} onReset={composePinch.resetView} />
          </div>

          {/* Add cutout button */}
          <Button variant="outline" className="w-full" onClick={()=>{
            if(cutoutDataUrl){
              const canvas=composeCanvasRef.current
              const size=canvas?.width||480
              const item:PlacedItem={
                id:Date.now().toString(),dataUrl:cutoutDataUrl,
                x:size/2+Math.random()*60-30,y:size/2+Math.random()*60-30,
                scale:0.4,flipX:false,rotation:0
              }
              setItems(prev=>[...prev,item]);setSelectedItem(item.id)
            } else setStep('cutout')
          }}>
            <Plus className="w-4 h-4"/>添加抠图到画面
          </Button>

          {/* Selected item controls */}
          {selItem&&(
            <div className="p-3 bg-accent/20 rounded-xl border border-brand/20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">调整选中元素</span>
                <Button variant="ghost" size="icon-sm" onClick={()=>{setItems(p=>p.filter(it=>it.id!==selectedItem));setSelectedItem(null)}}
                  className="text-destructive hover:text-destructive"><Trash2 className="w-3.5 h-3.5"/></Button>
              </div>
              <div>
                <div className="flex justify-between mb-1.5"><span className="text-xs text-muted-foreground">大小</span>
                  <span className="text-xs font-semibold text-brand">{Math.round(selItem.scale*100)}%</span></div>
                <input type="range" min="10" max="200" value={Math.round(selItem.scale*100)}
                  onChange={e=>updateItem({scale:Number(e.target.value)/100})}
                  className="w-full h-2 appearance-none rounded-full cursor-pointer slider-thumb touch-manipulation"
                  style={{background:`linear-gradient(to right,hsl(262 83% 65%) ${(selItem.scale*100-10)/190*100}%,hsl(var(--border)) ${(selItem.scale*100-10)/190*100}%)`}}/>
              </div>
              <div>
                <div className="flex justify-between mb-1.5"><span className="text-xs text-muted-foreground">旋转</span>
                  <span className="text-xs font-semibold text-brand">{selItem.rotation}°</span></div>
                <input type="range" min="-180" max="180" value={selItem.rotation}
                  onChange={e=>updateItem({rotation:Number(e.target.value)})}
                  className="w-full h-2 appearance-none rounded-full cursor-pointer slider-thumb touch-manipulation"
                  style={{background:`linear-gradient(to right,hsl(var(--border)) 0%,hsl(262 83% 65%) 50%,hsl(var(--border)) 100%)`}}/>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>updateItem({flipX:!selItem.flipX})}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-muted-foreground hover:text-foreground transition-all">
                  <FlipHorizontal className="w-3.5 h-3.5"/>水平翻转
                </button>
                <button onClick={()=>updateItem({rotation:0,scale:0.4,flipX:false})}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-muted-foreground hover:text-foreground transition-all">
                  <RotateIcon className="w-3.5 h-3.5"/>重置
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          {items.length>0&&(
            <div className="flex flex-wrap gap-1.5">
              {items.map((it,i)=>(
                <button key={it.id} onClick={()=>setSelectedItem(it.id===selectedItem?null:it.id)}
                  className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all',
                    it.id===selectedItem?'bg-accent border-brand/40 text-accent-foreground':'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                  <img src={it.dataUrl} alt="" className="w-5 h-5 object-contain"/>
                  图层 {i+1}
                </button>
              ))}
            </div>
          )}

          {/* Export */}
          <Button className="w-full" onClick={exportCompose} disabled={items.length===0}>
            <Download className="w-4 h-4"/>导出合成图片
          </Button>
        </>
      )}
    </div>
  )
}
