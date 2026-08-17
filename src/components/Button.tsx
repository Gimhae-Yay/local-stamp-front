import { useState } from 'react'

interface GreenButtonProps {
  children: React.ReactNode
  fullWidth?: boolean
  large?: boolean
  onClick?: () => void
}

export function GreenButton({ children, fullWidth, large, onClick }: GreenButtonProps) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--green-dark)' : 'var(--green)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        padding: large ? '14px 24px' : '8px 20px',
        fontSize: large ? 15 : 13,
        fontWeight: 600,
        fontFamily: 'Outfit, sans-serif',
        cursor: 'pointer',
        transition: 'background 0.15s',
        width: fullWidth ? '100%' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: fullWidth ? 'center' : 'flex-start',
        gap: 6,
      }}
    >
      {children}
    </button>
  )
}

interface OutlineButtonProps {
  children: React.ReactNode
  onClick?: () => void
}

export function OutlineButton({ children, onClick }: OutlineButtonProps) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'var(--surface-2)' : 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 20px',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'Inter, sans-serif',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}
