import type { Articulo, Lista, Precio, Supermercado } from '../../dominio/modelo'
import type { MapaImagenes, TipoImagen } from '../../dominio/puertos'
import { semilla } from './semilla'

/**
 * Estado compartido de los repositorios de memoria. Vive un único almacén para
 * que los borrados en cascada (borrar un artículo se lleva sus precios y sus
 * apariciones en listas) sean posibles sin que un repositorio conozca a otro.
 */
export type Almacen = {
  articulos: Articulo[]
  supermercados: Supermercado[]
  precios: Precio[]
  listas: Lista[]
  /** URLs `blob:` de las imágenes elegidas en esta sesión. Ver repositorios.ts. */
  imagenes: Record<TipoImagen, MapaImagenes>
}

/** No hay imágenes de ejemplo: la semilla trae datos, no ficheros. */
const sinImagenes = (): Record<TipoImagen, MapaImagenes> => ({ foto: {}, logo: {} })

export const nuevoAlmacen = (): Almacen => ({ ...semilla(), imagenes: sinImagenes() })

/**
 * Almacén sin datos de ejemplo, para cuando parte de los repositorios ya son
 * de Supabase. La semilla apunta a tiendas propias (`s1`, `s2`…) que no existen
 * en la base de datos real: mezclarlas dejaría precios colgando de tiendas
 * fantasma. Mejor vacío y honesto.
 */
export const almacenVacio = (): Almacen => ({
  articulos: [],
  supermercados: [],
  precios: [],
  listas: [],
  imagenes: sinImagenes(),
})

let contador = 0
/** Identificadores locales; con Supabase los genera la base de datos. */
export const nuevoId = (prefijo: string): string =>
  prefijo + Date.now().toString(36) + (contador++).toString(36)

/** Copia superficial, para que quien recibe los datos no pueda mutar el almacén. */
export const copia = <T,>(xs: T[]): T[] => xs.map((x) => ({ ...x }))
