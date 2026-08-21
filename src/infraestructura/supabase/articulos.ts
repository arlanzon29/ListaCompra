import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Articulo, Unidad } from '../../dominio/modelo'
import type { RepositorioArticulos } from '../../dominio/puertos'

/**
 * Catálogo de artículos, contra la tabla `productos` de Supabase.
 *
 * Traducción de identidad, igual que en `supermercados.ts`: el esquema usa
 * **el nombre como clave primaria** (`citext`, así que «Leche» y «leche» son
 * el mismo artículo) y el dominio usa `id`. Aquí `id === nombre`.
 *
 * Consecuencia asumida: renombrar cambia la identidad del objeto. No rompe
 * nada porque el `on update cascade` del esquema arrastra los precios y los
 * items de lista, y la interfaz recarga la instantánea tras cada acción.
 *
 * La columna `unidad` es `varchar(2)` con `check (unidad in ('l','kg','ud'))`,
 * que es exactamente el tipo `Unidad` del dominio: no hace falta traducirla.
 */

/** Fila tal y como viene de la tabla. */
type Fila = { nombre: string; unidad: Unidad; favorito: boolean }

/** Las columnas que la aplicación lee. Escrito una vez para no descuadrarlas. */
const COLUMNAS = 'nombre, unidad, favorito'

const aDominio = (f: Fila): Articulo => ({
  id: f.nombre,
  nombre: f.nombre,
  unidad: f.unidad,
  favorito: f.favorito,
})

/** Los códigos de Postgres que el usuario puede provocar escribiendo. */
const mensaje = (e: PostgrestError): string => {
  if (e.code === '23505') return 'Ya existe un artículo con ese nombre.'
  if (e.code === '23514') {
    // Hay dos `check` en la tabla; el nombre de la restricción dice cuál.
    return e.message.includes('unidad')
      ? 'La unidad debe ser litro, kilo o unidad.'
      : 'El nombre debe tener entre 1 y 50 caracteres.'
  }
  if (e.code === '42501') return 'La sesión no tiene permiso para esto.'
  return e.message
}

export const repositorioArticulosSupabase = (
  sb: SupabaseClient,
): RepositorioArticulos => ({
  async listar(): Promise<Articulo[]> {
    // Ordenado en la base de datos, como las tiendas: así el catálogo no baila
    // cuando se crea un artículo nuevo.
    const { data, error } = await sb
      .from('productos')
      .select(COLUMNAS)
      .order('nombre')
    if (error) throw new Error(mensaje(error))
    return (data as Fila[]).map(aDominio)
  },

  async crear(datos: { nombre: string; unidad: Unidad }): Promise<Articulo> {
    const { data, error } = await sb
      .from('productos')
      .insert({ nombre: datos.nombre, unidad: datos.unidad })
      .select(COLUMNAS)
      .single()
    if (error) throw new Error(mensaje(error))
    return aDominio(data as Fila)
  },

  async editar(id: string, datos: { nombre: string; unidad: Unidad }): Promise<Articulo> {
    const { data, error } = await sb
      .from('productos')
      .update({ nombre: datos.nombre, unidad: datos.unidad })
      .eq('nombre', id)
      .select(COLUMNAS)
      .single()
    if (error) throw new Error(mensaje(error))
    if (!data) throw new Error('El artículo ya no existe.')
    return aDominio(data as Fila)
  },

  /**
   * Una sola columna, y sin `select` de vuelta: la pantalla ya sabe el valor
   * que ha pedido y lo aplica ella. Si el artículo ya no está, el `update` no
   * toca ninguna fila y no da error, que es lo que se quiere: la app la usan
   * dos personas y la otra puede haberlo borrado.
   */
  async marcarFavorito(id: string, favorito: boolean): Promise<void> {
    const { error } = await sb
      .from('productos')
      .update({ favorito })
      .eq('nombre', id)
    if (error) throw new Error(mensaje(error))
  },

  /**
   * El `on delete cascade` del esquema se lleva los precios del artículo y sus
   * apariciones en `lista_items`, que es justo lo que promete el puerto.
   */
  async borrar(id: string): Promise<void> {
    const { error } = await sb.from('productos').delete().eq('nombre', id)
    if (error) throw new Error(mensaje(error))
  },
})
