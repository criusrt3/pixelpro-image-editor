import React, { useState } from 'react'
import {
  ZapIcon, Eraser, Layers, Sparkles, Upload,
  ChevronRight, X, ImageIcon, Sticker, UserCircle2, Scissors
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import ImageUploader from '@/components/ImageUploader'
import CompressPanel from '@/components/CompressPanel'
import WatermarkPanel from '@/components/WatermarkPanel'
import BackgroundPanel from '@/components/BackgroundPanel'
import EnhancePanel from '@/components/EnhancePanel'
import StickerPanel from '@/components/StickerPanel'
import AvatarPanel from '@/components/AvatarPanel'
import CutoutPanel from '@/components/CutoutPanel'
import heroBanner from '@/assets/images/hero-banner.png'
import samplePortrait from '@/assets/images/sample-portrait.png'

type Tab = 'compress' | 'watermark' | 'background' | 'enhance' | 'sticker' | 'avatar' | 'cutout'

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string; color: string }[] = [
  {
    id: 'compress', label: '图片压缩', icon: ZapIcon, desc: '无损压缩，减小体积',
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: 'watermark', label: '去水印', icon: Eraser, desc: '固定/分散水印消除',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'background', label: '换背景', icon: Layers, desc: '一键更换背景',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'enhance', label: '图片修饰', icon: Sparkles, desc: '滤镜调色美化',
    color: 'from-orange-500 to-pink-500'
  },
  {
    id: 'sticker', label: '文字贴纸', icon: Sticker, desc: '添加文字和表情',
    color: 'from-rose-500 to-yellow-500'
  },
  {
    id: 'avatar', label: '处理头像', icon: UserCircle2, desc: '图形裁剪+装饰点缀',
    color: 'from-pink-500 to-purple-500'
  },
  {
    id: 'cutout', label: '抠图拼图', icon: Scissors, desc: '智能抠图+合成拼图',
    color: 'from-cyan-500 to-indigo-500'
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('compress')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [showLanding, setShowLanding] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_sidebarOpen, _setSidebarOpen] = useState(false)

  const handleImageLoad = (file: File, dataUrl: string) => {
    setImageFile(file)
    setImageDataUrl(dataUrl)
  }

  const handleClearImage = () => {
    setImageFile(null)
    setImageDataUrl(null)
  }

  const handleTryNow = () => {
    setShowLanding(false)
  }

  const handleUseSample = () => {
    setImageDataUrl(samplePortrait)
    setImageFile(new File([], 'sample-portrait.jpg', { type: 'image/jpeg' }))
    setShowLanding(false)
  }

  const activeTabInfo = TABS.find(t => t.id === activeTab)!

  if (showLanding) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="fixed top-0 inset-x-0 z-50 surface-glass border-b border-border/50 h-14 sm:h-16">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
                <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <span className="font-bold text-base sm:text-lg text-foreground tracking-tight">PixelPro</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {['功能介绍', '使用教程', '常见问题'].map(item => (
                <button key={item} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item}
                </button>
              ))}
            </nav>
            <Button onClick={handleTryNow} size="sm" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[36px]">
              免费使用 <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Button>
          </div>
        </header>

        {/* Hero */}
        <main className="flex-1 pt-14 sm:pt-16">
          <section className="relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15"
              style={{ backgroundImage: `url(${heroBanner})` }}
            />
            <div className="relative max-w-6xl mx-auto px-4 py-14 sm:py-20 md:py-32 text-center">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-accent/60 border border-brand/30 text-xs sm:text-sm text-accent-foreground mb-4 sm:mb-6 animate-fade-in">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-brand" />
                <span>全功能图片处理工具，完全免费</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-foreground leading-tight mb-4 sm:mb-6 animate-fade-in">
                专业图片处理<br />
                <span className="text-gradient">就这么简单</span>
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-7 sm:mb-10 animate-fade-in px-2">
                压缩、去水印、换背景、美化修饰，一站式图片处理工具。<br className="hidden md:block" />
                无需安装软件，浏览器即可使用，数据不上传保护隐私。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in px-4 sm:px-0">
                <Button size="xl" onClick={handleTryNow} className="w-full sm:w-auto min-h-[48px]">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  立即上传图片
                </Button>
                <Button size="xl" variant="outline" onClick={handleUseSample} className="w-full sm:w-auto min-h-[48px]">
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  使用示例图片
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-4 sm:gap-8 mt-10 sm:mt-16 px-4 sm:px-0">
                {[
                  { value: '7大功能', label: '核心处理能力' },
                  { value: '100%本地', label: '数据不上传服务器' },
                  { value: '秒级处理', label: '快速高效' },
                  { value: '完全免费', label: '无水印无限制' },
                ].map(stat => (
                  <div key={stat.value} className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-gradient">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
            <h2 className="text-xl sm:text-2xl font-bold text-center text-foreground mb-2 sm:mb-3">全面的图片处理功能</h2>
            <p className="text-center text-sm text-muted-foreground mb-8 sm:mb-12">专业工具，简单操作</p>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {TABS.map(tab => {
                const Icon = tab.icon
                return (
                  <div key={tab.id} className="surface-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-elevated transition-all duration-300 group cursor-pointer active:scale-95 touch-manipulation" onClick={handleTryNow}>
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br ${tab.color} flex items-center justify-center mb-3 sm:mb-4 shadow-glow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1 sm:mb-2">{tab.label}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tab.desc}</p>
                  </div>
                )
              })}
            </div>
          </section>
        </main>

        <footer className="border-t border-border py-6 sm:py-8 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2025 PixelPro — 专业图片处理工具 · 本地处理，保护隐私</p>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="fixed top-0 inset-x-0 z-50 surface-glass border-b border-border/60 h-12 sm:h-14">
        <div className="h-full px-2 sm:px-4 flex items-center gap-2 sm:gap-3">
          <button
            className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity shrink-0"
            onClick={() => setShowLanding(true)}
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-gradient-brand flex items-center justify-center">
              <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground hidden sm:block">PixelPro</span>
          </button>

          <div className="w-px h-4 sm:h-5 bg-border shrink-0" />

          {/* Tab nav - horizontal scroll on mobile */}
          <div className="flex gap-0.5 sm:gap-1 overflow-x-auto flex-1 scrollbar-none pb-0.5">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all duration-200 min-h-[32px] touch-manipulation active:scale-95',
                    activeTab === tab.id
                      ? 'bg-accent text-accent-foreground border border-brand/40 shadow-glow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface'
                  )}
                >
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 2)}</span>
                </button>
              )
            })}
          </div>

          {imageDataUrl && (
            <button
              onClick={handleClearImage}
              className="flex items-center gap-1 sm:gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 sm:px-2 py-1.5 rounded-lg hover:bg-surface shrink-0 min-h-[32px] touch-manipulation"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">更换图片</span>
            </button>
          )}
        </div>
      </header>

      {/* Main content - vertical on mobile, horizontal on desktop */}
      <div className="flex-1 pt-12 sm:pt-14 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-x-hidden">

        {/* Left: Image preview area */}
        <div className="flex-1 p-2 sm:p-4 lg:p-6 min-h-0">
          {imageDataUrl ? (
            <div className="flex flex-col gap-2 sm:gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-gradient-to-br ${activeTabInfo.color} flex items-center justify-center shrink-0`}>
                    <activeTabInfo.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate">{activeTabInfo.label}</span>
                  <span className="text-xs text-muted-foreground hidden sm:block truncate">— {activeTabInfo.desc}</span>
                </div>
                {imageFile && (
                  <span className="text-xs text-muted-foreground hidden md:block shrink-0">
                    {imageFile.name || 'sample-portrait.jpg'} · {imageFile.size ? (imageFile.size / 1024).toFixed(0) + ' KB' : '示例图片'}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-center bg-surface rounded-xl sm:rounded-2xl border border-border overflow-hidden checkered-bg"
                style={{ minHeight: '160px', maxHeight: 'clamp(160px, 35vh, 320px)' }}
              >
                <img
                  src={imageDataUrl}
                  alt="当前图片"
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'clamp(156px, 35vh - 4px, 316px)' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground mb-1">上传图片开始处理</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">支持拖拽上传，所有处理均在本地完成，不上传服务器</p>
              </div>
              <ImageUploader onImageLoad={handleImageLoad} className="min-h-[140px] sm:min-h-[220px]" />

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">或者</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={handleUseSample}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-border hover:border-brand/40 bg-surface hover:bg-surface-raised transition-all duration-200 group touch-manipulation active:scale-[0.98] min-h-[56px]"
              >
                <img src={samplePortrait} alt="示例图片" className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">使用示例图片</p>
                  <p className="text-xs text-muted-foreground truncate">人物肖像，适合测试各项功能</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-brand transition-colors shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Tool panel */}
        <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border flex-shrink-0">
          <div className="p-3 sm:p-4 lg:p-5 overflow-y-auto">
            <div className="mb-4 sm:mb-5">
              <div className="flex items-center gap-2 mb-1">
                <activeTabInfo.icon className="w-4 h-4 text-brand" />
                <h3 className="font-semibold text-sm sm:text-base text-foreground">{activeTabInfo.label}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{activeTabInfo.desc}</p>
            </div>

            {activeTab === 'compress' && (
              <CompressPanel imageFile={imageFile} imageDataUrl={imageDataUrl} />
            )}
            {activeTab === 'watermark' && (
              <WatermarkPanel imageDataUrl={imageDataUrl} />
            )}
            {activeTab === 'background' && (
              <BackgroundPanel imageDataUrl={imageDataUrl} />
            )}
            {activeTab === 'enhance' && (
              <EnhancePanel imageDataUrl={imageDataUrl} />
            )}
            {activeTab === 'sticker' && (
              <StickerPanel imageDataUrl={imageDataUrl} />
            )}
            {activeTab === 'avatar' && (
              <AvatarPanel imageDataUrl={imageDataUrl} />
            )}
            {activeTab === 'cutout' && (
              <CutoutPanel imageDataUrl={imageDataUrl} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
