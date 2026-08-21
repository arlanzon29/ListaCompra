import type { ReactNode } from 'react'

/**
 * Hoja que entra sobre un velo oscuro, pegada a un borde de la pantalla. La
 * usan el panel de añadir artículos y la hoja de apuntar precio.
 *
 * POR QUÉ SE PUEDE ANCLAR ARRIBA. Nació anclada abajo y solo abajo —se llamaba
 * `HojaInferior`—, que es lo normal en un móvil: la mano llega al borde de
 * abajo y no al de arriba. Pero una hoja que **abre el teclado** no puede ir
 * ahí: el teclado ocupa la mitad inferior y tapa justo lo que se acaba de
 * escribir y la lista de resultados. Anclada arriba, el buscador y las
 * primeras filas quedan por encima del teclado, que es donde hay que mirar.
 *
 * Así que la regla es: **abajo lo que se toca, arriba lo que se escribe**.
 */
export const Hoja = ({
  children,
  z = 20,
  alturaMaxima = '100%',
  desde = 'abajo',
}: {
  children: ReactNode
  z?: number
  alturaMaxima?: string
  /** A qué borde se pega. Ver el comentario de arriba antes de cambiarlo. */
  desde?: 'arriba' | 'abajo'
}) => {
  const arriba = desde === 'arriba'
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'color-mix(in srgb, var(--color-neutral-900) 55%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: arriba ? 'flex-start' : 'flex-end',
        zIndex: z,
      }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          // El filete y el redondeo van en el borde por el que se despega de
          // la pantalla, que es el contrario al que está pegada.
          ...(arriba
            ? {
                borderBottom: '1px solid var(--color-divider)',
                borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
              }
            : {
                borderTop: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              }),
          boxShadow: 'var(--shadow-lg)',
          maxHeight: alturaMaxima,
          display: 'flex',
          flexDirection: 'column',
          animation: `${arriba ? 'baja' : 'rise'} .18s ease-out`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
