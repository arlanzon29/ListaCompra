import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * El cliente de Supabase, creado una sola vez.
 *
 * Las dos variables viven en `.env` (plantilla en `.env.example`) y Vite las
 * incrusta en el paquete al compilar: por eso llevan el prefijo `VITE_`. La
 * clave anónima es PÚBLICA a propósito — quien protege los datos es el RLS del
 * esquema, no el secreto de la clave.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Permite arrancar sin `.env` y seguir usando los datos simulados. */
export const haySupabase = Boolean(url && clave)

let instancia: SupabaseClient | null = null

export const clienteSupabase = (): SupabaseClient => {
  if (!url || !clave) {
    throw new Error(
      'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.',
    )
  }
  instancia ??= createClient(url, clave, {
    auth: {
      // La sesión se guarda en localStorage y se renueva sola: al volver a
      // abrir la app en el móvil no hay que escribir la contraseña otra vez.
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return instancia
}
