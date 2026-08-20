import { useApp } from '../estado/AppProvider'
import { tienePila } from '../estado/rutas'

/** Cabecera con kicker + título, «‹» cuando hay pila y conmutador de tema. */
export const Cabecera = ({ kicker, titulo }: { kicker: string; titulo: string }) => {
  const { nav, tema } = useApp()
  const hayAtras = tienePila(nav.ruta)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 14px 12px',
        borderBottom: '1px solid var(--color-divider)',
        flex: 'none',
      }}
    >
      {hayAtras && (
        <button
          className="btn btn-secondary"
          style={{ width: 44, height: 44, padding: 0, flex: 'none', fontSize: 19 }}
          onClick={nav.atras}
          aria-label="Atrás"
        >
          ‹
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="kicker">{kicker}</div>
        <h2 className="elipsis" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          {titulo}
        </h2>
      </div>
      <button
        className="btn btn-secondary"
        style={{ width: 44, height: 44, padding: 0, flex: 'none', fontSize: 15 }}
        onClick={tema.alterna}
        aria-label="Cambiar tema"
      >
        {tema.tema === 'dark' ? '☾' : '☀'}
      </button>
    </div>
  )
}
