import React, { useCallback, useState } from 'react'
import { Upload, ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  onImageLoad: (file: File, dataUrl: string) => void
  className?: string
}

export default function ImageUploader({ onImageLoad, className }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageLoad(file, e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }, [onImageLoad])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <label
      className={cn(
        "flex flex-col items-center justify-center w-full cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300",
        isDragging
          ? "border-brand bg-accent/30 shadow-glow"
          : "border-border hover:border-brand/60 hover:bg-surface",
        className
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
          isDragging ? "bg-accent shadow-glow-sm" : "bg-surface-raised"
        )}>
          {isDragging
            ? <ImageIcon className="w-8 h-8 text-brand" />
            : <Upload className="w-8 h-8 text-muted-foreground" />
          }
        </div>
        <div>
          <p className="text-base font-medium text-foreground mb-1">
            {isDragging ? '松开以上传图片' : '点击或拖拽上传图片'}
          </p>
          <p className="text-sm text-muted-foreground">
            支持 JPG、PNG、WebP、GIF 格式，最大 20MB
          </p>
        </div>
        <div className="flex gap-2">
          {['JPG', 'PNG', 'WebP', 'GIF'].map(fmt => (
            <span key={fmt} className="px-2 py-0.5 rounded text-xs bg-surface-raised text-muted-foreground border border-border">
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </label>
  )
}
