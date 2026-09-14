import type { ButtonHTMLAttributes, ReactNode } from 'react'

export default function Button({ children, secondary = false, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean; children: ReactNode }) {
  return <button className={`btn ${secondary ? 'btn-secondary' : 'btn-primary'} ${className}`} {...props}>{children}</button>
}
