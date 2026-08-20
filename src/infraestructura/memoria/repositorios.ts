import type { Articulo, ItemLista, Lista, Precio, Supermercado, Unidad } from '../../dominio/modelo'
import type {
  RepositorioArticulos,
  RepositorioListas,
  RepositorioPrecios,
  RepositorioSupermercados,
} from '../../dominio/puertos'
import { copia, nuevoId, type Almacen } from './almacen'

/**
 * Implementación de los puertos contra memoria. Es el mock que sostiene la
 * aplicación hasta que entren los repositorios de Supabase; los casos de uso no
 * cambian al sustituirlos.
 */

export const repositorioArticulosMemoria = (a: Almacen): RepositorioArticulos => ({
  async listar(): Promise<Articulo[]> {
    return copia(a.articulos)
  },
  async crear(datos: { nombre: string; unidad: Unidad }): Promise<Articulo> {
    const art: Articulo = { id: nuevoId('a'), nombre: datos.nombre, unidad: datos.unidad }
    a.articulos.push(art)
    return { ...art }
  },
  async editar(id: string, datos: { nombre: string; unidad: Unidad }): Promise<Articulo> {
    const art = a.articulos.find((x) => x.id === id)
    if (!art) throw new Error('El artículo ya no existe.')
    art.nombre = datos.nombre
    art.unidad = datos.unidad
    return { ...art }
  },
  async borrar(id: string): Promise<void> {
    a.articulos = a.articulos.filter((x) => x.id !== id)
    a.precios = a.precios.filter((p) => p.artId !== id)
    a.listas = a.listas.map((l) => ({ ...l, items: l.items.filter((i) => i.artId !== id) }))
  },
})

export const repositorioSupermercadosMemoria = (a: Almacen): RepositorioSupermercados => ({
  async listar(): Promise<Supermercado[]> {
    return copia(a.supermercados)
  },
  async crear(nombre: string): Promise<Supermercado> {
    const s: Supermercado = { id: nuevoId('s'), nombre }
    a.supermercados.push(s)
    return { ...s }
  },
  async renombrar(id: string, nombre: string): Promise<Supermercado> {
    const s = a.supermercados.find((x) => x.id === id)
    if (!s) throw new Error('El supermercado ya no existe.')
    s.nombre = nombre
    return { ...s }
  },
  async borrar(id: string): Promise<void> {
    a.supermercados = a.supermercados.filter((x) => x.id !== id)
    a.precios = a.precios.filter((p) => p.superId !== id)
  },
})

export const repositorioPreciosMemoria = (a: Almacen): RepositorioPrecios => ({
  async listar(): Promise<Precio[]> {
    return copia(a.precios)
  },
  async guardar(precio: Precio): Promise<void> {
    a.precios = a.precios
      .filter(
        (p) =>
          !(
            p.artId === precio.artId &&
            p.superId === precio.superId &&
            p.fecha === precio.fecha
          ),
      )
      .concat([{ ...precio }])
  },
  async borrar(artId: string, superId: string, fecha: string): Promise<void> {
    a.precios = a.precios.filter(
      (p) => !(p.artId === artId && p.superId === superId && p.fecha === fecha),
    )
  },
})

export const repositorioListasMemoria = (a: Almacen): RepositorioListas => ({
  async listar(): Promise<Lista[]> {
    return a.listas.map((l) => ({ ...l, items: copia(l.items) }))
  },
  async obtener(id: string): Promise<Lista | null> {
    const l = a.listas.find((x) => x.id === id)
    return l ? { ...l, items: copia(l.items) } : null
  },
  async crear(nombre: string): Promise<Lista> {
    const l: Lista = { id: nuevoId('l'), nombre, items: [] }
    a.listas.push(l)
    return { ...l, items: [] }
  },
  async guardarItems(listaId: string, items: ItemLista[]): Promise<void> {
    a.listas = a.listas.map((l) => (l.id === listaId ? { ...l, items: copia(items) } : l))
  },
  async cambiarCierre(listaId: string, cerrada: boolean): Promise<void> {
    a.listas = a.listas.map((l) => (l.id === listaId ? { ...l, cerrada } : l))
  },
})
