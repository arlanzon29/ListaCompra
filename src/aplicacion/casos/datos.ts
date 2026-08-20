import type { Articulo, Lista, Precio, Supermercado } from '../../dominio/modelo'
import { porNombre } from '../../dominio/modelo'
import type { Dependencias } from '../dependencias'

export type Instantanea = {
  articulos: Articulo[]
  supermercados: Supermercado[]
  precios: Precio[]
  listas: Lista[]
}

/**
 * Carga todo el estado compartido de una vez.
 *
 * Son cuatro tablas pequeñas (un catálogo doméstico, cuatro tiendas) y la
 * pantalla de inicio ya necesita las cuatro para sus cifras, así que una carga
 * completa sale más barata que ir pidiendo trozos por pantalla.
 */
export const cargarTodo =
  (d: Dependencias) =>
  async (): Promise<Instantanea> => {
    const [articulos, supermercados, precios, listas] = await Promise.all([
      d.articulos.listar(),
      d.supermercados.listar(),
      d.precios.listar(),
      d.listas.listar(),
    ])
    return { articulos: articulos.slice().sort(porNombre), supermercados, precios, listas }
  }
