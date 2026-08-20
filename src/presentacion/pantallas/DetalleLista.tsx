import { useState } from 'react'
import { ordenDeCompra, pendientes } from '../../dominio/modelo'
import { useApp } from '../estado/AppProvider'
import { articulo, lista, mejor, supermercado } from '../estado/consultas'
import { MOSTRAR_TOTAL_LISTA } from '../config'
import { eur } from '../formato'
import { Miniatura } from '../componentes/Miniatura'
import { Aviso, textoError } from '../componentes/Aviso'

/**
 * La pantalla que se usa en la tienda.
 *
 * Toda la fila salvo los controles marca el artículo como cogido: es el gesto
 * más frecuente en el pasillo y merece el objetivo táctil grande. Los cogidos
 * bajan al final. El botón de precio de la derecha es el acceso a la
 * comparativa; no se apuntan precios desde aquí.
 *
 * Los errores salen **pegados al control que ha fallado**, no arriba del todo:
 * en una lista de veinte artículos, un aviso en la cabecera no lo ve quien está
 * tocando la última fila. Hasta que las listas fueron de Supabase esto no hacía
 * falta, porque en memoria nada fallaba nunca.
 */
export const DetalleLista = ({ listaId }: { listaId: string }) => {
  const { datos, acciones, nav, sim, setSim, imagenes, setDlg, setVisor } = useApp()
  const actual = lista(datos, listaId)

  // Un solo fallo a la vez, con la clave de a quién pertenece: el `artId` de la
  // fila, o 'lista' para lo que afecta a la lista entera.
  const [fallo, setFallo] = useState<{ clave: string; texto: string } | null>(null)

  const intenta = (clave: string, accion: () => Promise<unknown>) => {
    setFallo(null)
    void accion().catch((e: unknown) => setFallo({ clave, texto: textoError(e) }))
  }

  if (sim === 'loading') return <Esqueletos />
  if (sim === 'error') return <ErrorSincronizacion onReintentar={() => setSim(null)} />
  if (!actual) return null

  const bloqueada = !!actual.cerrada
  const items = ordenDeCompra(actual.items)

  const estimado = pendientes(actual).reduce((suma, it) => {
    const m = mejor(datos, it.artId)
    return m ? suma + m.importe * it.cant : suma
  }, 0)

  return (
    <div>
      {bloqueada && (
        <div
          style={{
            margin: '12px 14px 0',
            padding: '12px 14px',
            border: '1px solid var(--color-accent)',
            background: 'var(--color-accent-100)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--color-accent-800)' }}>
              Lista cerrada. Solo consulta.
            </span>
            <button
              className="btn btn-secondary"
              style={{ minHeight: 44, fontSize: 13 }}
              onClick={() => intenta('lista', () => acciones.reabrirLista(actual.id))}
            >
              Reabrir
            </button>
          </div>
          {fallo?.clave === 'lista' && <Aviso>{fallo.texto}</Aviso>}
        </div>
      )}

      {items.length === 0 && !bloqueada && (
        <div
          style={{
            padding: '44px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              border: '1px solid var(--color-divider)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              fontSize: 22,
            }}
          >
            +
          </div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>Lista vacía</div>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--color-neutral-700)',
              maxWidth: '26ch',
            }}
          >
            Añade artículos uno a uno con el botón de abajo, o dicta la lista entera de golpe.
          </p>
          <button
            className="btn btn-secondary"
            style={{ minHeight: 48 }}
            onClick={() => nav.ir({ n: 'dictar', id: actual.id })}
          >
            Dictar o pegar lista
          </button>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div style={{ padding: '6px 0 12px' }}>
            {items.map((it) => {
              const a = articulo(datos, it.artId)
              if (!a) return null
              const m = mejor(datos, it.artId)
              const tienda = m ? supermercado(datos, m.superId) : undefined
              const opac = it.comprado ? 0.5 : 1
              const opacControles = bloqueada ? 0.45 : 1
              const foto = imagenes.foto(a.id)
              const alternar = () => {
                if (!bloqueada)
                  intenta(it.artId, () =>
                    acciones.marcarComprado(actual.id, it.artId, !it.comprado),
                  )
              }

              return (
                <div key={it.artId}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      borderBottom: '1px solid var(--color-divider)',
                    }}
                  >
                    {/*
                      Fuera la casilla: marcar comprado es tocar el nombre.

                      La casilla era 30px de ancho más su hueco, y lo que decía
                      lo dicen ya el tachado del nombre y el 50% de opacidad de
                      la fila entera —la foto incluida—. Lo que se gana con esos
                      píxeles es la foto al doble: 76 en vez de 38, que es la
                      diferencia entre reconocer lo que ya sabes y poder leer la
                      etiqueta desde el carro.

                      La fila NO crece: sigue midiendo los 80px que fija la
                      columna del + y el −, y la foto los ocupa casi enteros.
                    */}
                    {foto && (
                      <button
                        onClick={() => setVisor({ artId: a.id })}
                        aria-label={`Ver la foto de ${a.nombre}`}
                        style={{
                          flex: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px 0 2px 14px',
                        }}
                      >
                        <Miniatura
                          src={foto}
                          nombre={a.nombre}
                          tamano={76}
                          opacidad={opac}
                        />
                      </button>
                    )}

                    <button
                      onClick={alternar}
                      aria-pressed={it.comprado}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: foto ? '12px 8px 12px 12px' : '12px 8px 12px 14px',
                        textAlign: 'left',
                        minHeight: 80,
                      }}
                    >
                      {/*
                        Sin foto, la inicial se queda dentro del botón del
                        nombre: no hay nada que ampliar, y un hueco muerto de
                        76px en la fila que más se toca se paga en cada compra.
                      */}
                      {!foto && <Miniatura nombre={a.nombre} tamano={76} opacidad={opac} />}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontSize: 17,
                            textDecoration: it.comprado ? 'line-through' : 'none',
                            opacity: opac,
                          }}
                        >
                          {a.nombre}
                        </span>
                        <span
                          className="cifra"
                          style={{
                            display: 'block',
                            fontSize: 12,
                            color: 'var(--color-neutral-600)',
                          }}
                        >
                          {it.cant} {a.unidad}
                        </span>
                      </span>
                    </button>

                    {/*
                      Los dos controles de cantidad van APILADOS en una sola
                      columna: en fila gastaban 92px de ancho y el nombre del
                      artículo se quedaba corto, que es lo que hay que leer de
                      un vistazo en el pasillo. Apilados gastan 46.

                      Lo que cuesta: cada botón pasa de 64px de alto a 40. La
                      fila sube a 80px para no bajar de ahí —debajo de 40 el
                      dedo falla, y aquí fallar es cambiar una cantidad o, con
                      cantidad 1, quitar el artículo de la lista—.

                      El + arriba a propósito: es el que más se pulsa, y la
                      mitad de arriba de la fila queda más cerca del pulgar
                      cuando la lista se recorre de arriba abajo.
                    */}
                    <div
                      style={{
                        width: 46,
                        flex: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: '1px solid var(--color-divider)',
                        opacity: opacControles,
                      }}
                    >
                      <button
                        onClick={() => {
                          if (!bloqueada)
                            intenta(it.artId, () =>
                              acciones.cambiarCantidad(actual.id, it.artId, it.cant + 1),
                            )
                        }}
                        aria-label="Una unidad más"
                        style={{
                          flex: 1,
                          minHeight: 40,
                          fontSize: 16,
                          color: 'var(--color-accent)',
                        }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => {
                          if (!bloqueada)
                            intenta(it.artId, () =>
                              acciones.cambiarCantidad(actual.id, it.artId, it.cant - 1),
                            )
                        }}
                        aria-label={it.cant > 1 ? 'Una unidad menos' : 'Quitar de la lista'}
                        style={{
                          flex: 1,
                          minHeight: 40,
                          fontSize: 16,
                          color: 'var(--color-accent)',
                          borderTop: '1px solid var(--color-divider)',
                        }}
                      >
                        −
                      </button>
                    </div>

                    <button
                      onClick={() => nav.ir({ n: 'ficha', id: it.artId })}
                      aria-label="Ver precios por supermercado"
                      style={{
                        width: 126,
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '0 6px 0 10px',
                        borderLeft: '1px solid var(--color-divider)',
                        textAlign: 'right',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          className="cifra"
                          style={{
                            display: 'block',
                            fontSize: 14,
                            color: 'var(--color-accent-700)',
                          }}
                        >
                          {m ? eur(m.importe) : 'sin precio'}
                        </span>
                        <span
                          className="elipsis"
                          style={{
                            display: 'block',
                            fontSize: 11,
                            color: 'var(--color-neutral-600)',
                          }}
                        >
                          {tienda ? tienda.nombre : 'ver precios'}
                        </span>
                      </span>
                      <span style={{ color: 'var(--color-accent)', fontSize: 16 }}>›</span>
                    </button>
                  </div>
                  {fallo?.clave === it.artId && (
                    <div style={{ padding: '10px 14px 12px' }}>
                      <Aviso>{fallo.texto}</Aviso>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div
            style={{
              /* 152px reservados para la barra fija de añadir + la navegación. */
              padding: '4px 14px 152px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {MOSTRAR_TOTAL_LISTA && (
              <div
                className="cifra"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 14,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-divider)',
                }}
              >
                <span style={{ color: 'var(--color-neutral-700)' }}>
                  Estimado (cada artículo en su tienda más barata)
                </span>
                <span>{eur(estimado)}</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
              Toca el precio de un artículo para verlo en cada supermercado.
            </div>
            {!bloqueada && (
              <button
                className="btn btn-secondary"
                style={{ minHeight: 48, justifyContent: 'space-between' }}
                onClick={() => setDlg({ tipo: 'cerrarLista', id: actual.id })}
              >
                <span>Cerrar lista</span>
                <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
                  deja de aparecer
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const Esqueletos = () => (
  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        style={{
          height: 64,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-neutral-200)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}
      />
    ))}
  </div>
)

const ErrorSincronizacion = ({ onReintentar }: { onReintentar: () => void }) => (
  <div
    style={{
      padding: '26px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      alignItems: 'flex-start',
    }}
  >
    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>
      No se ha podido sincronizar
    </div>
    <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-700)' }}>
      Los cambios que hagas se guardan en el móvil y se enviarán cuando vuelva la conexión.
    </p>
    <button className="btn btn-primary" style={{ minHeight: 48 }} onClick={onReintentar}>
      Reintentar
    </button>
  </div>
)
