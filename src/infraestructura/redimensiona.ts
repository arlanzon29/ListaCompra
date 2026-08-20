/**
 * Reducir la imagen en el navegador **antes** de subirla.
 *
 * Está aquí y no en `supabase/` porque no tiene nada de Supabase: es el
 * navegador el que sabe decodificar un JPEG y pintarlo en un `<canvas>`. Es un
 * adaptador del sistema, como `reloj.ts`.
 *
 * Por qué se hace en el móvil y no en el servidor: Supabase sabe redimensionar
 * al vuelo, pero eso es del plan de pago. Y aunque no lo fuera, subir los 4 MB
 * que pesa una foto de doce megapíxeles por 4G para pintarla a 80 px es
 * exactamente el problema que se quería quitar. Reducida a 720 px son ~80 KB.
 *
 * El resultado es siempre JPEG, incluso si entra un PNG con transparencia: por
 * eso el lienzo se pinta de blanco antes: sin ese relleno, lo transparente sale
 * negro. Se nota en los logos de tienda, que suelen ser PNG recortados.
 */

/** Calidad del JPEG. Por encima de 0,85 el fichero crece y no se ve mejor. */
const CALIDAD = 0.82

const decodifica = async (fichero: Blob): Promise<ImageBitmap | HTMLImageElement> => {
  // `from-image` respeta la orientación EXIF: sin esto, las fotos hechas con
  // el móvil en vertical se suben tumbadas.
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(fichero, { imageOrientation: 'from-image' })
  }
  const url = URL.createObjectURL(fichero)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Devuelve un JPEG cuyo lado mayor mide `lado` píxeles, conservando la
 * proporción. Si la imagen ya es más pequeña, no la agranda.
 */
export const redimensiona = async (fichero: Blob, lado: number): Promise<Blob> => {
  const img = await decodifica(fichero)
  const ancho = img.width
  const alto = img.height
  if (!ancho || !alto) throw new Error('No se ha podido leer la imagen.')

  const escala = Math.min(1, lado / Math.max(ancho, alto))
  const w = Math.max(1, Math.round(ancho * escala))
  const h = Math.max(1, Math.round(alto * escala))

  const lienzo = document.createElement('canvas')
  lienzo.width = w
  lienzo.height = h
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('No se ha podido preparar la imagen.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  if ('close' in img) img.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    lienzo.toBlob(resolve, 'image/jpeg', CALIDAD),
  )
  if (!blob) throw new Error('No se ha podido comprimir la imagen.')
  return blob
}
