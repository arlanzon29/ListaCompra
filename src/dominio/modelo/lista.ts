export type ItemLista = {
  artId: string
  cant: number
  comprado: boolean
}

export type Lista = {
  id: string
  nombre: string
  items: ItemLista[]
  /** Una lista cerrada es de solo consulta: no admite cambios. */
  cerrada?: boolean
}

export const pendientes = (l: Lista): ItemLista[] => l.items.filter((i) => !i.comprado)

export const estaAbierta = (l: Lista): boolean => !l.cerrada

/**
 * Los artículos ya cogidos bajan al final. `sort` es estable en JS moderno,
 * así que el resto conserva el orden en que se añadió.
 */
export const ordenDeCompra = (items: ItemLista[]): ItemLista[] =>
  items.slice().sort((a, b) => (a.comprado ? 1 : 0) - (b.comprado ? 1 : 0))
