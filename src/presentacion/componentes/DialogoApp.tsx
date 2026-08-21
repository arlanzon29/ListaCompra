import { useState } from 'react'
import type { Unidad } from '../../dominio/modelo'
import { useApp } from '../estado/AppProvider'
import { articulo, lista, supermercado, ultimo } from '../estado/consultas'
import type { Dialogo } from '../estado/rutas'
import { eur } from '../formato'
import { SelectorUnidad } from './SelectorUnidad'
import { Aviso, textoError } from './Aviso'
import { IconoFavorito } from '../iconos'

/**
 * El diálogo único de la aplicación. Cambia de forma según el tipo, pero
 * siempre es la misma caja: título, texto o campo, y acciones a la derecha
 * con «Borrar» empujado a la izquierda cuando existe.
 */
export const DialogoApp = () => {
  const { dlg } = useApp()
  if (!dlg) return null
  // La clave reinicia el campo cada vez que se abre un diálogo distinto.
  return <Contenido key={JSON.stringify(dlg)} dlg={dlg} />
}

const Contenido = ({ dlg }: { dlg: Dialogo }) => {
  const { casos, datos, acciones, nav, setDlg, setHoja, setQ } = useApp()

  const artEditado = dlg.tipo === 'editArt' ? articulo(datos, dlg.id) : undefined
  const tiendaEditada =
    dlg.tipo === 'renTienda' || dlg.tipo === 'borrarTienda'
      ? supermercado(datos, dlg.id)
      : undefined
  const listaACerrar = dlg.tipo === 'cerrarLista' ? lista(datos, dlg.id) : undefined

  const valorInicial =
    dlg.tipo === 'editArt'
      ? (artEditado?.nombre ?? '')
      : dlg.tipo === 'renTienda'
        ? (tiendaEditada?.nombre ?? '')
        : dlg.tipo === 'nuevoArt'
          ? (dlg.valor ?? '')
          : ''

  const [valor, setValor] = useState(valorInicial)
  const [unidad, setUnidad] = useState<Unidad>(artEditado?.unidad ?? 'kg')
  const [favorito, setFavorito] = useState(artEditado?.favorito ?? false)
  const [error, setError] = useState<string | null>(null)

  const cerrar = () => setDlg(null)

  /**
   * Envuelve una acción del diálogo: si el servidor la rechaza, el diálogo se
   * queda abierto con el motivo y lo escrito intacto, en vez de cerrarse como
   * si hubiera ido bien.
   */
  const intenta = async (accion: () => Promise<void>) => {
    setError(null)
    try {
      await accion()
    } catch (e) {
      setError(textoError(e))
    }
  }

  // ─── variantes con lista de opciones: elegir supermercado ───
  if (dlg.tipo === 'tienda' || dlg.tipo === 'tiendaRonda') {
    return (
      <Caja
        titulo={
          dlg.tipo === 'tienda' ? '¿En qué supermercado?' : '¿En qué supermercado estás?'
        }
        texto={
          dlg.tipo === 'tienda'
            ? 'El precio se guarda con la fecha de hoy.'
            : 'Te saldrá el catálogo entero para ir escribiendo precios; puedes filtrar por nombre.'
        }
        cerrar={cerrar}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {datos.supermercados.map((s) => (
            <OpcionTienda
              key={s.id}
              nombre={s.nombre}
              info={
                dlg.tipo === 'tienda'
                  ? infoUltimoPrecio(datos, dlg.artId, s.id)
                  : infoApuntadosHoy(datos, dlg.ids, s.id, casos.hoy())
              }
              elegir={() => {
                setDlg(null)
                if (dlg.tipo === 'tienda') {
                  setHoja({ artId: dlg.artId, superId: s.id, origen: dlg.origen })
                } else {
                  nav.ir({ n: 'ronda', superId: s.id, ids: dlg.ids, origen: dlg.origen })
                }
              }}
            />
          ))}
        </div>
      </Caja>
    )
  }

  // ─── variantes de confirmación y formulario ───
  const titulo =
    dlg.tipo === 'nuevaLista'
      ? 'Lista nueva'
      : dlg.tipo === 'nuevoArt'
        ? 'Artículo nuevo'
        : dlg.tipo === 'editArt'
          ? 'Editar artículo'
          : dlg.tipo === 'renTienda'
            ? 'Renombrar supermercado'
            : dlg.tipo === 'borrarTienda'
              ? `¿Borrar ${tiendaEditada?.nombre ?? 'el supermercado'}?`
              : `¿Cerrar «${listaACerrar?.nombre ?? ''}»?`

  const texto =
    dlg.tipo === 'borrarTienda'
      ? 'Se borrarán también sus precios guardados.'
      : dlg.tipo === 'cerrarLista'
        ? 'Desaparece de la pantalla de listas. Los precios apuntados se conservan y puedes reabrirla cuando quieras.'
        : null

  const campoEtiqueta =
    dlg.tipo === 'nuevaLista'
      ? 'Nombre'
      : dlg.tipo === 'nuevoArt' || dlg.tipo === 'editArt'
        ? 'Nombre genérico (sin marca ni formato)'
        : dlg.tipo === 'renTienda'
          ? 'Nombre'
          : null

  const placeholder =
    dlg.tipo === 'nuevaLista'
      ? 'p. ej. Semanal'
      : dlg.tipo === 'nuevoArt'
        ? 'p. ej. pimiento verde'
        : dlg.tipo === 'editArt'
          ? 'p. ej. leche'
          : ''

  const conUnidad = dlg.tipo === 'nuevoArt' || dlg.tipo === 'editArt'
  const soloBorrar = dlg.tipo === 'borrarTienda'
  const conBorrar = soloBorrar || dlg.tipo === 'editArt'
  const textoBoton =
    dlg.tipo === 'nuevaLista'
      ? 'Crear lista'
      : dlg.tipo === 'cerrarLista'
        ? 'Cerrar lista'
        : 'Guardar'

  const confirmar = async () => {
    const v = valor.trim()
    switch (dlg.tipo) {
      case 'nuevaLista': {
        if (!v) return
        const creada = await acciones.crearLista(v)
        setDlg(null)
        if (creada) nav.ir({ n: 'lista', id: creada.id })
        return
      }
      case 'nuevoArt': {
        if (!v) return
        const art = await acciones.crearArticulo(v, unidad)
        // El favorito va aparte del alta: es su propio método del puerto, y
        // así crear un artículo no depende de que la estrella se guarde.
        if (favorito) await acciones.marcarFavorito(art.id, true)
        if (dlg.anadirALista) await acciones.anadirArticuloALista(dlg.anadirALista, art.id)
        setDlg(null)
        setQ('')
        return
      }
      case 'editArt': {
        if (!v) return
        const art = await acciones.editarArticulo(dlg.id, v, unidad)
        // Contra Supabase el id es el nombre: si se ha renombrado, la estrella
        // hay que ponerla sobre el id nuevo, no sobre el que ya no existe.
        if (favorito !== (artEditado?.favorito ?? false)) {
          await acciones.marcarFavorito(art.id, favorito)
        }
        setDlg(null)
        return
      }
      case 'renTienda': {
        if (!v) return
        await acciones.renombrarSupermercado(dlg.id, v)
        setDlg(null)
        return
      }
      case 'cerrarLista': {
        await acciones.cerrarLista(dlg.id)
        setDlg(null)
        nav.pestana('listas')
        return
      }
      default:
        setDlg(null)
    }
  }

  const borrar = async () => {
    if (dlg.tipo === 'borrarTienda') {
      await acciones.borrarSupermercado(dlg.id)
      setDlg(null)
      return
    }
    if (dlg.tipo === 'editArt') {
      await acciones.borrarArticulo(dlg.id)
      setDlg(null)
      if (nav.ruta.n === 'ficha') nav.pestana('articulos')
      return
    }
    setDlg(null)
  }

  return (
    <Caja titulo={titulo} texto={texto} cerrar={cerrar}>
      {campoEtiqueta && (
        <div className="field">
          <label>{campoEtiqueta}</label>
          <input
            className="input"
            style={{ minHeight: 48, fontSize: 16 }}
            value={valor}
            onChange={(e) => {
              setValor(e.target.value)
              setError(null)
            }}
            placeholder={placeholder}
            autoFocus
          />
        </div>
      )}
      {conUnidad && (
        <div className="field">
          <label>Unidad de medida (fija para este artículo)</label>
          <SelectorUnidad valor={unidad} onCambio={setUnidad} />
        </div>
      )}
      {conUnidad && (
        <button
          onClick={() => setFavorito(!favorito)}
          aria-pressed={favorito}
          style={{
            width: '100%',
            minHeight: 48,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 12px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${favorito ? 'var(--color-accent)' : 'var(--color-divider)'}`,
            background: favorito ? 'var(--color-accent-100)' : 'transparent',
            color: favorito ? 'var(--color-accent-800)' : 'var(--color-neutral-700)',
            fontSize: 15,
            textAlign: 'left',
          }}
        >
          <IconoFavorito
            size={19}
            relleno={favorito}
            color={favorito ? 'var(--color-accent)' : undefined}
          />
          <span style={{ flex: 1 }}>
            {favorito ? 'Es favorito' : 'Marcar como favorito'}
          </span>
        </button>
      )}
      {error && <Aviso>{error}</Aviso>}
      <div className="dialog-actions">
        {conBorrar && (
          <button
            className="btn btn-secondary"
            style={{ minHeight: 46, marginRight: 'auto', color: 'var(--color-accent-700)' }}
            onClick={() => void intenta(borrar)}
          >
            Borrar
          </button>
        )}
        <button className="btn btn-secondary" style={{ minHeight: 46 }} onClick={cerrar}>
          Cancelar
        </button>
        {!soloBorrar && (
          <button
            className="btn btn-primary btn-tinte"
            style={{ minHeight: 46 }}
            onClick={() => void intenta(confirmar)}
          >
            {textoBoton}
          </button>
        )}
      </div>
    </Caja>
  )
}

const Caja = ({
  titulo,
  texto,
  cerrar,
  children,
}: {
  titulo: string
  texto?: string | null
  cerrar: () => void
  children: React.ReactNode
}) => (
  <div
    className="dialog-backdrop"
    role="presentation"
    onClick={(e) => {
      if (e.target === e.currentTarget) cerrar()
    }}
  >
    <div className="dialog" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="dialog-title">{titulo}</div>
      {texto && <div className="dialog-body">{texto}</div>}
      {children}
    </div>
  </div>
)

const OpcionTienda = ({
  nombre,
  info,
  elegir,
}: {
  nombre: string
  info: string
  elegir: () => void
}) => (
  <button
    onClick={elegir}
    style={{
      minHeight: 52,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 14px',
      border: '1px solid var(--color-divider)',
      borderRadius: 'var(--radius-md)',
      textAlign: 'left',
    }}
  >
    <span style={{ flex: 1, fontSize: 16 }}>{nombre}</span>
    <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{info}</span>
  </button>
)

const infoUltimoPrecio = (
  datos: Parameters<typeof ultimo>[0],
  artId: string,
  superId: string,
): string => {
  const p = ultimo(datos, artId, superId)
  return p ? eur(p.importe) : 'sin precio'
}

const infoApuntadosHoy = (
  datos: Parameters<typeof ultimo>[0],
  ids: string[],
  superId: string,
  hoy: string,
): string => {
  const n = ids.filter((id) =>
    datos.precios.some((p) => p.artId === id && p.superId === superId && p.fecha === hoy),
  ).length
  return n ? `${n} apuntados hoy` : 'sin datos de hoy'
}
