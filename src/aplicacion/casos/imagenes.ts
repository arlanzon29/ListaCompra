import type { MapaImagenes, TipoImagen } from '../../dominio/puertos'
import type { Dependencias } from '../dependencias'

/**
 * Las imágenes van por su cuenta, fuera de `cargarTodo`.
 *
 * Cargarlas con el catálogo obligaría a pedirlas otra vez después de cada `+`
 * de una lista, y una foto no cambia porque alguien sume una unidad de leche.
 * Se piden al entrar y se vuelven a pedir solo cuando una cambia.
 */
export const cargarImagenes =
  (d: Dependencias) =>
  async (): Promise<Record<TipoImagen, MapaImagenes>> =>
    d.imagenes.listar()

/**
 * El límite es del navegador, no del servidor.
 *
 * Aunque el fichero se reduzca antes de subirlo, se comprueba aquí lo que
 * llega: es la única forma de decirle a alguien que ha elegido un vídeo o un
 * PDF sin esperar a que el servidor lo rechace.
 */
const MAXIMO_BYTES = 25 * 1024 * 1024

export const guardarImagen =
  (d: Dependencias) =>
  async (tipo: TipoImagen, id: string, fichero: Blob): Promise<void> => {
    if (!fichero.type.startsWith('image/')) {
      throw new Error('Eso no es una imagen.')
    }
    if (fichero.size > MAXIMO_BYTES) {
      throw new Error('La imagen es demasiado grande.')
    }
    await d.imagenes.guardar(tipo, id, fichero)
  }

export const quitarImagen =
  (d: Dependencias) =>
  async (tipo: TipoImagen, id: string): Promise<void> => {
    await d.imagenes.quitar(tipo, id)
  }

/**
 * Acompaña a la imagen cuando su dueño cambia de nombre.
 *
 * Lo llaman `editarArticulo` y `renombrarSupermercado`, y solo cuando el id ha
 * cambiado de verdad. En memoria los ids no son el nombre, así que allí no se
 * llama nunca; contra Supabase, el id **es** el nombre y sin esto la foto se
 * quedaría huérfana en su ruta vieja.
 *
 * Va después del renombrado, no antes: si falla, el nombre ya está cambiado.
 * Por eso el error lo dice tal cual en vez de hacer creer que no se guardó
 * nada, y por eso tampoco se traga en silencio, que es como se llega a una
 * carpeta llena de imágenes de las que ya nadie tira.
 */
export const acompanaImagen = async (
  d: Dependencias,
  tipo: TipoImagen,
  id: string,
  nuevoId: string,
): Promise<void> => {
  try {
    await d.imagenes.renombrar(tipo, id, nuevoId)
  } catch (e) {
    const que = tipo === 'foto' ? 'la foto' : 'el logo'
    const detalle = e instanceof Error ? e.message : ''
    throw new Error(`El nombre ha cambiado, pero ${que} se ha quedado atrás. ${detalle}`.trim())
  }
}
