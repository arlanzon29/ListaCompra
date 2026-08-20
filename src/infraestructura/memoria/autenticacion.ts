import type { Sesion, ServicioAutenticacion } from '../../dominio/puertos'

const CLAVE = 'listacompra.sesion'

/**
 * Autenticación simulada: valida lo mismo que el prototipo (el correo lleva «@»
 * y la contraseña no está vacía) y recuerda la sesión en el navegador.
 *
 * Las cuentas se crean a mano y no hay registro; cuando entre Supabase Auth,
 * esta implementación se cambia por una que llame a `signInWithPassword`.
 */
export const autenticacionMemoria = (): ServicioAutenticacion => ({
  async sesionActual(): Promise<Sesion | null> {
    try {
      const crudo = localStorage.getItem(CLAVE)
      return crudo ? (JSON.parse(crudo) as Sesion) : null
    } catch {
      return null
    }
  },
  async entrar(email: string, contrasena: string): Promise<Sesion> {
    if (!email.includes('@') || !contrasena) {
      throw new Error('Correo o contraseña incorrectos.')
    }
    const sesion: Sesion = { email }
    try {
      localStorage.setItem(CLAVE, JSON.stringify(sesion))
    } catch {
      // sin almacenamiento la sesión dura lo que la pestaña; no es un error
    }
    return sesion
  },
  async salir(): Promise<void> {
    try {
      localStorage.removeItem(CLAVE)
    } catch {
      // nada que limpiar
    }
  },
})
