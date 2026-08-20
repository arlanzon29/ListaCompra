import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  MapaImagenes,
  RepositorioImagenes,
  TamanoImagen,
  TipoImagen,
} from '../../dominio/puertos'
import { redimensiona } from '../redimensiona'

/**
 * Fotos de producto y logos de tienda, contra Supabase Storage.
 *
 * **La ruta se deduce del id, no se guarda en ninguna tabla.** Es la decisión
 * de esta fase: cero cambios de esquema, y una imagen se puede localizar sin
 * preguntarle nada a la base de datos. El precio de eso es que renombrar
 * cambia la ruta —el id es el nombre—, y por eso el puerto tiene `renombrar`:
 * lo que en las tablas hace el `on update cascade`, aquí hay que hacerlo a
 * mano. Ver `acompanaImagen` en aplicacion/casos/imagenes.ts.
 *
 * **La clave va en minúsculas** porque `productos.nombre` y
 * `supermercados.nombre` son `citext`: para la base «Leche» y «leche» son el
 * mismo artículo, pero para Storage serían dos ficheros. Bajar a minúsculas es
 * exactamente el plegado que hace `citext`. Consecuencia a tener presente: los
 * mapas que devuelve `listar` están **indexados en minúsculas**, así que quien
 * busque en ellos tiene que bajar el id igual (lo hace `useFotos`).
 *
 * **El cubo es público**: la URL es directa, estable y la cachea el CDN, sin
 * una llamada de firma por imagen. Son fotos de un brik de leche y las URLs no
 * se publican en ningún sitio. Escribir sigue exigiendo sesión: lo dice la
 * política de `storage.objects` en migracion-04-fotos.sql.
 */

const CUBO = 'imagenes'

const CARPETAS: Record<TipoImagen, string> = { foto: 'fotos', logo: 'logos' }

/**
 * Los dos tamaños, en píxeles del lado mayor.
 *
 * `fila` es la miniatura: 40 px en el catálogo y en ajustes, **76 en la lista
 * de la compra** desde que la foto se puede ampliar tocándola. `ficha` es el
 * plato de 180 px de alto de la ficha, con margen de sobra para una tablet.
 *
 * 240 y no 80: un móvil pinta a 3x, así que los 76 px de la lista son 228
 * físicos. Con el fichero de 80 la miniatura salía visiblemente blanda. Cuesta
 * unos 20 KB por foto en vez de 2,5, que sigue siendo nada al lado de los 90
 * del tamaño grande.
 */
const LADOS: Record<TamanoImagen, number> = { fila: 240, ficha: 720 }

const TAMANOS = Object.keys(LADOS) as TamanoImagen[]

/**
 * El final del nombre de cada fichero.
 *
 * **Va aparte de `LADOS` a propósito, y `-80.jpg` ya no dice cuánto mide.** El
 * sufijo es el nombre de la ranura, no una promesa sobre los píxeles: si se
 * derivara del número, subir la resolución cambiaría la ruta de todas las
 * imágenes, y las que ya están subidas quedarían colgando en una ruta que nadie
 * pide —miniaturas rotas hasta volver a hacer cada foto—.
 *
 * Cambiar aquí `-80.jpg` por otra cosa es exactamente eso: una migración de
 * ficheros, no un ajuste. Cambiar `LADOS` no lo es.
 */
const SUFIJOS: Record<TamanoImagen, string> = { fila: '-80.jpg', ficha: '-720.jpg' }

const sufijo = (t: TamanoImagen): string => SUFIJOS[t]

const ruta = (tipo: TipoImagen, id: string, t: TamanoImagen): string =>
  `${CARPETAS[tipo]}/${id.toLowerCase()}${sufijo(t)}`

/** Los errores de Storage no traen código de Postgres, solo mensaje. */
const mensaje = (e: { message: string }): string => {
  const m = e.message.toLowerCase()
  if (m.includes('bucket not found')) {
    return 'Falta el cubo «imagenes». Ejecuta supabase/migracion-04-fotos.sql.'
  }
  if (m.includes('row-level security') || m.includes('unauthorized')) {
    return 'La sesión no tiene permiso para cambiar imágenes.'
  }
  if (m.includes('payload too large') || m.includes('exceeded the maximum')) {
    return 'La imagen pesa demasiado incluso después de reducirla.'
  }
  if (m.includes('mime type')) return 'Ese tipo de imagen no se admite.'
  return e.message
}

/** `move` y `remove` sobre algo que no existe no es un fallo: ya no está. */
const noExiste = (e: { message: string }): boolean => {
  const m = e.message.toLowerCase()
  return m.includes('not found') && !m.includes('bucket not found')
}

export const repositorioImagenesSupabase = (sb: SupabaseClient): RepositorioImagenes => {
  const almacen = sb.storage.from(CUBO)

  /**
   * La URL pública, con la fecha del fichero pegada detrás.
   *
   * Sin el `?v=` cambiar una foto no se vería: la ruta es la misma y el CDN
   * seguiría sirviendo la anterior hasta que caducara su caché.
   */
  const url = (tipo: TipoImagen, id: string, t: TamanoImagen, version: string): string => {
    const { data } = almacen.getPublicUrl(ruta(tipo, id, t))
    return `${data.publicUrl}?v=${version}`
  }

  const listaCarpeta = async (tipo: TipoImagen): Promise<MapaImagenes> => {
    // El límite por defecto de `list` son 100 ficheros; un catálogo doméstico
    // no se acerca a mil, pero si algún día llegara, esto se quedaría corto en
    // silencio y habría que paginar.
    const { data, error } = await almacen.list(CARPETAS[tipo], { limit: 1000 })
    if (error) throw new Error(mensaje(error))

    const mapa: MapaImagenes = {}
    const fin = sufijo('ficha')
    for (const f of data ?? []) {
      // Las entradas sin `id` son carpetas, no ficheros.
      if (!f.id || !f.name.endsWith(fin)) continue
      const clave = f.name.slice(0, -fin.length)
      const version = String(Date.parse(f.updated_at ?? f.created_at ?? '') || 0)
      mapa[clave] = {
        fila: url(tipo, clave, 'fila', version),
        ficha: url(tipo, clave, 'ficha', version),
      }
    }
    return mapa
  }

  return {
    /**
     * Se listan las dos carpetas y se cruza con el sufijo grande: un id tiene
     * imagen si existe su fichero de 720. No hace falta preguntar por cada
     * artículo, que serían tantas peticiones como artículos.
     */
    async listar(): Promise<Record<TipoImagen, MapaImagenes>> {
      const [foto, logo] = await Promise.all([listaCarpeta('foto'), listaCarpeta('logo')])
      return { foto, logo }
    },

    /**
     * Sube los dos tamaños, reducidos aquí mismo.
     *
     * `upsert` porque la ruta es la misma cada vez: cambiar la foto de un
     * artículo es sobrescribir su fichero, no acumular versiones.
     */
    async guardar(tipo: TipoImagen, id: string, fichero: Blob): Promise<void> {
      const partes = await Promise.all(
        TAMANOS.map(async (t) => ({ t, blob: await redimensiona(fichero, LADOS[t]) })),
      )
      for (const { t, blob } of partes) {
        const { error } = await almacen.upload(ruta(tipo, id, t), blob, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600',
        })
        if (error) throw new Error(mensaje(error))
      }
    },

    async quitar(tipo: TipoImagen, id: string): Promise<void> {
      const { error } = await almacen.remove(TAMANOS.map((t) => ruta(tipo, id, t)))
      if (error && !noExiste(error)) throw new Error(mensaje(error))
    },

    /**
     * Se mueven los dos ficheros. Que no haya ninguno es lo normal —la mayoría
     * de artículos no tienen foto—, así que «no existe» no es un error.
     */
    async renombrar(tipo: TipoImagen, id: string, nuevoId: string): Promise<void> {
      for (const t of TAMANOS) {
        const { error } = await almacen.move(ruta(tipo, id, t), ruta(tipo, nuevoId, t))
        if (error && !noExiste(error)) throw new Error(mensaje(error))
      }
    },
  }
}
