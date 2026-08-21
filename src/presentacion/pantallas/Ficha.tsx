import { infoUnidad } from '../../dominio/modelo'
import { serieHistorica } from '../../dominio/servicios/precios'
import { Aviso } from '../componentes/Aviso'
import { useApp } from '../estado/AppProvider'
import { articulo, comparativaDe } from '../estado/consultas'
import { eurPorUnidad, fechaCorta, fechaLarga } from '../formato'
import { IconoAvanzar } from '../iconos'

/**
 * La comparativa de un artículo, que es el segundo objetivo de la app.
 *
 * Se compara SIEMPRE por unidad de medida y SIEMPRE artículo a artículo: un
 * total de cesta por supermercado mezclaría productos y no diría si el pan es
 * más barato en un sitio o en otro.
 *
 * Cada fila de la comparativa **es** el botón de apuntar el precio en esa
 * tienda. Antes el control era un «€» suelto a la derecha, y no se veía: en
 * esta app el € es contenido —va en cada precio y en cada etiqueta de unidad—,
 * así que un glifo sin borde ni fondo se lee como decoración. Ahora se toca la
 * fila entera, que es el patrón que ya usa DetalleLista, y a la derecha va la
 * palabra de lo que va a pasar en vez de un símbolo que hay que aprenderse.
 */
export const Ficha = ({ artId }: { artId: string }) => {
  const { datos, imagenes, setDlg, setHoja } = useApp()
  const a = articulo(datos, artId)
  if (!a) return null

  const u = infoUnidad(a.unidad)
  const filas = comparativaDe(datos, artId)
  const conPrecio = filas.filter((f) => f.precio)
  // La ficha pide el tamaño grande; las filas del catálogo, la miniatura.
  const foto = imagenes.foto(a.id, 'ficha')
  const subiendo = imagenes.ocupado === a.id

  const tiendaBarata = conPrecio[0]?.supermercado
  const serie = tiendaBarata ? serieHistorica(datos.precios, artId, tiendaBarata.id) : []
  const maximo = Math.max(...serie.map((p) => p.importe), 0.01)

  return (
    <div
      style={{ padding: '14px 14px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div
        className="plate"
        style={{
          width: '100%',
          height: 180,
          backgroundImage: foto ? `url("${foto}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 10,
        }}
      >
        {subiendo ? (
          <span style={{ flex: 1, fontSize: 13, color: 'var(--color-neutral-600)' }}>
            Subiendo la foto…
          </span>
        ) : foto ? (
          <button
            className="btn btn-secondary"
            style={{ minHeight: 44, fontSize: 13, background: 'var(--color-bg)' }}
            onClick={() => void imagenes.quitaFoto(a.id)}
          >
            Quitar foto
          </button>
        ) : (
          <span style={{ flex: 1, fontSize: 13, color: 'var(--color-neutral-600)' }}>
            Sin foto del producto
          </span>
        )}
      </div>

      {/*
        La foto ya no es cosa de este navegador: se sube a Supabase Storage y
        la ve el otro. Por eso hay algo que esperar y algo que puede fallar,
        que antes no existían.
      */}
      {imagenes.error && <Aviso>{imagenes.error}</Aviso>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary btn-tinte"
          style={{ flex: 1, minHeight: 48 }}
          disabled={subiendo}
          onClick={() => imagenes.pideImagen('foto', a.id, true)}
        >
          Hacer foto
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, minHeight: 48 }}
          disabled={subiendo}
          onClick={() => imagenes.pideImagen('foto', a.id, false)}
        >
          Elegir del carrete
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="tag tag-accent">{u.etiqueta}</span>
        <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
          Precios por {u.nombre}
        </span>
      </div>

      {conPrecio.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--color-divider)',
            borderRadius: 'var(--radius-md)',
            padding: '26px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 21 }}>
            Sin precios todavía
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-neutral-700)' }}>
            No hay ningún precio apuntado para este artículo en ninguna tienda. Apunta el
            primero cuando lo veas en el lineal.
          </p>
          <button
            className="btn btn-primary"
            style={{ minHeight: 48 }}
            onClick={() => setDlg({ tipo: 'tienda', artId: a.id, origen: 'ficha' })}
          >
            Apuntar precio
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="kicker-neutral">Comparativa · de más barato a más caro</div>
            {filas.map((f) => (
              <button
                key={f.supermercado.id}
                onClick={() =>
                  setHoja({ artId: a.id, superId: f.supermercado.id, origen: 'ficha' })
                }
                aria-label={
                  f.precio
                    ? `Actualizar el precio en ${f.supermercado.nombre}`
                    : `Apuntar el primer precio en ${f.supermercado.nombre}`
                }
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 0',
                  minHeight: 62,
                  borderBottom: '1px solid var(--color-divider)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 34,
                    flex: 'none',
                    borderRadius: 2,
                    background: f.esMasBarato
                      ? 'var(--color-accent)'
                      : f.precio
                        ? 'var(--color-neutral-300)'
                        : 'var(--color-neutral-200)',
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 17,
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 600,
                    }}
                  >
                    {f.supermercado.nombre}
                  </span>
                  <span
                    style={{ display: 'block', fontSize: 11, color: 'var(--color-neutral-600)' }}
                  >
                    {f.precio ? `apuntado el ${fechaLarga(f.precio.fecha)}` : 'nunca apuntado aquí'}
                  </span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className="cifra" style={{ display: 'block', fontSize: 18 }}>
                    {f.precio ? eurPorUnidad(f.precio.importe, a.unidad) : '—'}
                  </span>
                  <span
                    className="cifra"
                    style={{
                      display: 'block',
                      fontSize: 11,
                      color: f.esMasBarato
                        ? 'var(--color-accent-700)'
                        : f.precio
                          ? 'var(--color-neutral-600)'
                          : 'var(--color-neutral-500)',
                    }}
                  >
                    {f.esMasBarato
                      ? 'más barato'
                      : f.precio
                        ? `+${f.sobrecoste}%`
                        : 'sin dato'}
                  </span>
                </span>
                <span
                  style={{
                    flex: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    fontSize: 12,
                    color: 'var(--color-accent)',
                  }}
                >
                  {f.precio ? 'Actualizar' : 'Apuntar'}
                  <IconoAvanzar size={15} />
                </span>
              </button>
            ))}
          </div>

          {serie.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="kicker-neutral">Evolución</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                  height: 120,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--color-divider)',
                }}
              >
                {serie.map((p) => (
                  <div
                    key={p.fecha}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      gap: 6,
                      height: '100%',
                    }}
                  >
                    <span
                      className="cifra"
                      style={{ fontSize: 10, color: 'var(--color-neutral-700)' }}
                    >
                      {p.importe.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 3,
                      })}
                    </span>
                    <span
                      style={{
                        width: '100%',
                        /* mínimo del 8% para que una bajada fuerte siga viéndose */
                        height: `${Math.max(8, Math.round((p.importe / maximo) * 82))}%`,
                        background: 'var(--color-accent-200)',
                        borderTop: '2px solid var(--color-accent)',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {serie.map((p) => (
                  <span
                    key={p.fecha}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 10,
                      color: 'var(--color-neutral-600)',
                    }}
                  >
                    {fechaCorta(p.fecha)}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
                Serie de {tiendaBarata?.nombre}, en {u.etiqueta}.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
