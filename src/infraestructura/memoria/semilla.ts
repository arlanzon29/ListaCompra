import type { Articulo, Lista, Precio, Supermercado, Unidad } from '../../dominio/modelo'

/**
 * Datos de ejemplo del prototipo, reproducidos tal cual para que la aplicación
 * arranque con la misma pantalla que el diseño: 20 artículos, 4 tiendas y tres
 * fechas de precios con huecos deliberados (artículos sin precio en ninguna
 * tienda, tiendas sin apunte) para poder ver esos estados.
 *
 * Desaparece cuando entren los repositorios de Supabase.
 */

const CATALOGO: Array<[string, Unidad, number]> = [
  ['leche', 'l', 0.92],
  ['huevos', 'ud', 0.24],
  ['pimiento verde', 'kg', 2.35],
  ['chuleta de cerdo', 'kg', 6.9],
  ['pan', 'ud', 0.85],
  ['tomate', 'kg', 1.95],
  ['aceite de oliva', 'l', 8.4],
  ['arroz', 'kg', 1.45],
  ['plátano', 'kg', 1.6],
  ['yogur natural', 'ud', 0.38],
  ['pollo entero', 'kg', 3.7],
  ['atún en lata', 'ud', 0.95],
  ['pasta', 'kg', 1.3],
  ['cerveza', 'l', 1.15],
  ['papel higiénico', 'ud', 0.32],
  ['detergente', 'l', 2.6],
  ['manzana', 'kg', 1.85],
  ['lechuga', 'ud', 1.1],
  ['queso curado', 'kg', 12.5],
  ['café molido', 'kg', 9.8],
]

const TIENDAS = ['Mercadona', 'Lidl', 'Alcampo', 'Carrefour']
const FECHAS = ['2026-04-18', '2026-06-07', '2026-08-11']

export type Semilla = {
  articulos: Articulo[]
  supermercados: Supermercado[]
  precios: Precio[]
  listas: Lista[]
}

export const semilla = (): Semilla => {
  const articulos: Articulo[] = CATALOGO.map((a, i) => ({
    id: 'a' + i,
    nombre: a[0],
    unidad: a[1],
  }))
  const supermercados: Supermercado[] = TIENDAS.map((n, i) => ({ id: 's' + i, nombre: n }))
  const precios: Precio[] = []

  // Generador congruencial fijo: la semilla debe salir siempre igual.
  let x = 7
  const rnd = () => {
    x = (x * 1103515245 + 12345) % 2147483648
    return ((x >>> 8) / 8388608) % 1
  }

  articulos.forEach((a, ai) => {
    const base = CATALOGO[ai][2]
    supermercados.forEach((s, si) => {
      if (ai === 18 || ai === 14) return // sin precio en ninguna tienda
      if ((ai + si) % 7 === 0) return // huecos por tienda
      const mult = [1, 0.93, 0.97, 1.05][si] * (1 + (((ai * 7 + si * 11) % 9) - 4) * 0.028)
      FECHAS.forEach((fecha, fi) => {
        if (fi < 2 && rnd() < 0.25) return
        const deriva = 1 + fi * 0.035 + (rnd() - 0.5) * 0.05
        precios.push({
          artId: a.id,
          superId: s.id,
          fecha,
          importe: Math.round(base * mult * deriva * 100) / 100,
        })
      })
    })
  })

  const listas: Lista[] = [
    {
      id: 'l0',
      nombre: 'Semanal',
      items: [
        { artId: 'a0', cant: 4, comprado: true },
        { artId: 'a1', cant: 12, comprado: true },
        { artId: 'a4', cant: 2, comprado: false },
        { artId: 'a5', cant: 1, comprado: false },
        { artId: 'a9', cant: 8, comprado: false },
        { artId: 'a10', cant: 1, comprado: false },
        { artId: 'a16', cant: 2, comprado: false },
        { artId: 'a14', cant: 12, comprado: false },
      ],
    },
    {
      id: 'l1',
      nombre: 'Fin de semana',
      items: [
        { artId: 'a3', cant: 1, comprado: false },
        { artId: 'a13', cant: 6, comprado: false },
        { artId: 'a18', cant: 1, comprado: false },
      ],
    },
    { id: 'l2', nombre: 'Despensa', items: [] },
  ]

  return { articulos, supermercados, precios, listas }
}
