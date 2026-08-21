import { useCallback, useRef, useState } from 'react'
import type { CasosDeUso } from '../../aplicacion'
import { claveImagen } from '../../dominio/puertos'
import type { MapaImagenes, TamanoImagen, TipoImagen } from '../../dominio/puertos'
import { textoError } from '../componentes/Aviso'

type Objetivo = { tipo: TipoImagen; id: string }

const VACIO: Record<TipoImagen, MapaImagenes> = { foto: {}, logo: {} }

/**
 * Fotos de producto y logos de tienda.
 *
 * Hasta esta fase la imagen se leía con `FileReader` a data-URL y se guardaba
 * en `localStorage`. Eso tenía un fallo de fondo en una aplicación cuyo punto
 * entero es que la lista es compartida: **la foto que hacía uno, el otro no la
 * veía nunca**. Y tres más: el cupo del navegador se llenaba con dos fotos y
 * las perdía en silencio, se guardaba la imagen de doce megapíxeles para
 * pintarla a 80 px, y publicar la aplicación separó las fotos de `localhost`
 * de las de GitHub Pages, que son orígenes distintos.
 *
 * Ahora el fichero se reduce en el navegador y se sube a Supabase Storage. Lo
 * que queda aquí es la mecánica del `<input type="file">` y el mapa de URLs.
 *
 * **Los mapas van indexados por `claveImagen`**, no por el id: la ruta del
 * fichero se deduce del id, y ni las mayúsculas ni los acentos sobreviven el
 * viaje. Por eso no se leen los mapas a pelo: se pregunta por `foto(id)` y
 * `logo(id)`, que aplican la misma función que aplicó quien los escribió.
 */
export const useFotos = (casos: CasosDeUso) => {
  const [mapas, setMapas] = useState<Record<TipoImagen, MapaImagenes>>(VACIO)
  /** El id que se está subiendo o quitando, para que la pantalla lo cuente. */
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const objetivo = useRef<Objetivo | null>(null)

  const recargar = useCallback(async () => {
    try {
      setMapas(await casos.cargarImagenes())
      setError(null)
    } catch (e) {
      setError(textoError(e))
    }
  }, [casos])

  const olvidar = useCallback(() => setMapas(VACIO), [])

  const url = useCallback(
    (tipo: TipoImagen, id: string, tamano: TamanoImagen): string | undefined =>
      mapas[tipo][claveImagen(id)]?.[tamano],
    [mapas],
  )

  const foto = useCallback(
    (id: string, tamano: TamanoImagen = 'fila') => url('foto', id, tamano),
    [url],
  )
  const logo = useCallback(
    (id: string, tamano: TamanoImagen = 'fila') => url('logo', id, tamano),
    [url],
  )

  /** `camara` abre directamente la cámara trasera del móvil. */
  const pideImagen = useCallback((tipo: TipoImagen, id: string, camara: boolean) => {
    objetivo.current = { tipo, id }
    const el = inputRef.current
    if (!el) return
    if (camara) el.setAttribute('capture', 'environment')
    else el.removeAttribute('capture')
    el.value = ''
    el.click()
  }, [])

  const recibeImagen = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fichero = e.target.files?.[0]
      const obj = objetivo.current
      objetivo.current = null
      if (!fichero || !obj) return
      setOcupado(obj.id)
      try {
        await casos.guardarImagen(obj.tipo, obj.id, fichero)
        setError(null)
        // Se vuelve a listar en vez de apuntar la URL a mano: la que sirve es
        // la del servidor, con su `?v=` nuevo para que no salga la de caché.
        await recargar()
      } catch (err) {
        setError(textoError(err))
      } finally {
        setOcupado(null)
      }
    },
    [casos, recargar],
  )

  const quitaFoto = useCallback(
    async (id: string) => {
      setOcupado(id)
      try {
        await casos.quitarImagen('foto', id)
        setError(null)
        await recargar()
      } catch (err) {
        setError(textoError(err))
      } finally {
        setOcupado(null)
      }
    },
    [casos, recargar],
  )

  return {
    foto,
    logo,
    inputRef,
    pideImagen,
    recibeImagen,
    quitaFoto,
    recargar,
    olvidar,
    ocupado,
    error,
    limpiaError: useCallback(() => setError(null), []),
  }
}
