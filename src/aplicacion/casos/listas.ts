import type { ItemLista, Lista } from '../../dominio/modelo'
import { parseaDictado } from '../../dominio/servicios/dictado'
import type { Dependencias } from '../dependencias'

/**
 * Una lista cerrada es de solo consulta. Los casos de uso que la modifican
 * salen sin hacer nada en vez de fallar: la interfaz ya deshabilita los
 * controles, esto es la red de seguridad.
 *
 * Solo lo usan los que **ya tienen** que leer la lista por otro motivo: añadir
 * necesita saber si el artículo estaba, y el dictado necesita las cantidades
 * para sumarlas. Los que tocan un item suelto —comprado, cantidad, quitar— no
 * pasan por aquí: leer la lista entera para comprobar un booleano costaba más
 * que el cambio en sí. En esos, quien impide tocar una lista cerrada es
 * `bloqueada` en `DetalleLista`.
 *
 * Y la red de seguridad era más fina de lo que parecía: entre esta lectura y
 * la escritura que viene después caben los 90 ms en los que la otra persona
 * puede cerrar la lista, así que tampoco cerraba esa puerta del todo.
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
    await d.listas.quitarItem(listaId, artId)
  }

/**
 * Deja la cantidad en `cant`. Llegar a cero elimina el artículo de la lista:
 * en el pasillo, «ya no lo quiero» y «cero unidades» son lo mismo.
 *
 * Recibe la cantidad **resultante**, no un incremento. La pantalla ya está
 * pintando la actual, así que sumar o restar uno lo hace ella; lo que decide
 * este caso de uso es la regla del cero, que es lo único que es negocio.
 *
 * Antes recibía un `delta` y por eso tenía que leerse la lista entera del
 * servidor solo para saber de qué número partía.
 *
 * Devuelve **si el artículo sigue en la lista**. No es un adorno: quien llama
 * tiene que reflejar el cambio, y sin esto tendría que volver a preguntarse
 * «¿cero significa quitar?» por su cuenta. La regla se decide aquí una vez.
 */
export const cambiarCantidad =
  (d: Dependencias) =>
  async (listaId: string, artId: string, cant: number): Promise<boolean> => {
    if (cant <= 0) {
      await d.listas.quitarItem(listaId, artId)
      return false
    }
    await d.listas.fijarCantidad(listaId, artId, cant)
    return true
  }

/**
 * Deja `comprado` en el valor que se pida, sin leer el actual: la casilla que
 * se acaba de tocar ya sabe cuál era, y así el toque es una sola petición.
 *
 * Se llamaba `alternarComprado` y no podía serlo: «alternar» obliga a conocer
 * el valor de partida, y conocerlo costaba traerse la lista.
 */
export const marcarComprado =
  (d: Dependencias) =>
  async (listaId: string, artId: string, comprado: boolean): Promise<void> => {
    await d.listas.marcarComprado(listaId, artId, comprado)
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
