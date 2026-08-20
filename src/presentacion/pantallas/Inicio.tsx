import type { ListaAbierta } from '../../dominio/modelo'
import { Aviso } from '../componentes/Aviso'
import { useApp } from '../estado/AppProvider'

/**
 * Pantalla de arranque: retomar la compra en un toque y ver de un vistazo qué
 * falta. No muestra totales de cesta a propósito — lo que importa es qué queda
 * por comprar, no lo que suma.
 *
 * Se alimenta **solo** del resumen (`casos.cargarResumen`), que son tres
 * cuentas hechas en el servidor. Antes leía la instantánea completa, así que
 * abrir la aplicación descargaba el catálogo, las listas y el histórico entero
 * de precios para acabar pintando tres números. Es también la razón de que ya
 * no salgan aquí los últimos precios apuntados: ese bloque era el único que
 * obligaba a traerse `precios`.
 */
export const Inicio = () => {
  const { resumen, cargandoResumen, errorResumen, nav } = useApp()

  // Primera carga: ni cifras ni hueco, para no enseñar ceros que no son.
  if (!resumen) {
    return (
      <div style={{ padding: '14px 14px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {errorResumen ? <Aviso>{errorResumen}</Aviso> : cargandoResumen ? <Esqueleto /> : null}
        {/* También aquí: si el resumen no llega, el sello es lo único que dice
            qué compilación está fallando. */}
        <Version />
      </div>
    )
  }

  /**
   * La compra en curso: de las listas abiertas, la que más queda por coger.
   *
   * El criterio vive aquí y no en la función de la base a propósito: es una
   * decisión de producto, y cambiarla —la más reciente, la que tocaste tú— no
   * debe costar una migración.
   */
  const enCurso = resumen.abiertas
    .filter((l) => l.pendientes > 0)
    .sort((a, b) => b.pendientes - a.pendientes)[0]

  const pendTotal = resumen.abiertas.reduce((n, l) => n + l.pendientes, 0)

  return (
    <div
      style={{
        padding: '14px 14px 26px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Un fallo al refrescar deja las cifras anteriores en pantalla y lo
          cuenta arriba: son de hace un momento, no mienten mucho, y vaciarlas
          sería peor. */}
      {errorResumen && <Aviso>{errorResumen}</Aviso>}

      {enCurso ? (
        <EnCurso lista={enCurso} onSeguir={() => nav.irDesde({ n: 'lista', id: enCurso.id }, [{ n: 'inicio' }])} />
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
        <Cifra valor={resumen.abiertas.length} etiqueta="listas abiertas" />
        <Cifra valor={resumen.sinPrecio} etiqueta="artículos sin precio" />
      </div>

      <Version />
    </div>
  )
}

const EnCurso = ({ lista, onSeguir }: { lista: ListaAbierta; onSeguir: () => void }) => (
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
      {lista.nombre}
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
        {lista.items - lista.pendientes} de {lista.items} cogidos
      </span>
      <span style={{ color: 'var(--color-accent-700)' }}>{lista.pendientes} por coger</span>
    </div>
    <button className="btn btn-primary btn-tinte" style={{ minHeight: 50, fontSize: 16 }} onClick={onSeguir}>
      Seguir comprando
    </button>
  </div>
)

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

/**
 * El sello de la compilación, abajo del todo y en voz baja.
 *
 * Responde a una sola pregunta: **¿el móvil tiene lo último?** Entre GitHub
 * Pages, el caché del navegador y la aplicación instalada en el escritorio hay
 * capas de sobra para que el teléfono siga enseñando la compilación de ayer sin
 * avisar. Se compara este commit con el del ordenador y se sale de dudas.
 *
 * El `+` detrás del commit significa que se compiló con cambios sin guardar en
 * git, así que ese sello no identifica nada reproducible.
 */
export const Version = () => (
  <div
    style={{
      marginTop: 4,
      textAlign: 'center',
      fontSize: 10,
      color: 'var(--color-neutral-500)',
      fontFamily: 'var(--font-body)',
    }}
  >
    <span className="cifra">{__VERSION__}</span>
    {' · '}
    {__COMPILADA__}
    {__ENTORNO__ === 'dev' && ' · dev'}
  </div>
)

/** Los mismos huecos que ocupará el contenido, para que nada salte al llegar. */
const Esqueleto = () => (
  <>
    <div
      style={{
        border: '1px solid var(--color-divider)',
        borderRadius: 'var(--radius-md)',
        height: 168,
        background: 'var(--color-neutral-200)',
      }}
    />
    <div style={{ display: 'flex', gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-md)',
            height: 74,
            background: 'var(--color-neutral-200)',
          }}
        />
      ))}
    </div>
  </>
)

