import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { ResumenInicio } from '../../dominio/modelo'
import type { RepositorioResumen } from '../../dominio/puertos'

/**
 * Las cuentas de inicio, contra la función `resumen_inicio()` de Supabase
 * (`supabase/migracion-02-resumen-inicio.sql`).
 *
 * Es el primer adaptador que no habla con una tabla. El motivo es concreto:
 * «artículos sin precio» cruza el catálogo entero con el histórico entero, y
 * calcularlo aquí significaba descargar `precios` completa —paginada de mil en
 * mil— para pintar un número. La función lo cuenta en el servidor y devuelve
 * un JSON de nada.
 *
 * Lo que **no** hace la función es elegir la compra en curso: devuelve todas
 * las listas abiertas con sus contadores y esa decisión se queda en la
 * pantalla, donde se puede cambiar sin una migración.
 */

/** El JSON tal y como lo construye `json_build_object`. */
type Respuesta = {
  sin_precio: number
  abiertas: { id: string; nombre: string; items: number; pendientes: number }[]
}

/**
 * Los códigos que puede devolver una llamada a la función.
 *
 * El `42501` no es teórico: la migración le quita el `execute` a `anon` a
 * propósito, para que una sesión caducada falle en vez de devolver ceros y
 * parecer una base vacía. Este mensaje es lo que se ve cuando eso pasa.
 */
const mensaje = (e: PostgrestError): string => {
  if (e.code === '42501') return 'La sesión no tiene permiso para esto.'
  // La función no existe: la migración 02 no se ha ejecutado en esta base.
  if (e.code === 'PGRST202') return 'Falta la función `resumen_inicio` en la base de datos.'
  return e.message
}

export const repositorioResumenSupabase = (sb: SupabaseClient): RepositorioResumen => ({
  async inicio(): Promise<ResumenInicio> {
    const { data, error } = await sb.rpc('resumen_inicio')
    if (error) throw new Error(mensaje(error))
    const r = data as Respuesta
    return {
      // `count(*)` es bigint y PostgREST lo puede mandar como cadena si no
      // cabe en un double; Number() lo deja siempre number, igual que en
      // `precios.ts` con el importe.
      sinPrecio: Number(r.sin_precio),
      abiertas: r.abiertas.map((l) => ({
        id: l.id,
        nombre: l.nombre,
        items: Number(l.items),
        pendientes: Number(l.pendientes),
      })),
    }
  },
})
