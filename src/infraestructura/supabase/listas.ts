import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { ItemLista, Lista } from '../../dominio/modelo'
import type { RepositorioListas } from '../../dominio/puertos'

/**
 * Listas de la compra, contra las tablas `listas` y `lista_items` de Supabase.
 *
 * Aquí **no** hay traducción de identidad, al revés que en `articulos.ts` y
 * `supermercados.ts`: `listas.id` es un `uuid` de verdad, así que
 * `Lista.id === listas.id`. El truco de `id = nombre` es exclusivo de productos
 * y supermercados, donde el nombre *es* la clave primaria.
 *
 * `ItemLista.artId` sí es el **nombre** del artículo, porque
 * `lista_items.producto` referencia `productos(nombre)`. Encaja sin traducir.
 *
 * `listas.cerrada` la añadió la migración `supabase/migracion-01-lista-cerrada.sql`:
 * el dominio tiene `Lista.cerrada` desde la fase 1, pero la tabla nació sin esa
 * columna.
 */

/** Filas tal y como vienen de las tablas. */
type FilaItem = { producto: string; cantidad: number; comprado: boolean }
type FilaLista = {
  id: string
  nombre: string
  cerrada: boolean
  lista_items: FilaItem[] | null
}

const itemADominio = (f: FilaItem): ItemLista => ({
  artId: f.producto,
  // `numeric` viaja como número en JSON, pero PostgREST puede devolverlo como
  // cadena si el valor no cabe en un double. Number() lo deja siempre en number.
  cant: Number(f.cantidad),
  comprado: f.comprado,
})

const aDominio = (f: FilaLista): Lista => ({
  id: f.id,
  nombre: f.nombre,
  cerrada: f.cerrada,
  items: (f.lista_items ?? []).map(itemADominio),
})

/** Las columnas que se piden, con los items embebidos en la misma consulta. */
const SELECCION = 'id, nombre, cerrada, lista_items(producto, cantidad, comprado)'

/**
 * Los códigos de Postgres que el usuario puede provocar tocando la interfaz.
 *
 * El `23503` no es teórico: la app la usan dos personas a la vez, así que el
 * artículo —o la lista entera— puede haber desaparecido entre que se pintó la
 * pantalla y se tocó el botón.
 */
const mensaje = (e: PostgrestError): string => {
  if (e.code === '23505') return 'Ese artículo ya está en la lista.'
  if (e.code === '23503') {
    return e.message.includes('lista_items_lista_fkey')
      ? 'Esa lista ya no existe. Vuelve a Listas para ver las que hay.'
      : 'Ese artículo ya no existe en el catálogo.'
  }
  if (e.code === '23514') {
    // Dos `check` en juego: la cantidad de `lista_items` y el nombre de `listas`.
    return e.message.includes('cantidad')
      ? 'La cantidad tiene que ser mayor que cero.'
      : 'El nombre debe tener entre 1 y 50 caracteres.'
  }
  // `listas.nombre` es varchar(50): pasarse de largo no es un `check`, es un
  // truncamiento, y llega con otro código.
  if (e.code === '22001') return 'El nombre debe tener entre 1 y 50 caracteres.'
  if (e.code === '22003') return 'La cantidad es demasiado grande.'
  if (e.code === '42501') return 'La sesión no tiene permiso para esto.'
  return e.message
}

/** Un id que no es un uuid válido: Postgres lo rechaza al comparar. */
const idNoValido = (e: PostgrestError): boolean => e.code === '22P02'

/**
 * Formatea valores para el operador `in` de PostgREST: `("a","b")`.
 *
 * Se citan siempre y se escapan `\` y `"`, porque los nombres de artículo son
 * texto libre y una coma o un paréntesis romperían la lista.
 */
const listaIn = (valores: string[]): string =>
  `(${valores.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`

export const repositorioListasSupabase = (sb: SupabaseClient): RepositorioListas => ({
  /**
   * Las listas con sus items en una sola consulta: PostgREST embebe
   * `lista_items` siguiendo la clave ajena.
   *
   * Los items van ordenados por nombre de artículo porque la tabla no guarda
   * el orden en que se añadieron —no hay columna para eso— y sin `order` el
   * servidor los devuelve como quiere: las filas bailarían en cada recarga.
   */
  async listar(): Promise<Lista[]> {
    const { data, error } = await sb
      .from('listas')
      .select(SELECCION)
      .order('created_at')
      .order('producto', { referencedTable: 'lista_items' })
    if (error) throw new Error(mensaje(error))
    return (data as unknown as FilaLista[]).map(aDominio)
  },

  async obtener(id: string): Promise<Lista | null> {
    const { data, error } = await sb
      .from('listas')
      .select(SELECCION)
      .eq('id', id)
      .order('producto', { referencedTable: 'lista_items' })
      .maybeSingle()
    if (error) {
      // Un id que ni siquiera es un uuid es «no existe», no un fallo que
      // contar: el puerto ya devuelve null para eso.
      if (idNoValido(error)) return null
      throw new Error(mensaje(error))
    }
    return data ? aDominio(data as unknown as FilaLista) : null
  },

  async crear(nombre: string): Promise<Lista> {
    const { data, error } = await sb
      .from('listas')
      .insert({ nombre })
      .select('id, nombre, cerrada')
      .single()
    if (error) throw new Error(mensaje(error))
    const f = data as { id: string; nombre: string; cerrada: boolean }
    return { id: f.id, nombre: f.nombre, cerrada: f.cerrada, items: [] }
  },

  /**
   * Sustituye los items de la lista por los que se pasan, que es lo que promete
   * el puerto y lo que espera cada caso de uso.
   *
   * PostgREST no da transacciones, así que «sustituir» son dos peticiones. El
   * orden **escribir primero, borrar después** está elegido a propósito: si la
   * segunda falla —se cae la conexión en el pasillo— la lista se queda con
   * items de más, nunca de menos. Y como cada guardado manda el conjunto
   * completo, el siguiente cambio que salga bien la deja correcta sola.
   *
   * Al revés, un fallo entre medias dejaría la lista vaciada.
   *
   * Todos los errores de datos —artículo borrado, cantidad no válida, RLS—
   * saltan en el `upsert`, que va primero: si ese falla, no se ha borrado nada.
   */
  async guardarItems(listaId: string, items: ItemLista[]): Promise<void> {
    if (items.length) {
      const filas = items.map((i) => ({
        lista: listaId,
        producto: i.artId,
        cantidad: i.cant,
        comprado: i.comprado,
      }))
      const { error } = await sb
        .from('lista_items')
        .upsert(filas, { onConflict: 'lista,producto' })
      if (error) throw new Error(mensaje(error))
    }

    let borrado = sb.from('lista_items').delete().eq('lista', listaId)
    if (items.length) {
      borrado = borrado.not('producto', 'in', listaIn(items.map((i) => i.artId)))
    }
    const { error } = await borrado
    if (error) throw new Error(mensaje(error))
  },

  async cambiarCierre(listaId: string, cerrada: boolean): Promise<void> {
    const { error } = await sb.from('listas').update({ cerrada }).eq('id', listaId)
    if (error) throw new Error(mensaje(error))
  },
})
