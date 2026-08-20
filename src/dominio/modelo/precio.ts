/**
 * Precio de un artículo en un supermercado en una fecha.
 * `importe` va SIEMPRE en la unidad declarada en el artículo (€/l, €/kg, €/ud).
 * Se guarda histórico: la fecha distingue cada apunte.
 */
export type Precio = {
  artId: string
  superId: string
  /** ISO 'YYYY-MM-DD' */
  fecha: string
  importe: number
}

/** Redondeo a céntimos, la única precisión que la app almacena. */
export const aCentimos = (n: number): number => Math.round(n * 100) / 100

/** Más reciente primero. */
export const porFechaDesc = (a: Precio, b: Precio): number =>
  a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0

/** Más antiguo primero. */
export const porFechaAsc = (a: Precio, b: Precio): number => -porFechaDesc(a, b)
