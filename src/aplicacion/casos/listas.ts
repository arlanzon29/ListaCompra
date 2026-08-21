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

/**
 * Crea una lista nueva con los artículos y las cantidades de otra.
 *
 * Existe porque las compras se parecen mucho de una semana a otra, y montar a
 * mano la de esta semana era volver a escribir la de la anterior.
 *
 * Cuatro decisiones, y ninguna es evidente:
 *
 * - **Lo comprado no se copia.** La copia nace con todo por coger; si no, sería
 *   una lista terminada, que no sirve para ir a comprar.
 * - **El nombre se repite tal cual.** No lleva «(copia)» ni la fecha: las dos
 *   se distinguen por *cuándo se crearon*, que es lo que enseña la pantalla de
 *   listas desde que `Lista.creada` viaja con ella. Meter la fecha en el
 *   nombre la metería también en el título de la pantalla de la lista, donde
 *   estorba.
 * - **Se lee del repositorio y no de lo que tenga la pantalla.** La app la usan
 *   dos personas: lo que se copia es lo que hay guardado ahora, no lo que se
 *   pintó hace un rato.
 * - **Se duplica también una lista abierta.** El puerto no distingue, y no hay
 *   motivo para prohibirlo; quien decide desde dónde se ofrece es la pantalla.
 *
 * Son tres peticiones —leer, crear, escribir los items—, y la tercera se salta
 * si la lista original está vacía. Aquí `guardarItems` **sí** es lo que toca:
 * es un cambio en bloque, que es justo para lo que existe.
 */
export const duplicarLista =
  (d: Dependencias) =>
  async (listaId: string): Promise<Lista | null> => {
    const original = await d.listas.obtener(listaId)
    if (!original) return null

    const copia = await d.listas.crear(original.nombre)
    if (!original.items.length) return copia

    const items: ItemLista[] = original.items.map((i) => ({
      artId: i.artId,
      cant: i.cant,
      comprado: false,
    }))
    await d.listas.guardarItems(copia.id, items)
    return { ...copia, items }
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
