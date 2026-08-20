import { useApp } from '../estado/AppProvider'
import { lista } from '../estado/consultas'

/**
 * Barra fija sobre la navegación, solo en el detalle de una lista abierta.
 * Se esconde mientras haya una hoja o un diálogo delante para no competir con
 * su acción principal.
 */
export const BarraAnadir = () => {
  const { datos, nav, sim, hoja, dlg, panelAnadir, setPanelAnadir, setQ } = useApp()

  if (nav.ruta.n !== 'lista' || sim || hoja || dlg || panelAnadir) return null
  const actual = lista(datos, nav.ruta.id)
  if (!actual || actual.cerrada) return null
  const listaId = actual.id

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 62,
        padding: '10px 14px',
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-divider)',
        boxShadow: 'var(--shadow-md)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <button
        className="btn btn-primary btn-tinte"
        style={{ minHeight: 50, fontSize: 16 }}
        onClick={() => {
          setQ('')
          setPanelAnadir(true)
        }}
      >
        + Añadir artículo del catálogo
      </button>
      <button
        className="btn btn-secondary"
        style={{ minHeight: 48, fontSize: 15, justifyContent: 'space-between' }}
        onClick={() => nav.ir({ n: 'dictar', id: listaId })}
      >
        <span>Dictar o pegar varios a la vez</span>
        <span style={{ color: 'var(--color-accent)' }}>›</span>
      </button>
    </div>
  )
}
