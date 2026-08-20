import { aCentimos } from '../../dominio/modelo'
import type { Dependencias } from '../dependencias'

/**
 * Apunta el precio de hoy de un artículo en una tienda.
 *
 * El importe va SIEMPRE en la unidad del artículo. Guardar dos veces el mismo
 * día sustituye el valor, no duplica; guardar 0 o vacío borra el precio de hoy
 * (es la forma de deshacer un apunte equivocado sin salir del teclado).
 */
export const guardarPrecio =
  (d: Dependencias) =>
  async (artId: string, superId: string, importe: number | null): Promise<void> => {
    const hoy = d.reloj.hoy()
    if (!importe || importe <= 0) {
      await d.precios.borrar(artId, superId, hoy)
      return
    }
    await d.precios.guardar({ artId, superId, fecha: hoy, importe: aCentimos(importe) })
  }

/** Lee «1,49» tal y como lo escribe el usuario en español. `null` si no es un número. */
export const importeDesdeTexto = (texto: string): number | null => {
  const v = parseFloat(String(texto ?? '').replace(',', '.'))
  return Number.isFinite(v) ? v : null
}
