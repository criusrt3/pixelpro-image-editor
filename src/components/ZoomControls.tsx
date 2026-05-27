import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  minZoom?: number
  maxZoom?: number
  className?: string
}

export default function ZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  minZoom = 0.5,
  maxZoom = 5,
  className = '',
}: ZoomControlsProps) {
  const pct = Math.round(zoom * 100)

  return (
    <div className={`absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-1.5 py-1 text-white z-10 select-none ${className}`}>
      <button
        onClick={onZoomOut}
        disabled={zoom <= minZoom}
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/20 disabled:opacity-30 transition-colors touch-manipulation"
      >
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <button onClick={onReset} className="min-w-[40px] h-7 px-1.5 flex items-center justify-center text-[10px] font-semibold hover:bg-white/20 rounded-md transition-colors touch-manipulation">
        {pct}%
      </button>
      <button
        onClick={onZoomIn}
        disabled={zoom >= maxZoom}
        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/20 disabled:opacity-30 transition-colors touch-manipulation"
      >
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
      <button onClick={onReset} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/20 transition-colors touch-manipulation" title="重置视图">
        <RotateCcw className="w-3 h-3" />
      </button>
    </div>
  )
}
