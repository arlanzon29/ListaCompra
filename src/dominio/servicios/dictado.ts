import type { Articulo, Lista } from '../modelo'

export type EstadoLinea = 'catalogo' | 'ya'

export type LineaDictada = {
  cant: number
  nombre: string
  artId: string
  estado: EstadoLinea
}

/** minúsculas y sin acentos, para casar «Plátano» con «platano». */
const normaliza = (t: string): string =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

/**
 * Convierte texto dictado o pegado en líneas listas para insertar.
 *
 * Acepta separadores de línea, comas y punto y coma; la cantidad puede ir
 * delante («2 leche», «2x leche») o detrás («leche 2»); quita los artículos
 * «de/un/una/unos/unas»; casa primero por nombre exacto y luego por inclusión;
 * y agrupa duplicados sumando cantidades.
 *
 * El dictado **no crea artículos**: lo que no casa con el catálogo se descarta
 * en silencio y no llega ni a la previa. Dictando entra ruido —muletillas,
 * frases partidas— y el catálogo es lo que sostiene la comparación de precios;
 * darlo de alta se hace a conciencia desde Catálogo, eligiendo la unidad.
 */
export const parseaDictado = (
  texto: string,
  catalogo: Articulo[],
  lista?: Lista | null,
): LineaDictada[] => {
  const trozos = String(texto || '')
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  const vistos: Record<string, number> = {}
  const salida: LineaDictada[] = []

  for (const trozo of trozos) {
    let cant = 1
    let nombre = trozo

    const delante = trozo.match(/^(\d+)\s*(?:x\s*)?(.+)$/i)
    if (delante) {
      cant = parseInt(delante[1], 10)
      nombre = delante[2]
    } else {
      const detras = trozo.match(/^(.+?)\s*(?:x\s*)?(\d+)$/i)
      if (detras) {
        nombre = detras[1]
        cant = parseInt(detras[2], 10)
      }
    }

    nombre = nombre.replace(/^(de|un|una|unos|unas)\s+/i, '').trim()
    if (!nombre) continue

    const clave = normaliza(nombre)
    const yaVisto = vistos[clave]
    if (yaVisto) {
      salida[yaVisto - 1].cant += cant
      continue
    }

    const art =
      catalogo.find((a) => normaliza(a.nombre) === clave) ??
      catalogo.find(
        (a) => normaliza(a.nombre).includes(clave) || clave.includes(normaliza(a.nombre)),
      )
    if (!art) continue

    const enLista = !!lista && lista.items.some((x) => x.artId === art.id)

    salida.push({
      cant,
      nombre: art.nombre,
      artId: art.id,
      estado: enLista ? 'ya' : 'catalogo',
    })
    vistos[clave] = salida.length
  }

  return salida
}
