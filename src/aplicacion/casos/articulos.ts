import type { Articulo, Unidad } from '../../dominio/modelo'
import type { Dependencias } from '../dependencias'

export const crearArticulo =
  (d: Dependencias) =>
  async (nombre: string, unidad: Unidad): Promise<Articulo> => {
    const limpio = nombre.trim()
    if (!limpio) throw new Error('El artículo necesita un nombre.')
    return d.articulos.crear({ nombre: limpio, unidad })
  }

export const editarArticulo =
  (d: Dependencias) =>
  async (id: string, nombre: string, unidad: Unidad): Promise<Articulo> => {
    const limpio = nombre.trim()
    if (!limpio) throw new Error('El artículo necesita un nombre.')
    return d.articulos.editar(id, { nombre: limpio, unidad })
  }

/** Borra el artículo, sus precios y sus apariciones en cualquier lista. */
export const borrarArticulo =
  (d: Dependencias) =>
  async (id: string): Promise<void> => {
    await d.articulos.borrar(id)
  }
