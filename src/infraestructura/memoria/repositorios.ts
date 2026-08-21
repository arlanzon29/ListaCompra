import type {
  Articulo,
  ItemLista,
  Lista,
  Precio,
  ResumenInicio,
  Supermercado,
  Unidad,
} from '../../dominio/modelo'
import { estaAbierta, pendientes } from '../../dominio/modelo'
import type {
  MapaImagenes,
  RepositorioArticulos,
  RepositorioImagenes,
  RepositorioListas,
  RepositorioPrecios,
  RepositorioResumen,
  RepositorioSupermercados,
  TipoImagen,
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
    const art: Articulo = {
      id: nuevoId('a'),
      nombre: datos.nombre,
      unidad: datos.unidad,
      favorito: false,
    }
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
  async marcarFavorito(id: string, favorito: boolean): Promise<void> {
    // Idempotente y silencioso si ya no está, igual que contra Supabase.
    const art = a.articulos.find((x) => x.id === id)
    if (art) art.favorito = favorito
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

/**
 * Imágenes sin servidor: el fichero se queda en el navegador y se sirve por
 * `blob:`.
 *
 * Solo se usa en el camino sin `.env`, donde todo está simulado. No sobrevive a
 * una recarga a propósito: guardarlas en `localStorage` es lo que hacía la
 * aplicación antes de esta fase, y llenaba el cupo del navegador con dos fotos.
 *
 * Aquí no hace falta `renombrar`: en memoria los ids se generan (`a1`, `s2`…) y
 * no cambian al renombrar, así que el caso de uso nunca lo llama.
 */
export const repositorioImagenesMemoria = (a: Almacen): RepositorioImagenes => ({
  async listar(): Promise<Record<TipoImagen, MapaImagenes>> {
    return { foto: { ...a.imagenes.foto }, logo: { ...a.imagenes.logo } }
  },
  async guardar(tipo: TipoImagen, id: string, fichero: Blob): Promise<void> {
    const url = URL.createObjectURL(fichero)
    // Sin servidor no hay dos tamaños: es el mismo fichero visto dos veces.
    a.imagenes[tipo][id.toLowerCase()] = { fila: url, ficha: url }
  },
  async quitar(tipo: TipoImagen, id: string): Promise<void> {
    const clave = id.toLowerCase()
    const previa = a.imagenes[tipo][clave]
    if (previa) URL.revokeObjectURL(previa.ficha)
    delete a.imagenes[tipo][clave]
  },
  async renombrar(tipo: TipoImagen, id: string, nuevoId: string): Promise<void> {
    const clave = id.toLowerCase()
    const previa = a.imagenes[tipo][clave]
    if (!previa) return
    delete a.imagenes[tipo][clave]
    a.imagenes[tipo][nuevoId.toLowerCase()] = previa
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

/**
 * El gemelo de los `eq('lista', …).eq('producto', …)` de Supabase: cambia los
 * items de una lista y deja las demás intactas. Si la lista no está, no pasa
 * nada, igual que un `update` que no encuentra fila.
 */
const tocaItems = (
  a: Almacen,
  listaId: string,
  f: (items: ItemLista[]) => ItemLista[],
): void => {
  a.listas = a.listas.map((l) => (l.id === listaId ? { ...l, items: f(l.items) } : l))
}

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
  async marcarComprado(listaId: string, artId: string, comprado: boolean): Promise<void> {
    tocaItems(a, listaId, (items) =>
      items.map((i) => (i.artId === artId ? { ...i, comprado } : i)),
    )
  },
  async fijarCantidad(listaId: string, artId: string, cant: number): Promise<void> {
    tocaItems(a, listaId, (items) =>
      items.map((i) => (i.artId === artId ? { ...i, cant } : i)),
    )
  },
  async quitarItem(listaId: string, artId: string): Promise<void> {
    tocaItems(a, listaId, (items) => items.filter((i) => i.artId !== artId))
  },
  async cambiarCierre(listaId: string, cerrada: boolean): Promise<void> {
    a.listas = a.listas.map((l) => (l.id === listaId ? { ...l, cerrada } : l))
  },
})

/**
 * El gemelo en memoria de la función `resumen_inicio()`.
 *
 * Aquí no hay nada que optimizar —el almacén ya está en RAM—, así que su valor
 * es otro: que el proyecto siga arrancando sin `.env` y que quede escrito, en
 * JavaScript legible, qué cuenta exactamente cada cifra. Si alguna vez las dos
 * implementaciones discrepan, esta es la que dice cuál era la intención.
 */
export const repositorioResumenMemoria = (a: Almacen): RepositorioResumen => ({
  async inicio(): Promise<ResumenInicio> {
    return {
      sinPrecio: a.articulos.filter((art) => !a.precios.some((p) => p.artId === art.id)).length,
      abiertas: a.listas
        .filter(estaAbierta)
        .map((l) => ({
          id: l.id,
          nombre: l.nombre,
          items: l.items.length,
          pendientes: pendientes(l).length,
        }))
        // La función ordena por nombre; sin esto las dos no coincidirían.
        .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es')),
    }
  },
})
