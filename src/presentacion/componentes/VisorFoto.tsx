import { useEffect } from 'react'
import { useApp } from '../estado/AppProvider'
import { articulo } from '../estado/consultas'

/**
 * La foto de un artículo, a pantalla completa sobre el marco del móvil.
 *
 * Existe por el pasillo: en la lista la miniatura mide 38 px, que sirve para
 * reconocer de un vistazo lo que ya sabes, pero no para decidir cuál de los
 * dos paquetes parecidos es. Ampliarla es leer la etiqueta.
 *
 * Se cierra tocando en cualquier sitio —incluida la foto—, porque en el
 * supermercado se va con una mano y buscar una `×` de 44 px es pedir
 * puntería. La `×` está igualmente arriba, para quien la busque con la vista.
 *
 * Enseña el tamaño de 720 px, el mismo que la ficha. No hay un tercer fichero
 * más grande a propósito: 720 llena de sobra la pantalla de un móvil.
 */
export const VisorFoto = () => {
  const { visor, setVisor, datos, imagenes } = useApp()

  // Escape cierra, como en cualquier capa que tape lo que hay debajo. En el
  // móvil no se usa; en el ordenador, mientras se trabaja, es lo primero que
  // se pulsa.
  useEffect(() => {
    if (!visor) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisor(null)
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [visor, setVisor])

  if (!visor) return null

  const a = articulo(datos, visor.artId)
  const src = imagenes.foto(visor.artId, 'ficha')
  // Si la foto se ha ido —la ha quitado el otro entre medias—, no se abre un
  // recuadro negro vacío.
  if (!src) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={a ? `Foto de ${a.nombre}` : 'Foto del artículo'}
      onClick={() => setVisor(null)}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        background: 'color-mix(in srgb, var(--color-neutral-900) 88%, transparent)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'rise .18s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-heading)',
            fontSize: 22,
            color: 'var(--color-neutral-100)',
          }}
        >
          ×
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
        }}
      >
        <img
          src={src}
          alt={a ? a.nombre : 'Foto del artículo'}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>

      <div
        style={{
          padding: '14px 16px 22px',
          textAlign: 'center',
          color: 'var(--color-neutral-100)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 19 }}>{a?.nombre}</div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>Toca para cerrar</div>
      </div>
    </div>
  )
}
