/**
 * Lo que la pantalla de inicio necesita saber, y nada más.
 *
 * No es una entidad: es una **lectura agregada**. Existe porque inicio solo
 * enseña cuentas, y calcularlas a partir de las entidades obligaba a
 * descargarlas todas —el histórico entero de precios incluido— para acabar
 * pintando tres números.
 *
 * Trae las listas abiertas con sus contadores en vez de «la compra en curso»:
 * cuál es la compra en curso es una decisión de la pantalla, no un dato.
 */

export type ListaAbierta = {
  id: string
  nombre: string
  /** Artículos de la lista. */
  items: number
  /** De esos, los que faltan por coger. */
  pendientes: number
}

export type ResumenInicio = {
  abiertas: ListaAbierta[]
  /** Artículos del catálogo sin precio en ninguna tienda. */
  sinPrecio: number
}
