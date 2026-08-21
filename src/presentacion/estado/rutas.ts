/** Origen desde el que se abrió la hoja de precio: decide a dónde vuelve. */
export type OrigenPrecio = 'ficha' | 'ronda' | 'suelto'

export type Ruta =
  | { n: 'inicio' }
  | { n: 'listas' }
  | { n: 'articulos' }
  | { n: 'ajustes' }
  | { n: 'lista'; id: string }
  | { n: 'ficha'; id: string }
  | { n: 'dictar'; id: string }
  | { n: 'ronda'; superId: string; ids: string[]; origen: string }

/** Pantallas raíz: son las cuatro pestañas de la barra inferior. */
export type Pestana = 'inicio' | 'listas' | 'articulos' | 'ajustes'

/** Con qué pestaña se ilumina cada ruta. */
export const pestanaDe = (r: Ruta): Pestana => {
  switch (r.n) {
    case 'lista':
    case 'ronda':
    case 'dictar':
    case 'listas':
      return 'listas'
    case 'ficha':
    case 'articulos':
      return 'articulos'
    case 'ajustes':
      return 'ajustes'
    default:
      return 'inicio'
  }
}

/** Rutas que se apilan y por tanto muestran el botón de atrás. */
export const tienePila = (r: Ruta): boolean =>
  r.n === 'lista' || r.n === 'ficha' || r.n === 'ronda' || r.n === 'dictar'

export type Dialogo =
  | { tipo: 'nuevaLista' }
  | { tipo: 'nuevoArt'; valor?: string; anadirALista?: string | null }
  | { tipo: 'editArt'; id: string }
  | { tipo: 'renTienda'; id: string }
  | { tipo: 'borrarTienda'; id: string }
  | { tipo: 'cerrarLista'; id: string }
  /** Elegir en qué tienda se apunta el precio de un artículo. */
  | { tipo: 'tienda'; artId: string; origen: OrigenPrecio }
  /** Elegir en qué tienda se hace la entrada masiva de precios. */
  | { tipo: 'tiendaRonda'; ids: string[]; origen: string }

/** La hoja inferior de apunte individual de precio. */
export type HojaPrecio = {
  artId: string
  superId: string
  origen: OrigenPrecio
}

/**
 * La foto de un artículo ampliada a pantalla completa.
 *
 * Guarda el id y no la URL: la URL lleva el `?v=` del fichero y cambia cuando
 * alguien sustituye la foto, así que congelarla aquí sería enseñar la vieja.
 */
export type Visor = { artId: string }

/** Estados que la pantalla de ajustes puede forzar para revisar el diseño. */
export type Simulacion = null | 'loading' | 'error'
