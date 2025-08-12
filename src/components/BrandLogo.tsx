export default function BrandLogo({ className, variant = '01', height = 28 }: { className?: string; variant?: '01' | '02' | '03'; height?: number }) {
  const src = `/logo${variant}.svg`
  return (
    <div className={className ?? ''} aria-label="隙音 limiautopost">
      <img src={src} alt="隙音" style={{ height: `${height}px`, display: 'block' }} />
    </div>
  )
}


