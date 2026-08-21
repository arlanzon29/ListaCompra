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

/**
 * Filtra el catálogo por el texto del buscador y, si se pide, por favoritos.
 * Ya viene ordenado por nombre.
 *
 * Los dos filtros se cruzan (y no se suman): buscando «lech» con «solo
 * favoritos» puesto salen las leches favoritas, no todas las leches más todos
 * los favoritos.
 */
export const buscaArticulos = (
  d: Instantanea,
  q: string,
  soloFavoritos = false,
): Articulo[] => {
  const t = q.trim().toLowerCase()
  return d.articulos.filter(
    (a) =>
      (!t || a.nombre.toLowerCase().includes(t)) && (!soloFavoritos || a.favorito),
  )
}

/** Cuántos favoritos hay. Lo usa el filtro para saber si tiene sentido ofrecerse. */
export const cuentaFavoritos = (d: Instantanea): number =>
  d.articulos.filter((a) => a.favorito).length
