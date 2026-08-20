import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Supermercado } from '../../dominio/modelo'
import type { RepositorioSupermercados } from '../../dominio/puertos'

/**
 * Tiendas, contra la tabla `supermercados` de Supabase.
 *
 * Traducción de identidad: el esquema usa **el nombre como clave primaria**
 * (`citext`, así que «Lidl» y «lidl» son la misma tienda) y el dominio usa
 * `id`. Aquí `id === nombre`.
 *
 * Consecuencia asumida: renombrar cambia la identidad del objeto. No rompe
 * nada porque el `on update cascade` del esquema arrastra los precios y los
 * items de lista, y la interfaz recarga la instantánea tras cada acción.
 */

/** Fila tal y como viene de la tabla. */
type Fila = { nombre: string }

const aDominio = (f: Fila): Supermercado => ({ id: f.nombre, nombre: f.nombre })

/** Los códigos de Postgres que el usuario puede provocar escribiendo. */
const mensaje = (e: PostgrestError): string => {
  if (e.code === '23505') return 'Ya existe una tienda con ese nombre.'
  if (e.code === '23514') return 'El nombre debe tener entre 1 y 50 caracteres.'
  if (e.code === '42501') return 'La sesión no tiene permiso para esto.'
  return e.message
}

export const repositorioSupermercadosSupabase = (
  sb: SupabaseClient,
): RepositorioSupermercados => ({
  async listar(): Promise<Supermercado[]> {
    // Ordenado en la base de datos: así la pantalla de ajustes no baila cuando
    // se añade una tienda nueva.
    const { data, error } = await sb
      .from('supermercados')
      .select('nombre')
      .order('nombre')
    if (error) throw new Error(mensaje(error))
    return (data as Fila[]).map(aDominio)
  },

  async crear(nombre: string): Promise<Supermercado> {
    const { data, error } = await sb
      .from('supermercados')
      .insert({ nombre })
      .select('nombre')
      .single()
    if (error) throw new Error(mensaje(error))
    return aDominio(data as Fila)
  },

  async renombrar(id: string, nombre: string): Promise<Supermercado> {
    const { data, error } = await sb
      .from('supermercados')
      .update({ nombre })
      .eq('nombre', id)
      .select('nombre')
      .single()
    if (error) throw new Error(mensaje(error))
    if (!data) throw new Error('El supermercado ya no existe.')
    return aDominio(data as Fila)
  },

  /** El `on delete cascade` del esquema se lleva los precios de esa tienda. */
  async borrar(id: string): Promise<void> {
    const { error } = await sb.from('supermercados').delete().eq('nombre', id)
    if (error) throw new Error(mensaje(error))
  },
})
