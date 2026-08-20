import type { ReactNode } from 'react'

/**
 * Hoja que sube desde abajo, sobre un velo oscuro. La usan el panel de añadir
 * artículos y la hoja de apuntar precio.
 */
export const HojaInferior = ({
  children,
  z = 20,
  alturaMaxima = '100%',
}: {
  children: ReactNode
  z?: number
  alturaMaxima?: string
}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'color-mix(in srgb, var(--color-neutral-900) 55%, transparent)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      zIndex: z,
    }}
  >
    <div
      style={{
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-divider)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: alturaMaxima,
        display: 'flex',
        flexDirection: 'column',
        animation: 'rise .18s ease-out',
      }}
    >
      {children}
    </div>
  </div>
)
