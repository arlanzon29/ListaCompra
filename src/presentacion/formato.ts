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

/**
 * Cuándo se creó algo, contado como lo contaría una persona: «hoy», «ayer»,
 * «hace 5 días» y, a partir de la semana, la fecha entera.
 *
 * `instante` es ISO **con zona** (un `timestamptz` de la base); `hoy` es el
 * día del reloj de la aplicación, en `YYYY-MM-DD`. Se pasa desde fuera y no se
 * mira aquí el reloj del sistema porque el «hoy» de la aplicación es un puerto
 * (`Reloj`), y así esto se puede comprobar sin tocar la hora de la máquina.
 *
 * La cuenta de días se hace sobre el **día local** de cada fecha, no sobre las
 * horas que las separan: si no, una lista de ayer a las once de la noche
 * saldría como «hoy» hasta la mañana siguiente.
 */
export const cuandoSeCreo = (instante: string, hoy: string): string => {
  const d = new Date(instante)
  if (Number.isNaN(d.getTime())) return ''

  // Mediodía para que el cambio de hora no mueva la resta de un día entero.
  const aMediodia = (a: number, m: number, dia: number) => Date.UTC(a, m, dia, 12)
  const dia = aMediodia(d.getFullYear(), d.getMonth(), d.getDate())
  const [ah, mh, dh] = hoy.split('-').map(Number)
  const dias = Math.round((aMediodia(ah, mh - 1, dh) - dia) / 86400000)

  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return d.toLocaleDateString('es-ES')
}

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
