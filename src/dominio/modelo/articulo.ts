import type { Unidad } from './unidad'

/**
 * Artículo del catálogo. Siempre genérico: «leche», «pimiento verde».
 * Nunca marca ni formato — guardarlos impediría comparar entre tiendas.
 */
export type Articulo = {
  id: string
  nombre: string
  unidad: Unidad
  /**
   * De los que se compran siempre. No es una preferencia de quien lo marca:
   * el catálogo es compartido, así que el favorito también lo es.
   */
  favorito: boolean
}

/** Ordena por nombre con las reglas del español (acentos, ñ). */
export const porNombre = (a: Articulo, b: Articulo): number =>
  a.nombre.localeCompare(b.nombre, 'es')
