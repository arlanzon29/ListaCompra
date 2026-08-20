import type { Supermercado } from '../../dominio/modelo'
import type { Dependencias } from '../dependencias'

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
    await d.supermercados.renombrar(id, limpio)
  }

/** Borra la tienda y todos los precios apuntados en ella. */
export const borrarSupermercado =
  (d: Dependencias) =>
  async (id: string): Promise<void> => {
    await d.supermercados.borrar(id)
  }
