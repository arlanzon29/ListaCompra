import type { SupabaseClient } from '@supabase/supabase-js'
import type { Sesion, ServicioAutenticacion } from '../../dominio/puertos'

/**
 * Autenticación real contra Supabase Auth.
 *
 * Sustituye pieza por pieza a `memoria/autenticacion.ts`: mismo puerto, misma
 * firma. No hay registro — las dos cuentas se crean a mano en la consola de
 * Supabase y el alta pública queda desactivada. Por eso aquí no existe
 * `signUp`: si algún día apareciera, cualquiera con la clave anónima (que es
 * pública) se crearía una cuenta y el RLS le daría acceso a todo.
 */

/** Supabase responde en inglés; la interfaz habla en castellano. */
const mensaje = (error: { message: string }): string => {
  const m = error.message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'La cuenta está sin confirmar.'
  if (m.includes('failed to fetch')) return 'Sin conexión con el servidor.'
  return error.message
}

export const autenticacionSupabase = (sb: SupabaseClient): ServicioAutenticacion => ({
  async sesionActual(): Promise<Sesion | null> {
    // Lee la sesión guardada y la renueva si hacía falta; no llama a la red
    // cuando el token sigue siendo válido.
    const { data, error } = await sb.auth.getSession()
    if (error) throw new Error(mensaje(error))
    const email = data.session?.user.email
    return email ? { email } : null
  },

  async entrar(email: string, contrasena: string): Promise<Sesion> {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password: contrasena,
    })
    if (error) throw new Error(mensaje(error))
    const correo = data.user?.email
    if (!correo) throw new Error('La cuenta no tiene correo asociado.')
    return { email: correo }
  },

  async salir(): Promise<void> {
    const { error } = await sb.auth.signOut()
    if (error) throw new Error(mensaje(error))
  },
})
