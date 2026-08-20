import { porFechaDesc, pendientes } from '../../dominio/modelo'
import { useApp } from '../estado/AppProvider'
import { articulo, listasAbiertas, mejor, supermercado } from '../estado/consultas'
import { eurPorUnidad, fechaLarga } from '../formato'

/**
 * Pantalla de arranque: retomar la compra en un toque y ver qué se ha apuntado
 * últimamente. No muestra totales de cesta a propósito — lo que importa es qué
 * falta por comprar y cómo se mueven los precios.
 */
export const Inicio = () => {
  const { datos, nav } = useApp()

  const abiertas = listasAbiertas(datos)
  const conPendientes = abiertas
    .map((l) => ({ lista: l, n: pendientes(l).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)

  const enCurso = conPendientes[0]
  const pendTotal = abiertas.reduce((n, l) => n + pendientes(l).length, 0)
  const sinPrecio = datos.articulos.filter((a) => !mejor(datos, a.id)).length

  const recientes = datos.precios.slice().sort(porFechaDesc).slice(0, 4)

  return (
    <div
      style={{
        padding: '14px 14px 26px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {enCurso ? (
        <div
          style={{
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div className="kicker">Compra en curso</div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 600,
              lineHeight: 1.1,
            }}
          >
            {enCurso.lista.nombre}
          </div>
          <div
            className="cifra"
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontSize: 14,
              color: 'var(--color-neutral-700)',
              borderTop: '1px solid var(--color-divider)',
              paddingTop: 10,
            }}
          >
            <span style={{ flex: 1 }}>
              {enCurso.lista.items.length - enCurso.n} de {enCurso.lista.items.length} cogidos
            </span>
            <span style={{ color: 'var(--color-accent-700)' }}>{enCurso.n} por coger</span>
          </div>
          <button
            className="btn btn-primary btn-tinte"
            style={{ minHeight: 50, fontSize: 16 }}
            onClick={() =>
              nav.irDesde({ n: 'lista', id: enCurso.lista.id }, [{ n: 'inicio' }])
            }
          >
            Seguir comprando
          </button>
        </div>
      ) : (
        <div
          style={{
            border: '1px dashed var(--color-divider)',
            borderRadius: 'var(--radius-md)',
            padding: '22px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>Nada pendiente</div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-700)' }}>
            No hay artículos por comprar en ninguna lista abierta.
          </p>
          <button
            className="btn btn-secondary"
            style={{ minHeight: 48 }}
            onClick={() => nav.pestana('listas')}
          >
            Ver mis listas
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Cifra valor={pendTotal} etiqueta="artículos por comprar" />
        <Cifra valor={abiertas.length} etiqueta="listas abiertas" />
        <Cifra valor={sinPrecio} etiqueta="artículos sin precio" />
      </div>

      {recientes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="kicker-neutral">Últimos precios apuntados</div>
          {recientes.map((p, i) => {
            const a = articulo(datos, p.artId)
            const s = supermercado(datos, p.superId)
            if (!a || !s) return null
            return (
              <button
                key={`${p.artId}:${p.superId}:${p.fecha}:${i}`}
                onClick={() => nav.irDesde({ n: 'ficha', id: a.id }, [{ n: 'inicio' }])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--color-divider)',
                  minHeight: 58,
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="elipsis" style={{ display: 'block', fontSize: 16 }}>
                    {a.nombre}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 11,
                      color: 'var(--color-neutral-600)',
                    }}
                  >
                    {s.nombre} · {fechaLarga(p.fecha)}
                  </span>
                </span>
                <span className="cifra" style={{ fontSize: 16 }}>
                  {eurPorUnidad(p.importe, a.unidad)}
                </span>
                <span style={{ color: 'var(--color-accent)', fontSize: 16 }}>›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const Cifra = ({ valor, etiqueta }: { valor: number; etiqueta: string }) => (
  <div
    style={{
      flex: 1,
      border: '1px solid var(--color-divider)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: 'flex-start',
    }}
  >
    <span
      className="cifra"
      style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1 }}
    >
      {valor}
    </span>
    <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', lineHeight: 1.25 }}>
      {etiqueta}
    </span>
  </div>
)
