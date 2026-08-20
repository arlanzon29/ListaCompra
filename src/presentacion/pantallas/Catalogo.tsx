import { infoUnidad } from '../../dominio/modelo'
import { useApp } from '../estado/AppProvider'
import { buscaArticulos, mejor } from '../estado/consultas'
import { eur } from '../formato'
import { Miniatura } from '../componentes/Miniatura'

/**
 * El catálogo: artículos genéricos, su unidad fija y el mejor precio conocido.
 * Desde aquí se entra a la ficha (comparativa) y a la entrada masiva de
 * precios, que es como se rellena una tienda entera en una visita.
 */
export const Catalogo = () => {
  const { datos, nav, q, setQ, setDlg, imagenes } = useApp()

  const filtrados = buscaArticulos(datos, q)
  const sinResultados = q.trim().length > 0 && filtrados.length === 0

  return (
    <div>
      <div
        style={{
          padding: '12px 14px',
          position: 'sticky',
          top: 0,
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-divider)',
          zIndex: 2,
        }}
      >
        <input
          className="input"
          style={{ minHeight: 48, fontSize: 16 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en el catálogo…"
        />
      </div>

      {sinResultados && (
        <div
          style={{
            padding: '34px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20 }}>
            Ningún artículo con «{q.trim()}»
          </div>
          <button
            className="btn btn-primary"
            style={{ minHeight: 48 }}
            onClick={() => setDlg({ tipo: 'nuevoArt', valor: q.trim() })}
          >
            Crear «{q.trim()}»
          </button>
        </div>
      )}

      {filtrados.map((a) => {
        const m = mejor(datos, a.id)
        return (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            <button
              onClick={() => nav.ir({ n: 'ficha', id: a.id })}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 8px 0 14px',
                minHeight: 60,
                textAlign: 'left',
              }}
            >
              <Miniatura src={imagenes.foto(a.id)} nombre={a.nombre} tamano={40} />
              <span className="elipsis" style={{ flex: 1, fontSize: 17 }}>
                {a.nombre}
              </span>
              <span className="tag tag-neutral" style={{ flex: 'none' }}>
                {infoUnidad(a.unidad).etiqueta}
              </span>
              <span
                className="cifra"
                style={{
                  fontSize: 12,
                  color: 'var(--color-neutral-600)',
                  width: 74,
                  textAlign: 'right',
                }}
              >
                {m ? eur(m.importe) : 'sin precio'}
              </span>
            </button>
            <button
              onClick={() => setDlg({ tipo: 'editArt', id: a.id })}
              aria-label={`Editar ${a.nombre}`}
              style={{
                width: 48,
                flex: 'none',
                fontSize: 13,
                color: 'var(--color-accent)',
                borderLeft: '1px solid var(--color-divider)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Ed
            </button>
          </div>
        )
      })}

      <div
        style={{
          padding: '16px 14px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <button
          className="btn btn-primary btn-tinte"
          style={{ minHeight: 52, fontSize: 16 }}
          onClick={() => setDlg({ tipo: 'nuevoArt' })}
        >
          + Artículo nuevo
        </button>
        <button
          className="btn btn-secondary"
          style={{ minHeight: 48, justifyContent: 'space-between' }}
          onClick={() =>
            setDlg({
              tipo: 'tiendaRonda',
              ids: datos.articulos.map((a) => a.id),
              origen: 'el catálogo',
            })
          }
        >
          <span>Apuntar precios del catálogo</span>
          <span style={{ color: 'var(--color-accent)' }}>›</span>
        </button>
      </div>
    </div>
  )
}
