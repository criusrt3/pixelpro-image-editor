import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Download, FileImage, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AvatarPanelProps {
  imageDataUrl: string | null
}

// ── Frame shapes ──────────────────────────────────────────────
type FrameShape = {
  id: string
  label: string
  icon: string
  clip: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void
}

const FRAME_SHAPES: FrameShape[] = [
  {
    id: 'circle', label: '圆形', icon: '⬤',
    clip: (ctx, cx, cy, r) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
    }
  },
  {
    id: 'square', label: '方形', icon: '■',
    clip: (ctx, cx, cy, r) => {
      ctx.beginPath(); ctx.rect(cx - r, cy - r, r * 2, r * 2)
    }
  },
  {
    id: 'rounded', label: '圆角', icon: '▪',
    clip: (ctx, cx, cy, r) => {
      const x = cx - r, y = cy - r, s = r * 2, rd = r * 0.3
      ctx.beginPath()
      ctx.moveTo(x + rd, y)
      ctx.lineTo(x + s - rd, y); ctx.quadraticCurveTo(x + s, y, x + s, y + rd)
      ctx.lineTo(x + s, y + s - rd); ctx.quadraticCurveTo(x + s, y + s, x + s - rd, y + s)
      ctx.lineTo(x + rd, y + s); ctx.quadraticCurveTo(x, y + s, x, y + s - rd)
      ctx.lineTo(x, y + rd); ctx.quadraticCurveTo(x, y, x + rd, y)
      ctx.closePath()
    }
  },
  {
    id: 'hexagon', label: '六边形', icon: '⬡',
    clip: (ctx, cx, cy, r) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      }
      ctx.closePath()
    }
  },
  {
    id: 'star', label: '星形', icon: '★',
    clip: (ctx, cx, cy, r) => {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2
        const rr = i % 2 === 0 ? r : r * 0.42
        i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
                : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
      }
      ctx.closePath()
    }
  },
  {
    id: 'heart', label: '爱心', icon: '♥',
    clip: (ctx, cx, cy, r) => {
      const s = r * 0.9
      ctx.beginPath()
      ctx.moveTo(cx, cy + s * 0.6)
      ctx.bezierCurveTo(cx - s * 1.3, cy - s * 0.3, cx - s * 1.3, cy - s * 1.1, cx, cy - s * 0.3)
      ctx.bezierCurveTo(cx + s * 1.3, cy - s * 1.1, cx + s * 1.3, cy - s * 0.3, cx, cy + s * 0.6)
      ctx.closePath()
    }
  },
  {
    id: 'diamond', label: '菱形', icon: '◆',
    clip: (ctx, cx, cy, r) => {
      ctx.beginPath()
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.75, cy)
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r * 0.75, cy)
      ctx.closePath()
    }
  },
  {
    id: 'shield', label: '盾牌', icon: '🛡',
    clip: (ctx, cx, cy, r) => {
      ctx.beginPath()
      ctx.moveTo(cx - r, cy - r * 0.8)
      ctx.lineTo(cx + r, cy - r * 0.8)
      ctx.lineTo(cx + r, cy)
      ctx.quadraticCurveTo(cx + r, cy + r, cx, cy + r)
      ctx.quadraticCurveTo(cx - r, cy + r, cx - r, cy)
      ctx.closePath()
    }
  },
]

// ── Border styles ─────────────────────────────────────────────
type BorderStyle = {
  id: string; label: string
  draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, size: number) => void
}

const BORDER_STYLES: BorderStyle[] = [
  { id: 'none', label: '无边框', draw: () => {} },
  {
    id: 'solid', label: '实线', draw: (ctx, cx, cy, r, size) => {
      ctx.strokeStyle = ctx.strokeStyle; ctx.lineWidth = size
      ctx.stroke()
    }
  },
  {
    id: 'double', label: '双线', draw: (ctx, cx, cy, r, size) => {
      ctx.lineWidth = size * 0.4; ctx.stroke()
    }
  },
  {
    id: 'dashed', label: '虚线', draw: (ctx, cx, cy, r, size) => {
      ctx.setLineDash([size * 2, size]); ctx.lineWidth = size; ctx.stroke(); ctx.setLineDash([])
    }
  },
  {
    id: 'dotted', label: '点线', draw: (ctx, cx, cy, r, size) => {
      ctx.setLineDash([size * 0.5, size * 1.5]); ctx.lineWidth = size * 0.8; ctx.stroke(); ctx.setLineDash([])
    }
  },
  {
    id: 'glow', label: '发光', draw: (ctx, cx, cy, r, size) => {
      ctx.shadowColor = ctx.strokeStyle as string
      ctx.shadowBlur = size * 3; ctx.lineWidth = size * 0.8; ctx.stroke()
      ctx.shadowBlur = 0
    }
  },
]

// ── Decorations drawn via Canvas ──────────────────────────────
type Decoration = {
  id: string; label: string; emoji: string
  draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void
}

const DECORATIONS: Decoration[] = [
  {
    id: 'none', label: '无装饰', emoji: '🚫',
    draw: () => {}
  },
  {
    id: 'crown', label: '皇冠', emoji: '👑',
    draw: (ctx, cx, cy, r) => {
      const bw = r * 1.4, bh = r * 0.55, bx = cx - bw / 2, by = cy - r - bh + r * 0.1
      // crown body
      const grad = ctx.createLinearGradient(bx, by, bx, by + bh)
      grad.addColorStop(0, '#FFD700'); grad.addColorStop(0.5, '#FFA500'); grad.addColorStop(1, '#FF8C00')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(bx, by + bh)
      ctx.lineTo(bx, by + bh * 0.5)
      ctx.lineTo(bx + bw * 0.2, by + bh * 0.7)
      ctx.lineTo(bx + bw * 0.35, by)
      ctx.lineTo(bx + bw * 0.5, by + bh * 0.5)
      ctx.lineTo(bx + bw * 0.65, by)
      ctx.lineTo(bx + bw * 0.8, by + bh * 0.7)
      ctx.lineTo(bx + bw, by + bh * 0.5)
      ctx.lineTo(bx + bw, by + bh)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#B8860B'; ctx.lineWidth = r * 0.025; ctx.stroke()
      // gems
      const gems = [
        { x: bx + bw * 0.35, y: by + r * 0.05, c: '#FF4444' },
        { x: bx + bw * 0.65, y: by + r * 0.05, c: '#44AAFF' },
        { x: bx + bw * 0.5, y: by + bh * 0.45, c: '#44FF44' },
      ]
      gems.forEach(g => {
        ctx.beginPath(); ctx.arc(g.x, g.y, r * 0.06, 0, Math.PI * 2)
        ctx.fillStyle = g.c; ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = r * 0.015; ctx.stroke()
      })
    }
  },
  {
    id: 'antlers', label: '鹿角', emoji: '🦌',
    draw: (ctx, cx, cy, r) => {
      const ty = cy - r + r * 0.1
      ctx.strokeStyle = '#8B5E3C'; ctx.lineWidth = r * 0.08; ctx.lineCap = 'round'
      // left antler
      ctx.beginPath(); ctx.moveTo(cx - r * 0.3, ty)
      ctx.quadraticCurveTo(cx - r * 0.6, ty - r * 0.5, cx - r * 0.7, ty - r * 0.9); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - r * 0.5, ty - r * 0.35)
      ctx.quadraticCurveTo(cx - r * 0.85, ty - r * 0.45, cx - r * 1.0, ty - r * 0.3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx - r * 0.62, ty - r * 0.6)
      ctx.quadraticCurveTo(cx - r * 0.55, ty - r * 0.85, cx - r * 0.45, ty - r); ctx.stroke()
      // right antler
      ctx.beginPath(); ctx.moveTo(cx + r * 0.3, ty)
      ctx.quadraticCurveTo(cx + r * 0.6, ty - r * 0.5, cx + r * 0.7, ty - r * 0.9); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + r * 0.5, ty - r * 0.35)
      ctx.quadraticCurveTo(cx + r * 0.85, ty - r * 0.45, cx + r * 1.0, ty - r * 0.3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + r * 0.62, ty - r * 0.6)
      ctx.quadraticCurveTo(cx + r * 0.55, ty - r * 0.85, cx + r * 0.45, ty - r); ctx.stroke()
      // small flowers on tips
      const tips = [
        [cx - r * 0.7, ty - r * 0.9], [cx - r * 1.0, ty - r * 0.3],
        [cx + r * 0.7, ty - r * 0.9], [cx + r * 1.0, ty - r * 0.3],
      ]
      tips.forEach(([fx, fy]) => {
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI * 2 / 5) * i
          ctx.beginPath(); ctx.arc(fx + Math.cos(a) * r * 0.05, fy + Math.sin(a) * r * 0.05, r * 0.04, 0, Math.PI * 2)
          ctx.fillStyle = i % 2 === 0 ? '#FFB7C5' : '#FF80AB'; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(fx, fy, r * 0.03, 0, Math.PI * 2)
        ctx.fillStyle = '#FFD700'; ctx.fill()
      })
    }
  },
  {
    id: 'cat_ears', label: '猫耳', emoji: '🐱',
    draw: (ctx, cx, cy, r) => {
      const ty = cy - r + r * 0.15
      ;[[-1, '#FFB6C1'], [1, '#FFB6C1']].forEach(([dir, col]) => {
        const d = dir as number, bx = cx + d * r * 0.55
        ctx.beginPath()
        ctx.moveTo(bx - d * r * 0.28, ty + r * 0.05)
        ctx.lineTo(bx + d * r * 0.1, ty - r * 0.55)
        ctx.lineTo(bx + d * r * 0.38, ty + r * 0.05)
        ctx.closePath()
        ctx.fillStyle = col as string; ctx.fill()
        ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = r * 0.025; ctx.stroke()
        // inner ear
        ctx.beginPath()
        ctx.moveTo(bx - d * r * 0.16, ty + r * 0.02)
        ctx.lineTo(bx + d * r * 0.08, ty - r * 0.35)
        ctx.lineTo(bx + d * r * 0.24, ty + r * 0.02)
        ctx.closePath()
        ctx.fillStyle = '#FF1493'; ctx.fill()
      })
    }
  },
  {
    id: 'halo', label: '光环', emoji: '😇',
    draw: (ctx, cx, cy, r) => {
      const ry = cy - r - r * 0.05
      const grad = ctx.createRadialGradient(cx, ry, r * 0.3, cx, ry, r * 0.65)
      grad.addColorStop(0, 'rgba(255,220,50,0.9)'); grad.addColorStop(1, 'rgba(255,180,0,0.2)')
      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = r * 0.1
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = r * 0.3
      ctx.beginPath()
      ctx.ellipse(cx, ry, r * 0.6, r * 0.18, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
  },
  {
    id: 'flowers', label: '花环', emoji: '🌸',
    draw: (ctx, cx, cy, r) => {
      const count = 12
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 / count) * i
        const fx = cx + Math.cos(a) * (r + r * 0.14)
        const fy = cy + Math.sin(a) * (r + r * 0.14)
        const colors = ['#FFB7C5', '#FF80AB', '#FF6B9D', '#C890D4', '#FFD700', '#98FB98']
        const col = colors[i % colors.length]
        for (let p = 0; p < 5; p++) {
          const pa = (Math.PI * 2 / 5) * p
          ctx.beginPath()
          ctx.arc(fx + Math.cos(pa) * r * 0.07, fy + Math.sin(pa) * r * 0.07, r * 0.065, 0, Math.PI * 2)
          ctx.fillStyle = col; ctx.fill()
        }
        ctx.beginPath(); ctx.arc(fx, fy, r * 0.045, 0, Math.PI * 2)
        ctx.fillStyle = '#FFD700'; ctx.fill()
      }
    }
  },
  {
    id: 'wings', label: '翅膀', emoji: '🦋',
    draw: (ctx, cx, cy, r) => {
      ;[[-1, '#A78BFA'], [1, '#60A5FA']].forEach(([dir, col]) => {
        const d = dir as number
        const wx = cx + d * r * 0.1
        const wy = cy
        ctx.beginPath()
        ctx.moveTo(wx, wy)
        ctx.bezierCurveTo(
          wx + d * r * 0.5, wy - r * 0.8,
          wx + d * r * 1.2, wy - r * 0.6,
          wx + d * r * 1.1, wy
        )
        ctx.bezierCurveTo(
          wx + d * r * 1.2, wy + r * 0.5,
          wx + d * r * 0.5, wy + r * 0.7,
          wx, wy
        )
        ctx.fillStyle = col + 'BB'; ctx.fill()
        ctx.strokeStyle = col as string; ctx.lineWidth = r * 0.03; ctx.stroke()
      })
    }
  },
  {
    id: 'bow', label: '蝴蝶结', emoji: '🎀',
    draw: (ctx, cx, cy, r) => {
      const bx = cx, by = cy - r + r * 0.06
      const col = '#FF69B4'
      ;[-1, 1].forEach(d => {
        ctx.beginPath()
        ctx.moveTo(bx, by)
        ctx.bezierCurveTo(bx + d * r * 0.1, by - r * 0.28, bx + d * r * 0.55, by - r * 0.22, bx + d * r * 0.5, by)
        ctx.bezierCurveTo(bx + d * r * 0.55, by + r * 0.22, bx + d * r * 0.1, by + r * 0.28, bx, by)
        ctx.closePath()
        ctx.fillStyle = col; ctx.fill()
        ctx.strokeStyle = '#FF1493'; ctx.lineWidth = r * 0.02; ctx.stroke()
      })
      ctx.beginPath(); ctx.arc(bx, by, r * 0.1, 0, Math.PI * 2)
      ctx.fillStyle = '#FF1493'; ctx.fill()
    }
  },
  {
    id: 'sunglasses', label: '墨镜', emoji: '😎',
    draw: (ctx, cx, cy, r) => {
      const ey = cy - r * 0.05
      const eyeR = r * 0.22
      ;[-1, 1].forEach(d => {
        const ex = cx + d * r * 0.3
        ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fill()
        ctx.strokeStyle = '#444'; ctx.lineWidth = r * 0.04; ctx.stroke()
        // shine
        ctx.beginPath(); ctx.arc(ex - eyeR * 0.3, ey - eyeR * 0.3, eyeR * 0.2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill()
      })
      // bridge
      ctx.beginPath()
      ctx.moveTo(cx - r * 0.3 + eyeR, ey); ctx.lineTo(cx + r * 0.3 - eyeR, ey)
      ctx.strokeStyle = '#444'; ctx.lineWidth = r * 0.04; ctx.stroke()
      // arms
      ;[-1, 1].forEach(d => {
        ctx.beginPath()
        ctx.moveTo(cx + d * (r * 0.3 + eyeR), ey)
        ctx.lineTo(cx + d * r * 0.98, ey - r * 0.05)
        ctx.strokeStyle = '#444'; ctx.lineWidth = r * 0.04; ctx.stroke()
      })
    }
  },
  {
    id: 'stars_scatter', label: '星光', emoji: '✨',
    draw: (ctx, cx, cy, r) => {
      const positions = [
        [-0.9, -0.8], [0.9, -0.85], [-1.05, 0.2], [1.05, 0.15],
        [-0.7, -1.1], [0.65, -1.05], [0, -1.2], [-0.5, 0.95], [0.55, 0.9],
      ]
      positions.forEach(([dx, dy], i) => {
        const sx = cx + dx * r, sy = cy + dy * r
        const sr = r * (0.06 + (i % 3) * 0.03)
        const col = ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98'][i % 4]
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(Math.PI / 4)
        ctx.fillStyle = col
        ctx.shadowColor = col; ctx.shadowBlur = sr * 3
        ctx.beginPath()
        for (let j = 0; j < 4; j++) {
          const a = (Math.PI / 2) * j
          ctx.lineTo(Math.cos(a) * sr * 2.2, Math.sin(a) * sr * 2.2)
          ctx.lineTo(Math.cos(a + Math.PI / 4) * sr, Math.sin(a + Math.PI / 4) * sr)
        }
        ctx.closePath(); ctx.fill()
        ctx.shadowBlur = 0
        ctx.restore()
      })
    }
  },
]

// ── Border color presets ──────────────────────────────────────
const BORDER_COLORS = [
  '#FFFFFF', '#000000', '#FFD700', '#FF69B4', '#4FC3F7',
  '#A78BFA', '#34D399', '#FB923C', '#F87171', '#E879F9',
]

// ── Gradient border presets ───────────────────────────────────
const GRADIENT_BORDERS = [
  { id: 'none', label: '无', colors: [] },
  { id: 'rainbow', label: '彩虹', colors: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'] },
  { id: 'sunset', label: '夕阳', colors: ['#FF6B6B', '#FFA500', '#FFD700'] },
  { id: 'ocean', label: '海洋', colors: ['#00C6FF', '#0072FF'] },
  { id: 'rose', label: '玫瑰', colors: ['#FF69B4', '#C890D4', '#FF6B9D'] },
  { id: 'forest', label: '森林', colors: ['#56AB2F', '#A8E6CF', '#3D7A3D'] },
]

// ── Background fills ──────────────────────────────────────────
const BG_OPTIONS = [
  { id: 'none', label: '透明', style: 'checkered-bg' },
  { id: 'white', label: '白色', color: '#FFFFFF' },
  { id: 'black', label: '黑色', color: '#000000' },
  { id: 'pink', label: '粉色', color: '#FFB7C5' },
  { id: 'blue', label: '蓝色', color: '#438EDB' },
  { id: 'red', label: '证件红', color: '#CC0001' },
  { id: 'grad_purple', label: '紫渐变', colors: ['#667eea', '#764ba2'] },
  { id: 'grad_sunset', label: '橙渐变', colors: ['#f093fb', '#f5576c'] },
]

// ── Main Component ────────────────────────────────────────────
export default function AvatarPanel({ imageDataUrl }: AvatarPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [selectedShape, setSelectedShape] = useState('circle')
  const [selectedDeco, setSelectedDeco] = useState('none')
  const [selectedBorder, setSelectedBorder] = useState('solid')
  const [borderColor, setBorderColor] = useState('#FFD700')
  const [borderGrad, setBorderGrad] = useState('none')
  const [borderWidth, setBorderWidth] = useState(6)
  const [selectedBg, setSelectedBg] = useState('white')
  const [zoom, setZoom] = useState(100)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const [outputSize, setOutputSize] = useState(600)
  const [activeSection, setActiveSection] = useState<'shape' | 'deco' | 'border' | 'bg'>('shape')

  useEffect(() => {
    if (!imageDataUrl) return
    const img = new Image()
    img.onload = () => { imgRef.current = img; render() }
    img.src = imageDataUrl
  }, [imageDataUrl])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const size = Math.min(canvas.parentElement?.clientWidth || 400, 400)
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')!
    const cx = size / 2, cy = size / 2
    const r = size * 0.38

    ctx.clearRect(0, 0, size, size)

    // 1. Background
    const bgOpt = BG_OPTIONS.find(b => b.id === selectedBg)
    if (bgOpt?.color) {
      ctx.fillStyle = bgOpt.color; ctx.fillRect(0, 0, size, size)
    } else if (bgOpt && 'colors' in bgOpt && bgOpt.colors) {
      const g = ctx.createLinearGradient(0, 0, size, size)
      const cols = bgOpt.colors as string[]
      cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c))
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
    } else if (bgOpt?.id === 'none') {
      // checkered
      const ts = 12
      for (let y = 0; y < size; y += ts) {
        for (let x = 0; x < size; x += ts) {
          ctx.fillStyle = ((x / ts + y / ts) % 2 === 0) ? '#e0e0e0' : '#f8f8f8'
          ctx.fillRect(x, y, ts, ts)
        }
      }
    }

    // 2. Clip photo into shape
    const shape = FRAME_SHAPES.find(s => s.id === selectedShape)!
    ctx.save()
    shape.clip(ctx, cx, cy, r)
    ctx.clip()

    // pan + zoom
    const scale = zoom / 100
    const iw = img.naturalWidth, ih = img.naturalHeight
    const fit = Math.max((r * 2) / iw, (r * 2) / ih) * scale
    const dw = iw * fit, dh = ih * fit
    const dx = cx - dw / 2 + panX, dy = cy - dh / 2 + panY
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.restore()

    // 3. Border
    if (selectedBorder !== 'none' && borderWidth > 0) {
      const bStyle = BORDER_STYLES.find(b => b.id === selectedBorder)!
      shape.clip(ctx, cx, cy, r)
      const gOpt = GRADIENT_BORDERS.find(g => g.id === borderGrad)
      if (gOpt && gOpt.colors.length > 0) {
        const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
        gOpt.colors.forEach((c, i) => g.addColorStop(i / (gOpt.colors.length - 1), c))
        ctx.strokeStyle = g
      } else {
        ctx.strokeStyle = borderColor
      }
      bStyle.draw(ctx, cx, cy, r, borderWidth * (size / 400))
    }

    // 4. Decoration
    const deco = DECORATIONS.find(d => d.id === selectedDeco)!
    deco.draw(ctx, cx, cy, r)

  }, [selectedShape, selectedDeco, selectedBorder, borderColor, borderGrad, borderWidth, selectedBg, zoom, panX, panY])

  useEffect(() => { render() }, [render])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: panX, py: panY }
  }
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart.current) return
    setPanX(dragStart.current.px + e.clientX - dragStart.current.mx)
    setPanY(dragStart.current.py + e.clientY - dragStart.current.my)
  }
  const handleCanvasMouseUp = () => { setIsDragging(false) }

  const handleDownload = () => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    // render at high res
    const out = document.createElement('canvas')
    out.width = outputSize; out.height = outputSize
    const ctx = out.getContext('2d')!
    const size = outputSize
    const cx = size / 2, cy = size / 2
    const r = size * 0.38
    const ratio = outputSize / canvas.width

    ctx.clearRect(0, 0, size, size)
    // bg
    const bgOpt = BG_OPTIONS.find(b => b.id === selectedBg)
    if (bgOpt?.color) { ctx.fillStyle = bgOpt.color; ctx.fillRect(0, 0, size, size) }
    else if (bgOpt && 'colors' in bgOpt && bgOpt.colors) {
      const g = ctx.createLinearGradient(0, 0, size, size)
      const cols = bgOpt.colors as string[]
      cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c))
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size)
    }
    // clip + draw
    const shape = FRAME_SHAPES.find(s => s.id === selectedShape)!
    ctx.save(); shape.clip(ctx, cx, cy, r); ctx.clip()
    const scale = zoom / 100
    const fit = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight) * scale
    const dw = img.naturalWidth * fit, dh = img.naturalHeight * fit
    ctx.drawImage(img, cx - dw / 2 + panX * ratio, cy - dh / 2 + panY * ratio, dw, dh)
    ctx.restore()
    // border
    if (selectedBorder !== 'none' && borderWidth > 0) {
      const bStyle = BORDER_STYLES.find(b => b.id === selectedBorder)!
      shape.clip(ctx, cx, cy, r)
      const gOpt = GRADIENT_BORDERS.find(g => g.id === borderGrad)
      if (gOpt && gOpt.colors.length > 0) {
        const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
        gOpt.colors.forEach((c, i) => g.addColorStop(i / (gOpt.colors.length - 1), c))
        ctx.strokeStyle = g
      } else { ctx.strokeStyle = borderColor }
      bStyle.draw(ctx, cx, cy, r, borderWidth * (size / 400))
    }
    // deco
    DECORATIONS.find(d => d.id === selectedDeco)!.draw(ctx, cx, cy, r)

    const a = document.createElement('a'); a.href = out.toDataURL('image/png'); a.download = 'avatar.png'; a.click()
  }

  if (!imageDataUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
        <FileImage className="w-10 h-10 opacity-40" />
        <p className="text-sm">请先上传图片</p>
      </div>
    )
  }

  const sections = [
    { id: 'shape', label: '形状' },
    { id: 'deco', label: '装饰' },
    { id: 'border', label: '边框' },
    { id: 'bg', label: '背景' },
  ] as const

  return (
    <div className="space-y-4">
      {/* 实时预览 */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative rounded-2xl overflow-hidden border border-border bg-surface-raised">
          <canvas
            ref={canvasRef}
            className={cn('block', isDragging ? 'cursor-grabbing' : 'cursor-grab')}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>缩放</span>
          <input type="range" min="50" max="200" value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-28 h-1 appearance-none rounded-full cursor-pointer slider-thumb"
            style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${((zoom - 50) / 150) * 100}%, hsl(var(--border)) ${((zoom - 50) / 150) * 100}%)` }} />
          <span className="w-8 text-brand font-semibold">{zoom}%</span>
          <button onClick={() => { setZoom(100); setPanX(0); setPanY(0) }} className="p-1 hover:text-foreground transition-colors" title="重置位置">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">拖拽图片可调整位置</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-lg">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={cn('flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
              activeSection === s.id ? 'bg-accent text-accent-foreground border border-brand/30 shadow-glow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── 形状选择 ── */}
      {activeSection === 'shape' && (
        <div className="grid grid-cols-4 gap-2">
          {FRAME_SHAPES.map(s => (
            <button key={s.id} onClick={() => setSelectedShape(s.id)}
              className={cn('flex flex-col items-center gap-1 py-3 rounded-xl border transition-all duration-200',
                selectedShape === s.id
                  ? 'bg-accent border-brand/50 shadow-glow-sm'
                  : 'bg-surface border-border hover:border-brand/30 hover:bg-surface-raised')}>
              <span className="text-xl leading-none">{s.icon}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
              {selectedShape === s.id && <CheckCircle2 className="w-3 h-3 text-brand" />}
            </button>
          ))}
        </div>
      )}

      {/* ── 装饰选择 ── */}
      {activeSection === 'deco' && (
        <div className="grid grid-cols-5 gap-1.5">
          {DECORATIONS.map(d => (
            <button key={d.id} onClick={() => setSelectedDeco(d.id)}
              className={cn('flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border transition-all duration-200',
                selectedDeco === d.id
                  ? 'bg-accent border-brand/50 shadow-glow-sm'
                  : 'bg-surface border-border hover:border-brand/30 hover:bg-surface-raised')}>
              <span className="text-2xl leading-none">{d.emoji}</span>
              <span className="text-[10px] text-muted-foreground leading-tight text-center">{d.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── 边框设置 ── */}
      {activeSection === 'border' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">边框样式</p>
            <div className="grid grid-cols-3 gap-1.5">
              {BORDER_STYLES.map(b => (
                <button key={b.id} onClick={() => setSelectedBorder(b.id)}
                  className={cn('py-2 rounded-lg text-xs border transition-all',
                    selectedBorder === b.id ? 'bg-accent border-brand/50 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {selectedBorder !== 'none' && (
            <>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted-foreground">边框宽度</span>
                  <span className="text-xs font-semibold text-brand">{borderWidth}px</span>
                </div>
                <input type="range" min="2" max="24" value={borderWidth}
                  onChange={e => setBorderWidth(Number(e.target.value))}
                  className="w-full h-1.5 appearance-none rounded-full cursor-pointer slider-thumb"
                  style={{ background: `linear-gradient(to right, hsl(262 83% 65%) ${((borderWidth - 2) / 22) * 100}%, hsl(var(--border)) ${((borderWidth - 2) / 22) * 100}%)` }} />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">渐变边框</p>
                <div className="flex gap-1.5 flex-wrap">
                  {GRADIENT_BORDERS.map(g => (
                    <button key={g.id} onClick={() => setBorderGrad(g.id)}
                      className={cn('px-2 py-1 rounded-md text-xs border transition-all flex-shrink-0',
                        borderGrad === g.id ? 'bg-accent border-brand/50 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
                      {g.colors.length > 0
                        ? <span style={{ background: `linear-gradient(90deg,${g.colors.join(',')})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{g.label}</span>
                        : g.label}
                    </button>
                  ))}
                </div>
              </div>

              {borderGrad === 'none' && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">边框颜色</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BORDER_COLORS.map(c => (
                      <button key={c} onClick={() => setBorderColor(c)}
                        className={cn('w-7 h-7 rounded-lg border-2 transition-all hover:scale-110',
                          borderColor === c ? 'border-brand scale-110 shadow-glow-sm' : 'border-transparent')}
                        style={{ backgroundColor: c, outline: c === '#FFFFFF' ? '1px solid hsl(var(--border))' : undefined }} />
                    ))}
                    <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 背景设置 ── */}
      {activeSection === 'bg' && (
        <div className="grid grid-cols-4 gap-2">
          {BG_OPTIONS.map(b => (
            <button key={b.id} onClick={() => setSelectedBg(b.id)}
              className={cn('relative h-12 rounded-lg overflow-hidden border-2 transition-all duration-200',
                selectedBg === b.id ? 'border-brand shadow-glow-sm' : 'border-border hover:border-brand/40')}>
              <div className={cn('absolute inset-0', b.id === 'none' ? 'checkered-bg' : '')}
                style={
                  'color' in b && b.color ? { backgroundColor: b.color } :
                  'colors' in b && b.colors ? { background: `linear-gradient(135deg,${(b.colors as string[]).join(',')})` } : {}
                } />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={cn('text-[10px] font-medium drop-shadow-sm', b.id === 'white' || b.id === 'none' ? 'text-gray-500' : 'text-white')}>{b.label}</span>
              </div>
              {selectedBg === b.id && (
                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-brand rounded-full flex items-center justify-center">
                  <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 导出尺寸 + 下载 */}
      <div className="flex gap-2 items-center pt-1">
        <div className="flex gap-1">
          {[400, 600, 1000].map(s => (
            <button key={s} onClick={() => setOutputSize(s)}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs border transition-all',
                outputSize === s ? 'bg-accent border-brand/40 text-accent-foreground' : 'bg-surface border-border text-muted-foreground hover:text-foreground')}>
              {s}px
            </button>
          ))}
        </div>
        <Button className="flex-1" onClick={handleDownload}>
          <Download className="w-4 h-4" />导出头像
        </Button>
      </div>
    </div>
  )
}
