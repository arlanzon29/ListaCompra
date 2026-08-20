import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Precio } from '../../dominio/modelo'
import type { RepositorioPrecios } from '../../dominio/puertos'

/**
 * Precios apuntados, contra la tabla `precios` de Supabase.
 *
 * Traducción de identidad como en `articulos.ts` y `supermercados.ts`:
 * `Precio.artId` es `productos(nombre)` y `Precio.superId` es
 * `supermercados(nombre)`, porque el nombre *es* la clave primaria de esas dos
 * tablas. (En listas no: allí el id es un uuid de verdad.)
 *
 * Y una traducción de nombre: el dominio dice `importe`, la columna se llama
 * `precio`. Va en los dos sentidos.
 */

/** Fila tal y como viene de la tabla. */
type Fila = {
  producto: string
  supermercado: string
  fecha: string
  precio: number | string
}

const aDominio = (f: Fila): Precio => ({
  artId: f.producto,
  superId: f.supermercado,
  fecha: f.fecha,
  // `numeric` viaja como número en JSON, pero PostgREST lo devuelve como
  // cadena si el valor no cabe en un double. Number() lo deja siempre number.
  importe: Number(f.precio),
})

const COLUMNAS = 'producto, supermercado, fecha, precio'

/**
 * Filas por petición. Es el `max-rows` de PostgREST, que en Supabase son 1000.
 *
 * Comprobado contra la base con 1350 filas: un `select` devuelve 1000 y las
 * otras 350 se pierden **sin error**. Y `.limit(5000)` no lo arregla, que era
 * lo que parecía: el tope lo pone el servidor y el `limit` del cliente solo
 * puede bajarlo, nunca subirlo. Un histórico truncado no se ve como un fallo,
 * se ve como una ficha con menos evolución y una comparativa a la que le
 * faltan tiendas.
 */
const PAGINA = 1000

/**
 * Los códigos de Postgres que el usuario puede provocar apuntando precios.
 *
 * El `23503` no es teórico: la app la usan dos personas a la vez, así que el
 * artículo o la tienda pueden haber desaparecido entre que se pintó la
 * pantalla y se tecleó el precio.
 */
const mensaje = (e: PostgrestError): string => {
  if (e.code === '23503') {
    // Dos claves ajenas; el nombre de la restricción dice cuál se ha roto.
    return e.message.includes('precios_supermercado_fkey')
      ? 'Esa tienda ya no existe. Compruébalo en Ajustes.'
      : 'Ese artículo ya no existe en el catálogo.'
  }
  if (e.code === '23514') return 'El precio no puede ser negativo.'
  // `precio` es numeric(10,3): el teclado limita los decimales, no los enteros.
  if (e.code === '22003') return 'El precio es demasiado grande.'
  if (e.code === '42501') return 'La sesión no tiene permiso para esto.'
  // No debería llegar: el upsert de `guardar` resuelve el conflicto de la
  // restricción única. Si sale, es que el `onConflict` no apunta a ella.
  if (e.code === '23505') return 'Ya hay un precio de ese día en esa tienda.'
  return e.message
}

export const repositorioPreciosSupabase = (sb: SupabaseClient): RepositorioPrecios => ({
  /**
   * El histórico entero, que es lo que espera la instantánea: la ficha dibuja
   * la evolución y la ronda necesita el último precio *anterior a hoy*, así
   * que el precio vigente por sí solo no basta —ni siquiera la vista
   * `precios_actuales`, que da una única fila por producto y tienda—.
   *
   * Va paginado porque el servidor corta a `PAGINA` filas sin avisar. El bucle
   * para en cuanto una página vuelve incompleta, así que mientras haya menos
   * de mil precios apuntados esto es **una sola petición**, igual que antes.
   *
   * El orden lleva `id` detrás de la fecha a propósito: muchos precios comparten
   * día, y sin un desempate único el servidor puede devolverlos en distinto
   * orden en cada página, repitiendo unos y saltándose otros. `id` es la clave
   * primaria, así que no hay empates.
   *
   * Cuando esto necesite tres páginas —unos tres mil precios— toca partir el
   * puerto: `listar()` contra la vista `precios_actuales` y un
   * `historico(artId, superId)` bajo demanda. El motivo no es el tamaño sino
   * que `AppProvider` recarga la instantánea tras cada acción: a tres páginas,
   * cada `+` de una lista son tres viajes seguidos al servidor.
   */
  async listar(): Promise<Precio[]> {
    const todos: Precio[] = []
    for (;;) {
      // `count: 'exact'` viene en la cabecera de la misma petición, no cuesta
      // otra. Es lo que dice cuándo parar: fiarse de que una página corta es
      // la última daría por bueno un recorte del servidor, que es justo el
      // fallo silencioso del que va todo esto.
      const { data, error, count } = await sb
        .from('precios')
        .select(COLUMNAS, { count: 'exact' })
        .order('fecha', { ascending: false })
        .order('id')
        .range(todos.length, todos.length + PAGINA - 1)
      if (error) throw new Error(mensaje(error))
      const filas = data as Fila[]
      for (const f of filas) todos.push(aDominio(f))
      // Sin filas no hay avance posible: se sale aunque la cuenta diga otra
      // cosa, para no dar vueltas para siempre.
      if (!filas.length || todos.length >= (count ?? 0)) return todos
    }
  },

  /**
   * Sustituye el precio de esa fecha en esa tienda, que es lo que promete el
   * puerto: volver a apuntar el mismo día corrige, no duplica.
   *
   * El `onConflict` apunta a la restricción `unique (producto, supermercado,
   * fecha)`, **no** a la clave primaria: esta tabla tiene un `id bigint`
   * automático, así que un upsert sin `onConflict` iría contra el id, no
   * encontraría conflicto nunca e insertaría una fila nueva cada vez.
   */
  async guardar(precio: Precio): Promise<void> {
    const { error } = await sb.from('precios').upsert(
      {
        producto: precio.artId,
        supermercado: precio.superId,
        fecha: precio.fecha,
        precio: precio.importe,
      },
      { onConflict: 'producto,supermercado,fecha' },
    )
    if (error) throw new Error(mensaje(error))
  },

  /** Deshacer un apunte: `guardarPrecio` llama aquí cuando el importe es 0 o vacío. */
  async borrar(artId: string, superId: string, fecha: string): Promise<void> {
    const { error } = await sb
      .from('precios')
      .delete()
      .eq('producto', artId)
      .eq('supermercado', superId)
      .eq('fecha', fecha)
    if (error) throw new Error(mensaje(error))
  },
})
