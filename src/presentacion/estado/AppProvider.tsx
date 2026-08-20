import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { CasosDeUso, Instantanea } from '../../aplicacion'
import type { ItemLista, ResumenInicio } from '../../dominio/modelo'
import type { Sesion } from '../../dominio/puertos'
import { useNavegacion } from './useNavegacion'
import { useTema } from './useTema'
import { useFotos } from './useFotos'
import type { Dialogo, HojaPrecio, Simulacion } from './rutas'

const VACIO: Instantanea = { articulos: [], supermercados: [], precios: [], listas: [] }

/**
 * Único punto de contacto de la interfaz con la aplicación.
 *
 * Las pantallas leen `datos` (una instantánea de todo lo cargado) y llaman a
 * `acciones`; nunca a un repositorio. Cada acción ejecuta su caso de uso y
 * vuelve a cargar, para que no haya dos verdades.
 *
 * Hay **dos** cargas, y la diferencia importa:
 *
 * - `resumen` son las tres cuentas de inicio, resueltas en el servidor. Es lo
 *   único que se pide al entrar.
 * - `datos` es la instantánea completa —catálogo, tiendas, listas y el
 *   histórico entero de precios—, y se pide **perezosamente**, la primera vez
 *   que se sale de inicio. Antes se cargaba siempre al arrancar, así que abrir
 *   la aplicación para ver «3 por coger» se traía todos los precios apuntados.
 */
type Contexto = {
  casos: CasosDeUso
  sesion: Sesion | null
  comprobandoSesion: boolean
  entrar: (email: string, contrasena: string) => Promise<void>
  salir: () => Promise<void>

  datos: Instantanea
  cargando: boolean
  error: string | null
  recargar: () => Promise<void>
  acciones: Acciones

  /** Las cuentas de inicio. `null` mientras no ha llegado la primera carga. */
  resumen: ResumenInicio | null
  cargandoResumen: boolean
  errorResumen: string | null
  recargarResumen: () => Promise<void>

  nav: ReturnType<typeof useNavegacion>
  tema: ReturnType<typeof useTema>
  imagenes: ReturnType<typeof useFotos>

  q: string
  setQ: (v: string) => void
  dlg: Dialogo | null
  setDlg: (d: Dialogo | null) => void
  hoja: HojaPrecio | null
  setHoja: (h: HojaPrecio | null) => void
  panelAnadir: boolean
  setPanelAnadir: (v: boolean) => void
  sim: Simulacion
  setSim: (s: Simulacion) => void
}

/**
 * Los casos de uso que modifican datos, ya envueltos para recargar al terminar.
 *
 * `marcarComprado` y `cambiarCantidad` van aparte porque no recargan: tocan un
 * item, y el item lo arreglan en memoria. Ver `tras` y `enItems`.
 */
type Acciones = Pick<
  CasosDeUso,
  | 'crearArticulo'
  | 'editarArticulo'
  | 'borrarArticulo'
  | 'crearSupermercado'
  | 'renombrarSupermercado'
  | 'borrarSupermercado'
  | 'crearLista'
  | 'cerrarLista'
  | 'reabrirLista'
  | 'anadirArticuloALista'
  | 'quitarArticuloDeLista'
  | 'insertarDictado'
  | 'guardarPrecio'
> & {
  marcarComprado: (listaId: string, artId: string, comprado: boolean) => Promise<void>
  /** `cant` es la cantidad resultante: llegar a cero saca el artículo. */
  cambiarCantidad: (listaId: string, artId: string, cant: number) => Promise<void>
}

const Ctx = createContext<Contexto | null>(null)

export const AppProvider = ({
  casos,
  children,
}: {
  casos: CasosDeUso
  children: ReactNode
}) => {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [comprobandoSesion, setComprobandoSesion] = useState(true)

  const [datos, setDatos] = useState<Instantanea>(VACIO)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [resumen, setResumen] = useState<ResumenInicio | null>(null)
  const [cargandoResumen, setCargandoResumen] = useState(false)
  const [errorResumen, setErrorResumen] = useState<string | null>(null)

  /**
   * Si la instantánea completa ya se ha pedido alguna vez en esta sesión.
   *
   * Va en una ref y no en un estado porque solo decide **si toca cargar**, y
   * como estado provocaría un render de más en cada acción. Lo leen dos
   * sitios: la carga perezosa, para no repetirla, y las acciones, para saber
   * si además del resumen hay una instantánea que refrescar.
   */
  const datosPedidos = useRef(false)

  const [q, setQ] = useState('')
  const [dlg, setDlg] = useState<Dialogo | null>(null)
  const [hoja, setHoja] = useState<HojaPrecio | null>(null)
  const [panelAnadir, setPanelAnadir] = useState(false)
  const [sim, setSim] = useState<Simulacion>(null)

  const limpiaBusqueda = useCallback(() => setQ(''), [])
  const nav = useNavegacion(limpiaBusqueda)
  const tema = useTema()
  const imagenes = useFotos()

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      setDatos(await casos.cargarTodo())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se han podido cargar los datos.')
    } finally {
      setCargando(false)
    }
  }, [casos])

  const recargarResumen = useCallback(async () => {
    setCargandoResumen(true)
    try {
      setResumen(await casos.cargarResumen())
      setErrorResumen(null)
    } catch (e) {
      setErrorResumen(e instanceof Error ? e.message : 'No se ha podido cargar el resumen.')
    } finally {
      setCargandoResumen(false)
    }
  }, [casos])

  useEffect(() => {
    let vivo = true
    casos
      .sesionActual()
      .then((s) => {
        if (vivo) setSesion(s)
      })
      .finally(() => {
        if (vivo) setComprobandoSesion(false)
      })
    return () => {
      vivo = false
    }
  }, [casos])

  // Al entrar, solo el resumen. La instantánea espera a que haga falta.
  useEffect(() => {
    if (sesion) {
      void recargarResumen()
    } else {
      setDatos(VACIO)
      setResumen(null)
      datosPedidos.current = false
    }
  }, [sesion, recargarResumen])

  /**
   * La carga perezosa de la instantánea.
   *
   * El disparador es salir de inicio, porque inicio es la única pantalla que
   * se apaña con el resumen: las demás leen del catálogo, de las listas o del
   * histórico. Se pide una sola vez por sesión; a partir de ahí la mantienen
   * al día las acciones, como siempre.
   */
  useEffect(() => {
    if (!sesion || nav.ruta.n === 'inicio' || datosPedidos.current) return
    datosPedidos.current = true
    void recargar()
  }, [sesion, nav.ruta, recargar])

  const entrar = useCallback(
    async (email: string, contrasena: string) => {
      setSesion(await casos.iniciarSesion(email, contrasena))
    },
    [casos],
  )

  const salir = useCallback(async () => {
    await casos.cerrarSesion()
    setSesion(null)
    nav.pestana('inicio')
  }, [casos, nav])

  const acciones = useMemo<Acciones>(() => {
    /**
     * Envuelve un caso de uso para que lo cargado quede al día al acabar.
     *
     * El resumen se refresca siempre —cualquier acción puede mover una de sus
     * cuentas: apuntar un precio baja «sin precio», marcar comprado baja
     * «pendientes»—. La instantánea, solo si alguien la ha pedido ya; si se
     * está en inicio y nunca se ha salido, no se descarga por una acción.
     */
    const tras =
      <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        const r = await fn(...args)
        await Promise.all([recargarResumen(), datosPedidos.current ? recargar() : null])
        return r
      }

    /**
     * Aplica en la instantánea el cambio que el servidor **ya ha confirmado**.
     *
     * Esto no es actualización optimista: se llama después del `await`, así que
     * lo que se pinta es lo que quedó guardado. Lo que se ahorra no es la
     * espera, es la pregunta: marcar comprado no puede tocar un precio, ni una
     * tienda, ni otra lista, así que volver a pedirlo todo era traerse una
     * respuesta que ya teníamos.
     */
    const enItems = (listaId: string, f: (items: ItemLista[]) => ItemLista[]) =>
      setDatos((d) => ({
        ...d,
        listas: d.listas.map((l) => (l.id === listaId ? { ...l, items: f(l.items) } : l)),
      }))

    return {
      crearArticulo: tras(casos.crearArticulo),
      editarArticulo: tras(casos.editarArticulo),
      borrarArticulo: tras(casos.borrarArticulo),
      crearSupermercado: tras(casos.crearSupermercado),
      renombrarSupermercado: tras(casos.renombrarSupermercado),
      borrarSupermercado: tras(casos.borrarSupermercado),
      crearLista: tras(casos.crearLista),
      cerrarLista: tras(casos.cerrarLista),
      reabrirLista: tras(casos.reabrirLista),
      anadirArticuloALista: tras(casos.anadirArticuloALista),
      quitarArticuloDeLista: tras(casos.quitarArticuloDeLista),
      marcarComprado: async (listaId, artId, comprado) => {
        await casos.marcarComprado(listaId, artId, comprado)
        enItems(listaId, (items) =>
          items.map((i) => (i.artId === artId ? { ...i, comprado } : i)),
        )
        // El resumen sí se pide: «pendientes» acaba de cambiar. Es una RPC que
        // cuenta en el servidor y no devuelve ni una fila.
        await recargarResumen()
      },
      cambiarCantidad: async (listaId, artId, cant) => {
        // Quién decide si llegar a cero saca el artículo es el caso de uso;
        // aquí solo se refleja lo que contesta.
        const sigue = await casos.cambiarCantidad(listaId, artId, cant)
        enItems(listaId, (items) =>
          sigue
            ? items.map((i) => (i.artId === artId ? { ...i, cant } : i))
            : items.filter((i) => i.artId !== artId),
        )
        await recargarResumen()
      },
      insertarDictado: tras(casos.insertarDictado),
      guardarPrecio: tras(casos.guardarPrecio),
    }
  }, [casos, recargar, recargarResumen])

  const valor = useMemo<Contexto>(
    () => ({
      casos,
      sesion,
      comprobandoSesion,
      entrar,
      salir,
      datos,
      cargando,
      error,
      recargar,
      acciones,
      resumen,
      cargandoResumen,
      errorResumen,
      recargarResumen,
      nav,
      tema,
      imagenes,
      q,
      setQ,
      dlg,
      setDlg,
      hoja,
      setHoja,
      panelAnadir,
      setPanelAnadir,
      sim,
      setSim,
    }),
    [
      casos,
      sesion,
      comprobandoSesion,
      entrar,
      salir,
      datos,
      cargando,
      error,
      recargar,
      acciones,
      resumen,
      cargandoResumen,
      errorResumen,
      recargarResumen,
      nav,
      tema,
      imagenes,
      q,
      dlg,
      hoja,
      panelAnadir,
      sim,
    ],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export const useApp = (): Contexto => {
  const c = useContext(Ctx)
  if (!c) throw new Error('useApp fuera de <AppProvider>')
  return c
}
