type ClinicLogoProps = {
  variant?: 'mark' | 'wordmark'
  className?: string
}

export default function ClinicLogo({
  variant = 'mark',
  className = '',
}: ClinicLogoProps) {
  const isWordmark = variant === 'wordmark'

  return (
    <img
      src={isWordmark ? '/images/clinic-wordmark.png' : '/images/clinic-logo.png'}
      alt="V. San Juan Dental Clinic"
      width={isWordmark ? 960 : 656}
      height={isWordmark ? 540 : 656}
      className={`block h-auto max-w-full object-contain ${isWordmark ? 'w-full' : 'w-14'} ${className}`}
    />
  )
}
