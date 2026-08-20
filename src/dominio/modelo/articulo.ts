import type { Unidad } from './unidad'

/**
 * Artículo del catálogo. Siempre genérico: «leche», «pimiento verde».
 * Nunca marca ni formato — guardarlos impediría comparar entre tiendas.
 */
export type Articulo = {
  id: string
  nombre: string
  unidad: Unidad
}

/** Ordena por nombre con las reglas del español (acentos, ñ). */
export const porNombre = (a: Articulo, b: Articulo): number =>
  a.nombre.localeCompare(b.nombre, 'es')
