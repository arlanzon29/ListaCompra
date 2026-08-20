import type { ResumenInicio } from '../../dominio/modelo'
import type { Dependencias } from '../dependencias'

/**
 * Carga solo lo que enseña la pantalla de inicio.
 *
 * Es el hermano estrecho de `cargarTodo`: donde aquel trae las cuatro tablas
 * enteras, este trae tres cuentas. La pantalla de arranque no necesita ni una
 * fila de precios, y `precios` es la tabla que crece.
 */
export const cargarResumen =
  (d: Dependencias) =>
  async (): Promise<ResumenInicio> =>
    d.resumen.inicio()
