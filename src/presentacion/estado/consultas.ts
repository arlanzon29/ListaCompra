import type { Instantanea } from '../../aplicacion'
import type { Articulo, Lista, Precio, Supermercado } from '../../dominio/modelo'
import { comparativa, mejorPrecio, ultimoPrecio } from '../../dominio/servicios/precios'

/**
 * Lecturas sobre la instantánea cargada. Son atajos de presentación: la regla
 * de negocio vive en `dominio/servicios/precios`, aquí solo se le pasa el
 * contexto que ya tiene la pantalla.
 */

export const articulo = (d: Instantanea, id: string): Articulo | undefined =>
  d.articulos.find((a) => a.id === id)

export const supermercado = (d: Instantanea, id: string): Supermercado | undefined =>
  d.supermercados.find((s) => s.id === id)

export const lista = (d: Instantanea, id: string): Lista | undefined =>
  d.listas.find((l) => l.id === id)

export const ultimo = (d: Instantanea, artId: string, superId: string): Precio | null =>
  ultimoPrecio(d.precios, artId, superId)

export const mejor = (d: Instantanea, artId: string): Precio | null =>
  mejorPrecio(d.precios, d.supermercados, artId)

export const comparativaDe = (d: Instantanea, artId: string) =>
  comparativa(d.precios, d.supermercados, artId)

export const listasAbiertas = (d: Instantanea): Lista[] => d.listas.filter((l) => !l.cerrada)

export const listasCerradas = (d: Instantanea): Lista[] => d.listas.filter((l) => l.cerrada)

/** Filtra el catálogo por el texto del buscador. Ya viene ordenado por nombre. */
export const buscaArticulos = (d: Instantanea, q: string): Articulo[] => {
  const t = q.trim().toLowerCase()
  return t ? d.articulos.filter((a) => a.nombre.toLowerCase().includes(t)) : d.articulos
}
