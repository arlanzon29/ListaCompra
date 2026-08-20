import type { Precio, Supermercado } from '../modelo'
import { porFechaAsc, porFechaDesc } from '../modelo'

/**
 * Reglas de negocio de los precios. Funciones puras sobre una colección de
 * precios ya cargada: no saben de dónde viene (memoria, Supabase…).
 */

/** Precio más reciente de un artículo en una tienda concreta. */
export const ultimoPrecio = (
  precios: Precio[],
  artId: string,
  superId: string,
): Precio | null => {
  const suyos = precios
    .filter((p) => p.artId === artId && p.superId === superId)
    .sort(porFechaDesc)
  return suyos[0] ?? null
}

/**
 * El más barato entre los últimos precios de cada tienda.
 * Es lo que se muestra en la fila de la lista y lo que ordena la ficha.
 * `null` si el artículo no tiene precio en ninguna tienda: ese estado se
 * muestra explícitamente, nunca como 0,00 €.
 */
export const mejorPrecio = (
  precios: Precio[],
  supermercados: Supermercado[],
  artId: string,
): Precio | null => {
  let mejor: Precio | null = null
  for (const s of supermercados) {
    const p = ultimoPrecio(precios, artId, s.id)
    if (p && (!mejor || p.importe < mejor.importe)) mejor = p
  }
  return mejor
}

export type FilaComparativa = {
  supermercado: Supermercado
  precio: Precio | null
  /** Porcentaje sobre el más barato. `null` en el más barato y en los que no tienen precio. */
  sobrecoste: number | null
  esMasBarato: boolean
}

/**
 * Comparativa de un artículo: una fila por supermercado, de más barato a más
 * caro, y al final las tiendas donde nunca se ha apuntado nada.
 */
export const comparativa = (
  precios: Precio[],
  supermercados: Supermercado[],
  artId: string,
): FilaComparativa[] => {
  const con = supermercados
    .map((s) => ({ supermercado: s, precio: ultimoPrecio(precios, artId, s.id) }))
    .filter((x): x is { supermercado: Supermercado; precio: Precio } => x.precio !== null)
    .sort((a, b) => a.precio.importe - b.precio.importe)

  const sin = supermercados.filter((s) => !ultimoPrecio(precios, artId, s.id))
  const barato = con.length ? con[0].precio.importe : 0

  return [
    ...con.map((x, i) => ({
      supermercado: x.supermercado,
      precio: x.precio,
      sobrecoste: i === 0 ? null : Math.round((x.precio.importe / barato - 1) * 100),
      esMasBarato: i === 0,
    })),
    ...sin.map((s) => ({
      supermercado: s,
      precio: null,
      sobrecoste: null,
      esMasBarato: false,
    })),
  ]
}

/** Serie histórica de un artículo en una tienda, de antigua a reciente. */
export const serieHistorica = (
  precios: Precio[],
  artId: string,
  superId: string,
): Precio[] =>
  precios.filter((p) => p.artId === artId && p.superId === superId).sort(porFechaAsc)

/** Variación porcentual redondeada de `ahora` respecto a `antes`. */
export const variacion = (ahora: number, antes: number): number =>
  Math.round((ahora / antes - 1) * 100)

/** Cuántos precios se han apuntado hoy en una tienda, dentro de un conjunto de artículos. */
export const apuntadosHoy = (
  precios: Precio[],
  superId: string,
  artIds: string[],
  hoy: string,
): number =>
  artIds.filter((id) =>
    precios.some((p) => p.artId === id && p.superId === superId && p.fecha === hoy),
  ).length
