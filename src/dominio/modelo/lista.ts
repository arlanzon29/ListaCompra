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
  /**
   * Cuándo se creó, en ISO completo con zona: `2026-08-21T08:37:00.123Z`.
   *
   * Es un **instante**, no un día, y por eso no va en `YYYY-MM-DD` como
   * `Precio.fecha`. La diferencia importa: `listas.created_at` es un
   * `timestamptz`, y cortar su ISO por la `T` da el día en UTC, que a partir
   * de las diez de la noche en España ya es el de mañana. El día se calcula
   * en la pantalla, en la zona de quien mira.
   */
  creada: string
}

export const pendientes = (l: Lista): ItemLista[] => l.items.filter((i) => !i.comprado)

export const estaAbierta = (l: Lista): boolean => !l.cerrada

/**
 * Los artículos ya cogidos bajan al final. `sort` es estable en JS moderno,
 * así que el resto conserva el orden en que se añadió.
 */
export const ordenDeCompra = (items: ItemLista[]): ItemLista[] =>
  items.slice().sort((a, b) => (a.comprado ? 1 : 0) - (b.comprado ? 1 : 0))
