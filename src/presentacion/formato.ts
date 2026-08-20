/** Formato español de todo lo que se ve en pantalla. */

/**
 * «1,49 €», «0,908 €»
 *
 * Hasta tres decimales porque el importe es por unidad de medida y ahí la
 * milésima distingue tiendas; mínimo dos para que una columna de importes siga
 * cuadrando por la coma.
 */
export const eur = (n: number): string =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) + ' €'

/** «1,49 €/kg» */
export const eurPorUnidad = (n: number, unidad: string): string => `${eur(n)}/${unidad}`

/** '2026-08-11' → '11/08/2026' */
export const fechaLarga = (iso: string): string => iso.split('-').reverse().join('/')

/** '2026-08-11' → '11/08' */
export const fechaCorta = (iso: string): string =>
  iso.split('-').reverse().slice(0, 2).join('/')

/** Importe para un campo de texto: 1.49 → «1,49», 0.908 → «0,908» */
export const importeATexto = (n: number): string =>
  n.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
    useGrouping: false,
  })

/** «+7%», «−3%», «igual» */
export const variacionATexto = (pct: number): string =>
  pct === 0 ? 'igual' : (pct > 0 ? '+' : '') + pct + '%'

export const plural = (n: number, singular: string, plural_: string): string =>
  `${n} ${n === 1 ? singular : plural_}`
