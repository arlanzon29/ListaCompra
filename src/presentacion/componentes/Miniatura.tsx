import type { CSSProperties } from 'react'

type Props = {
  /** Data-URL o URL de la imagen; sin ella se muestra la inicial del nombre. */
  src?: string
  nombre: string
  tamano: number
  /** Los logos de supermercado son redondos; las fotos de producto, cuadradas. */
  redonda?: boolean
  /** Sigue la opacidad del artículo cuando ya está cogido. */
  opacidad?: number
  style?: CSSProperties
}

/**
 * Miniatura de producto o logo de tienda. Sin imagen muestra la inicial en
 * Cormorant sobre un recuadro bordeado, nunca un hueco vacío.
 */
export const Miniatura = ({
  src,
  nombre,
  tamano,
  redonda = false,
  opacidad = 1,
  style,
}: Props) => (
  <span
    style={{
      width: tamano,
      height: tamano,
      flex: 'none',
      border: '1px solid var(--color-divider)',
      borderRadius: redonda ? '50%' : 'var(--radius-sm)',
      backgroundImage: src ? `url("${src}")` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-heading)',
      fontSize: Math.round(tamano * 0.42),
      color: 'var(--color-neutral-500)',
      opacity: opacidad,
      ...style,
    }}
  >
    {src ? '' : (nombre || '?').trim().charAt(0).toUpperCase()}
  </span>
)
