import { useApp } from '../estado/AppProvider'
import { pestanaDe, type Pestana } from '../estado/rutas'

const PESTANAS: Array<{ id: Pestana; etiqueta: string; glifo: string }> = [
  { id: 'inicio', etiqueta: 'Inicio', glifo: '⌂' },
  { id: 'listas', etiqueta: 'Listas', glifo: '☰' },
  { id: 'articulos', etiqueta: 'Catálogo', glifo: '⊞' },
  { id: 'ajustes', etiqueta: 'Ajustes', glifo: '⚙' },
]

/** Barra inferior de cuatro pestañas. La activa va en acento sobre tinte. */
export const BarraPestanas = () => {
  const { nav } = useApp()
  const activa = pestanaDe(nav.ruta)

  return (
    <div
      className="barra-segura"
      style={{
        flex: 'none',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderTop: '1px solid var(--color-divider)',
        background: 'var(--color-bg)',
      }}
    >
      {PESTANAS.map((t) => {
        const esActiva = activa === t.id
        return (
          <button
            key={t.id}
            onClick={() => nav.pestana(t.id)}
            aria-current={esActiva ? 'page' : undefined}
            style={{
              minHeight: 62,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: esActiva ? 'var(--color-accent)' : 'var(--color-neutral-600)',
              background: esActiva ? 'var(--color-accent-100)' : 'transparent',
            }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 17, lineHeight: 1 }}>
              {t.glifo}
            </span>
            <span style={{ fontSize: 11, letterSpacing: '.02em' }}>{t.etiqueta}</span>
          </button>
        )
      })}
    </div>
  )
}
