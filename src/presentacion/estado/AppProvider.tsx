import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CasosDeUso, Instantanea } from '../../aplicacion'
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
 * vuelve a cargar: son cuatro tablas pequeñas y así no hay dos verdades.
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

/** Los casos de uso que modifican datos, ya envueltos para recargar al terminar. */
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
  | 'cambiarCantidad'
  | 'alternarComprado'
  | 'insertarDictado'
  | 'guardarPrecio'
>

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

  useEffect(() => {
    if (sesion) void recargar()
    else setDatos(VACIO)
  }, [sesion, recargar])

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
    // Envuelve un caso de uso para que la instantánea quede al día al acabar.
    const tras =
      <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        const r = await fn(...args)
        await recargar()
        return r
      }
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
      cambiarCantidad: tras(casos.cambiarCantidad),
      alternarComprado: tras(casos.alternarComprado),
      insertarDictado: tras(casos.insertarDictado),
      guardarPrecio: tras(casos.guardarPrecio),
    }
  }, [casos, recargar])

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
