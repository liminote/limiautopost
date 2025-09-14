export default function BrandLogo({ className, variant = '01', height = 28 }: { className?: string; variant?: '01' | '02' | '03'; height?: number }) {
  const src = `/logo${variant}.svg`
  return (
    <div className={className ?? ''} aria-label="limiautopost">
      <img src={src} alt="貼文生成器" style={{ height: `${height}px`, display: 'block' }} />
    </div>
  )
}


