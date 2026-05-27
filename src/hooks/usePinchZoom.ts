import { useState, useRef, useCallback, useEffect } from 'react'

export interface UsePinchZoomOptions {
  minZoom?: number
  maxZoom?: number
  initialZoom?: number
  onSingleTouchStart?: (cx: number, cy: number) => void
  onSingleTouchMove?: (cx: number, cy: number) => void
  onSingleTouchEnd?: () => void
  onZoomChange?: (zoom: number) => void
  onPanChange?: (panX: number, panY: number) => void
}

export interface UsePinchZoomReturn {
  zoom: number
  panX: number
  panY: number
  isPinching: boolean
  wrapperStyle: React.CSSProperties
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
    onWheel: (e: React.WheelEvent) => void
  }
  viewportRef: React.RefObject<HTMLDivElement>
  resetView: () => void
  setZoom: React.Dispatch<React.SetStateAction<number>>
  setPanX: React.Dispatch<React.SetStateAction<number>>
  setPanY: React.Dispatch<React.SetStateAction<number>>
}

export function usePinchZoom(opts: UsePinchZoomOptions = {}): UsePinchZoomReturn {
  const {
    minZoom = 0.5,
    maxZoom = 5,
    initialZoom = 1,
    onSingleTouchStart,
    onSingleTouchMove,
    onSingleTouchEnd,
    onZoomChange,
    onPanChange,
  } = opts

  const [zoom, setZoomState] = useState(initialZoom)
  const [panX, setPanXState] = useState(0)
  const [panY, setPanYState] = useState(0)
  const [isPinching, setIsPinching] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null!)

  // Refs for gesture tracking (avoid re-renders during gesture)
  const pinchState = useRef<{
    mode: 'idle' | 'single' | 'pinch'
    startDist: number
    startZoom: number
    startMidX: number
    startMidY: number
    startPanX: number
    startPanY: number
    lastMidX: number
    lastMidY: number
  }>({ mode: 'idle', startDist: 0, startZoom: 1, startMidX: 0, startMidY: 0, startPanX: 0, startPanY: 0, lastMidX: 0, lastMidY: 0 })

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clampZoom = useCallback((z: number) => Math.min(maxZoom, Math.max(minZoom, z)), [minZoom, maxZoom])

  const setZoom = useCallback((action: React.SetStateAction<number>) => {
    setZoomState(prev => {
      const next = typeof action === 'function' ? action(prev) : action
      return clampZoom(next)
    })
  }, [clampZoom])

  const setPanX = useCallback((action: React.SetStateAction<number>) => {
    setPanXState(action)
  }, [])

  const setPanY = useCallback((action: React.SetStateAction<number>) => {
    setPanYState(action)
  }, [])

  // Sync zoom changes to callback
  useEffect(() => { onZoomChange?.(zoom) }, [zoom])
  useEffect(() => { onPanChange?.(panX, panY) }, [panX, panY])

  const getContainerRect = useCallback(() => {
    return viewportRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 }
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches
    if (touches.length === 1) {
      // Single finger — forward to component
      const t = touches[0]
      pinchState.current.mode = 'single'
      onSingleTouchStart?.(t.clientX, t.clientY)
    } else if (touches.length === 2) {
      // Transition to pinch — cancel any single-finger operation
      e.preventDefault()
      if (pinchState.current.mode === 'single') {
        onSingleTouchEnd?.()
      }
      pinchState.current.mode = 'pinch'
      setIsPinching(true)

      const t0 = touches[0], t1 = touches[1]
      const rect = getContainerRect()
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)

      pinchState.current.startDist = dist
      pinchState.current.startZoom = zoom
      pinchState.current.startMidX = midX
      pinchState.current.startMidY = midY
      pinchState.current.startPanX = panX
      pinchState.current.startPanY = panY
      pinchState.current.lastMidX = midX
      pinchState.current.lastMidY = midY
    }
  }, [zoom, panX, getContainerRect, onSingleTouchStart, onSingleTouchEnd])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = e.touches
    if (pinchState.current.mode === 'single' && touches.length === 1) {
      const t = touches[0]
      onSingleTouchMove?.(t.clientX, t.clientY)
    } else if (pinchState.current.mode === 'pinch' && touches.length === 2) {
      e.preventDefault()
      const t0 = touches[0], t1 = touches[1]
      const rect = getContainerRect()
      const midX = (t0.clientX + t1.clientX) / 2 - rect.left
      const midY = (t0.clientY + t1.clientY) / 2 - rect.top
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)

      const ratio = dist / pinchState.current.startDist
      const newZoom = clampZoom(pinchState.current.startZoom * ratio)

      // Keep midpoint stationary during zoom
      const scaleRatio = newZoom / pinchState.current.startZoom
      const newPanX = pinchState.current.startMidX - (pinchState.current.startMidX - pinchState.current.startPanX) * scaleRatio + (midX - pinchState.current.startMidX)
      const newPanY = pinchState.current.startMidY - (pinchState.current.startMidY - pinchState.current.startPanY) * scaleRatio + (midY - pinchState.current.startMidY)

      setZoomState(newZoom)
      setPanXState(newPanX)
      setPanYState(newPanY)

      pinchState.current.lastMidX = midX
      pinchState.current.lastMidY = midY
    }
  }, [clampZoom, getContainerRect, onSingleTouchMove])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      if (pinchState.current.mode === 'single') {
        onSingleTouchEnd?.()
      }
      pinchState.current.mode = 'idle'
      setIsPinching(false)
    } else if (e.touches.length === 1 && pinchState.current.mode === 'pinch') {
      // Went from 2 fingers to 1 — keep pinching state briefly to prevent accidental draw
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        pinchState.current.mode = 'idle'
        setIsPinching(false)
      }, 200)
    }
  }, [onSingleTouchEnd])

  // Ctrl+wheel zoom (desktop)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const rect = getContainerRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = clampZoom(zoom * factor)
    const ratio = newZoom / zoom
    const newPanX = mx - (mx - panX) * ratio
    const newPanY = my - (my - panY) * ratio
    setZoomState(newZoom)
    setPanXState(newPanX)
    setPanYState(newPanY)
  }, [zoom, panX, panY, clampZoom, getContainerRect])

  const resetView = useCallback(() => {
    setZoomState(initialZoom)
    setPanXState(0)
    setPanYState(0)
  }, [initialZoom])

  // Cleanup debounce timer
  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [])

  const wrapperStyle: React.CSSProperties = {
    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
    transformOrigin: '0 0',
    willChange: 'transform',
  }

  return {
    zoom,
    panX,
    panY,
    isPinching,
    wrapperStyle,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onWheel: handleWheel,
    },
    viewportRef,
    resetView,
    setZoom,
    setPanX,
    setPanY,
  }
}
