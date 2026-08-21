import { useApp } from '../estado/AppProvider'
import { buscaArticulos, cuentaFavoritos, mejor } from '../estado/consultas'
import { eur } from '../formato'
import { Miniatura } from '../componentes/Miniatura'
import { FiltroFavoritos } from '../componentes/Favorito'
import { IconoAvanzar, IconoFavorito } from '../iconos'

/**
 * El catálogo: artículos genéricos y el mejor precio conocido. Desde aquí se
 * entra a la ficha (comparativa) y a la entrada masiva de precios, que es
 * como se rellena una tienda entera en una visita.
 *
 * La unidad no se enseña en la fila: ya no cabía sin recortar el nombre, y
 * quien la necesita la ve en la ficha o al apuntar un precio. Lo mismo con el
 * favorito: no es una columna, es una estrellita junto al nombre —marcarlo se
 * hace desde «Editar», no desde la fila.
 */
export const Catalogo = () => {
  const { datos, nav, q, setQ, soloFav, setDlg, setVisor, imagenes } = useApp()

  const favoritos = cuentaFavoritos(datos)
  const filtrados = buscaArticulos(datos, q, soloFav)
  // Buscando, el hueco ofrece crear el artículo. Con el filtro de favoritos
  // puesto no: lo que falta no es el artículo, es la estrella.
  const sinResultados = q.trim().length > 0 && filtrados.length === 0 && !soloFav
  const sinFavoritos = soloFav && filtrados.length === 0

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            style={{ minHeight: 48, fontSize: 16 }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en el catálogo…"
          />
          <FiltroFavoritos cuantos={favoritos} />
        </div>
      </div>

      {sinFavoritos && (
        <div
          style={{
            padding: '34px 20px',
            textAlign: 'center',
            color: 'var(--color-neutral-600)',
            fontSize: 15,
          }}
        >
          {q.trim()
            ? `Ningún favorito con «${q.trim()}».`
            : 'Todavía no hay ningún favorito. Se marcan al editar el artículo.'}
        </div>
      )}

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
        const foto = imagenes.foto(a.id)
        return (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid var(--color-divider)',
            }}
          >
            {/*
              La foto sale del botón de la fila y va en uno propio.

              No es capricho de maquetación: un botón dentro de otro no es HTML
              válido, y la fila entera **es** el botón que lleva a la ficha. Para
              que tocar la foto haga otra cosa —ampliarla— tiene que ser hermana
              suya, no hija.

              Solo cuando hay foto. El recuadro con la inicial no se amplía
              —no hay nada que leer en una letra—, así que ese se queda dentro
              de la fila y sigue llevando a la ficha como hasta ahora.
            */}
            {foto && (
              <button
                onClick={() => setVisor({ artId: a.id })}
                aria-label={`Ver la foto de ${a.nombre}`}
                style={{
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 0 0 14px',
                }}
              >
                <Miniatura src={foto} nombre={a.nombre} tamano={40} />
              </button>
            )}
            <button
              onClick={() => nav.ir({ n: 'ficha', id: a.id })}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                // Con foto, el hueco de la izquierda ya lo pone su botón; sin
                // ella, este padding es el de siempre y la fila no se mueve.
                padding: foto ? '0 8px 0 10px' : '0 8px 0 14px',
                minHeight: 60,
                textAlign: 'left',
              }}
            >
              {!foto && <Miniatura nombre={a.nombre} tamano={40} />}
              {a.favorito && (
                <IconoFavorito size={14} relleno color="var(--color-accent)" />
              )}
              <span className="elipsis" style={{ flex: 1, fontSize: 17 }}>
                {a.nombre}
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
          <IconoAvanzar size={18} color="var(--color-accent)" />
        </button>
      </div>
    </div>
  )
}
