import type { Sesion } from '../../dominio/puertos'
import type { Dependencias } from '../dependencias'

export const sesionActual =
  (d: Dependencias) =>
  async (): Promise<Sesion | null> =>
    d.auth.sesionActual()

export const iniciarSesion =
  (d: Dependencias) =>
  async (email: string, contrasena: string): Promise<Sesion> =>
    d.auth.entrar(email.trim(), contrasena)

export const cerrarSesion =
  (d: Dependencias) =>
  async (): Promise<void> =>
    d.auth.salir()
