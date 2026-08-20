import { useCallback, useRef, useState } from 'react'

export type Mapa = Record<string, string>

type Objetivo = { tipo: 'foto' | 'logo'; id: string }

const CLAVES = { foto: 'listacompra.fotos', logo: 'listacompra.logos' } as const

const leer = (clave: string): Mapa => {
  try {
    const crudo = localStorage.getItem(clave)
    return crudo ? (JSON.parse(crudo) as Mapa) : {}
  } catch {
    return {}
  }
}

const escribir = (clave: string, mapa: Mapa): void => {
  try {
    localStorage.setItem(clave, JSON.stringify(mapa))
  } catch {
    // el cupo del navegador es pequeño para data-URLs: si no cabe, se pierde
    // al recargar, pero la foto sigue viéndose en esta sesión
  }
}

/**
 * Fotos de producto y logos de tienda.
 *
 * Como en el prototipo, la imagen se lee con `FileReader` a data-URL. Aquí se
 * guarda además en el navegador para que sobreviva a una recarga.
 *
 * Pendiente de la fase de Supabase: subir el fichero a Storage, guardar la URL
 * en el artículo o el supermercado y servir dos tamaños (80px para las filas,
 * 720px para la ficha).
 */
export const useFotos = () => {
  const [fotos, setFotos] = useState<Mapa>(() => leer(CLAVES.foto))
  const [logos, setLogos] = useState<Mapa>(() => leer(CLAVES.logo))

  const inputRef = useRef<HTMLInputElement>(null)
  const objetivo = useRef<Objetivo | null>(null)

  /** `camara` abre directamente la cámara trasera del móvil. */
  const pideImagen = useCallback((tipo: Objetivo['tipo'], id: string, camara: boolean) => {
    objetivo.current = { tipo, id }
    const el = inputRef.current
    if (!el) return
    if (camara) el.setAttribute('capture', 'environment')
    else el.removeAttribute('capture')
    el.value = ''
    el.click()
  }, [])

  const recibeImagen = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const obj = objetivo.current
    if (!file || !obj) return
    const fr = new FileReader()
    fr.onload = () => {
      const valor = String(fr.result)
      const aplica = (m: Mapa): Mapa => {
        const siguiente = { ...m, [obj.id]: valor }
        escribir(CLAVES[obj.tipo], siguiente)
        return siguiente
      }
      if (obj.tipo === 'logo') setLogos(aplica)
      else setFotos(aplica)
      objetivo.current = null
    }
    fr.readAsDataURL(file)
  }, [])

  const quitaFoto = useCallback((id: string) => {
    setFotos((m) => {
      const siguiente = { ...m }
      delete siguiente[id]
      escribir(CLAVES.foto, siguiente)
      return siguiente
    })
  }, [])

  return { fotos, logos, inputRef, pideImagen, recibeImagen, quitaFoto }
}
