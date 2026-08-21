import { useApp } from '../estado/AppProvider'
import { tienePila } from '../estado/rutas'
import { IconoAtras, IconoClaro, IconoOscuro } from '../iconos'

/** Cabecera con kicker + título, flecha atrás cuando hay pila y conmutador de tema. */
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
          style={{ width: 44, height: 44, padding: 0, flex: 'none' }}
          onClick={nav.atras}
          aria-label="Atrás"
        >
          <IconoAtras size={22} />
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
        style={{ width: 44, height: 44, padding: 0, flex: 'none' }}
        onClick={tema.alterna}
        aria-label="Cambiar tema"
      >
        {tema.tema === 'dark' ? <IconoOscuro size={19} /> : <IconoClaro size={19} />}
      </button>
    </div>
  )
}
