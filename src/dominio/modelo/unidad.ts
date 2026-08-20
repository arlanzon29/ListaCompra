/**
 * Unidad de medida en la que se expresa SIEMPRE el precio de un artículo.
 * Es fija por artículo (la leche siempre en €/l), nunca por precio: es la
 * única forma de que dos supermercados con formatos distintos sean comparables.
 */
export type Unidad = 'l' | 'kg' | 'ud'

export const UNIDADES: Unidad[] = ['l', 'kg', 'ud']

type InfoUnidad = {
  /** Sufijo corto para cifras: «€/l» */
  etiqueta: string
  /** Nombre en singular: «litro» */
  nombre: string
  /** Aviso de la hoja de precio, para que no se apunte el precio del envase */
  aviso: string
}

export const INFO_UNIDAD: Record<Unidad, InfoUnidad> = {
  l: {
    etiqueta: '€/l',
    nombre: 'litro',
    aviso: 'Lo que cuesta UN LITRO, no lo que cuesta el brick o la botella.',
  },
  kg: {
    etiqueta: '€/kg',
    nombre: 'kilo',
    aviso: 'Lo que cuesta UN KILO, no lo que cuesta la bandeja.',
  },
  ud: {
    etiqueta: '€/ud',
    nombre: 'unidad',
    aviso: 'Lo que cuesta UNA unidad, no lo que cuesta el paquete.',
  },
}

export const infoUnidad = (u: Unidad): InfoUnidad => INFO_UNIDAD[u]
