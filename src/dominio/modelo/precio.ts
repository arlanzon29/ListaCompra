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

/**
 * Redondeo a milésimas, la única precisión que la app almacena.
 *
 * Tres decimales y no dos porque el importe va SIEMPRE por unidad de medida, y
 * ahí el céntimo se queda corto: un pack de 6 x 1 l a 5,45 € son 0,908 €/l, y
 * guardado como 0,91 €/l la comparativa entre tiendas la decide el redondeo en
 * vez del precio. La columna `precios.precio` es `numeric(10,3)`, así que este
 * es el mismo redondeo que haría Postgres al guardar.
 */
export const aMilesimas = (n: number): number => Math.round(n * 1000) / 1000

/** Más reciente primero. */
export const porFechaDesc = (a: Precio, b: Precio): number =>
  a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0

/** Más antiguo primero. */
export const porFechaAsc = (a: Precio, b: Precio): number => -porFechaDesc(a, b)
