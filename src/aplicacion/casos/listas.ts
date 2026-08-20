import type { ItemLista, Lista } from '../../dominio/modelo'
import { parseaDictado } from '../../dominio/servicios/dictado'
import type { Dependencias } from '../dependencias'

/**
 * Una lista cerrada es de solo consulta. Los casos de uso que la modifican
 * salen sin hacer nada en vez de fallar: la interfaz ya deshabilita los
 * controles, esto es la red de seguridad.
 */
const abiertaONada = async (d: Dependencias, listaId: string): Promise<Lista | null> => {
  const lista = await d.listas.obtener(listaId)
  if (!lista || lista.cerrada) return null
  return lista
}

export const crearLista =
  (d: Dependencias) =>
  async (nombre: string): Promise<Lista | null> => {
    const limpio = nombre.trim()
    if (!limpio) return null
    return d.listas.crear(limpio)
  }

export const cerrarLista =
  (d: Dependencias) =>
  async (listaId: string): Promise<void> => {
    await d.listas.cambiarCierre(listaId, true)
  }

export const reabrirLista =
  (d: Dependencias) =>
  async (listaId: string): Promise<void> => {
    await d.listas.cambiarCierre(listaId, false)
  }

/** Si el artículo ya está en la lista, no se duplica. */
export const anadirArticuloALista =
  (d: Dependencias) =>
  async (listaId: string, artId: string, cant = 1): Promise<void> => {
    const lista = await abiertaONada(d, listaId)
    if (!lista) return
    if (lista.items.some((i) => i.artId === artId)) return
    await d.listas.guardarItems(listaId, [...lista.items, { artId, cant, comprado: false }])
  }

export const quitarArticuloDeLista =
  (d: Dependencias) =>
  async (listaId: string, artId: string): Promise<void> => {
    const lista = await abiertaONada(d, listaId)
    if (!lista) return
    await d.listas.guardarItems(
      listaId,
      lista.items.filter((i) => i.artId !== artId),
    )
  }

/**
 * Suma `delta` a la cantidad. Bajar de 1 elimina el artículo de la lista:
 * en el pasillo, «ya no lo quiero» y «cero unidades» son lo mismo.
 */
export const cambiarCantidad =
  (d: Dependencias) =>
  async (listaId: string, artId: string, delta: number): Promise<void> => {
    const lista = await abiertaONada(d, listaId)
    if (!lista) return
    const items = lista.items.flatMap((i) => {
      if (i.artId !== artId) return [i]
      const cant = i.cant + delta
      return cant > 0 ? [{ ...i, cant }] : []
    })
    await d.listas.guardarItems(listaId, items)
  }

export const alternarComprado =
  (d: Dependencias) =>
  async (listaId: string, artId: string): Promise<void> => {
    const lista = await abiertaONada(d, listaId)
    if (!lista) return
    await d.listas.guardarItems(
      listaId,
      lista.items.map((i) => (i.artId === artId ? { ...i, comprado: !i.comprado } : i)),
    )
  }

/**
 * Mete de golpe lo dictado o pegado, sumando cantidades a lo que ya estaba en
 * la lista.
 *
 * Solo mete artículos **que ya están en el catálogo**: lo que no casa lo
 * descarta `parseaDictado` y aquí no llega. Dar de alta un artículo se hace
 * desde Catálogo, que es donde se elige la unidad.
 */
export const insertarDictado =
  (d: Dependencias) =>
  async (listaId: string, texto: string): Promise<number> => {
    const lista = await abiertaONada(d, listaId)
    if (!lista) return 0

    const catalogo = await d.articulos.listar()
    const lineas = parseaDictado(texto, catalogo, lista)
    if (!lineas.length) return 0

    const nuevos: ItemLista[] = lineas.map((l) => ({
      artId: l.artId,
      cant: l.cant,
      comprado: false,
    }))

    let items = lista.items.slice()
    for (const n of nuevos) {
      const i = items.findIndex((x) => x.artId === n.artId)
      if (i >= 0) items[i] = { ...items[i], cant: items[i].cant + n.cant, comprado: false }
      else items = items.concat([n])
    }

    await d.listas.guardarItems(listaId, items)
    return nuevos.length
  }
