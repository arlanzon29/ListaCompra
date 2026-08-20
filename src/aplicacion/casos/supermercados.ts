import type { Supermercado } from '../../dominio/modelo'
import type { Dependencias } from '../dependencias'
import { acompanaImagen } from './imagenes'

export const crearSupermercado =
  (d: Dependencias) =>
  async (nombre: string): Promise<Supermercado | null> => {
    const limpio = nombre.trim()
    if (!limpio) return null
    return d.supermercados.crear(limpio)
  }

export const renombrarSupermercado =
  (d: Dependencias) =>
  async (id: string, nombre: string): Promise<void> => {
    const limpio = nombre.trim()
    if (!limpio) return
    const tienda = await d.supermercados.renombrar(id, limpio)
    // Igual que en artículos: contra Supabase el id es el nombre.
    if (tienda.id !== id) await acompanaImagen(d, 'logo', id, tienda.id)
  }

/** Borra la tienda, todos los precios apuntados en ella y su logo. */
export const borrarSupermercado =
  (d: Dependencias) =>
  async (id: string): Promise<void> => {
    await d.supermercados.borrar(id)
    await d.imagenes.quitar('logo', id)
  }
