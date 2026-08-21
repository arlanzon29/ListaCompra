import type { Articulo, Unidad } from '../../dominio/modelo'
import type { Dependencias } from '../dependencias'
import { acompanaImagen } from './imagenes'

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
    const art = await d.articulos.editar(id, { nombre: limpio, unidad })
    // Contra Supabase el id es el nombre, así que renombrar cambia la
    // identidad y la foto hay que llevársela a la ruta nueva.
    if (art.id !== id) await acompanaImagen(d, 'foto', id, art.id)
    return art
  }

/**
 * Marca o desmarca el artículo como favorito.
 *
 * No devuelve el artículo: quien llama ya sabe el valor que ha pedido, y así
 * la pantalla puede aplicarlo sin volver a leer el catálogo entero.
 */
export const marcarFavorito =
  (d: Dependencias) =>
  async (id: string, favorito: boolean): Promise<void> => {
    await d.articulos.marcarFavorito(id, favorito)
  }

/**
 * Borra el artículo, sus precios, sus apariciones en cualquier lista y su foto.
 *
 * La foto va detrás y no en cascada: no está en la base de datos, así que no
 * hay `on delete cascade` que la arrastre.
 */
export const borrarArticulo =
  (d: Dependencias) =>
  async (id: string): Promise<void> => {
    await d.articulos.borrar(id)
    await d.imagenes.quitar('foto', id)
  }
