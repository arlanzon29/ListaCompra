import type {
  Articulo,
  ItemLista,
  Lista,
  Precio,
  ResumenInicio,
  Supermercado,
  Unidad,
} from '../modelo'

/**
 * Puertos: lo que el dominio necesita del mundo exterior, expresado como
 * interfaces. La capa de aplicación depende solo de esto; quien lo implementa
 * (memoria hoy, Supabase después) vive en `infraestructura/`.
 *
 * Todo es asíncrono a propósito: así la implementación de Supabase entra sin
 * tocar ni un caso de uso.
 */

export interface RepositorioArticulos {
  listar(): Promise<Articulo[]>
  crear(datos: { nombre: string; unidad: Unidad }): Promise<Articulo>
  editar(id: string, datos: { nombre: string; unidad: Unidad }): Promise<Articulo>
  /**
   * Marca o desmarca el artículo como favorito.
   *
   * Va aparte de `editar` por el mismo motivo que `marcarComprado` va aparte
   * de `guardarItems`: es un booleano que se toca desde una fila del catálogo,
   * y quien llama ya sabe el valor que quiere dejar. Pasarlo por `editar`
   * obligaría a mandar además el nombre y la unidad, y renombrar el artículo
   * sin querer al tocar una estrella.
   */
  marcarFavorito(id: string, favorito: boolean): Promise<void>
  /** Borra también sus precios y sus apariciones en listas. */
  borrar(id: string): Promise<void>
}

export interface RepositorioSupermercados {
  listar(): Promise<Supermercado[]>
  crear(nombre: string): Promise<Supermercado>
  renombrar(id: string, nombre: string): Promise<Supermercado>
  /** Borra también los precios apuntados en esa tienda. */
  borrar(id: string): Promise<void>
}

/** Las dos cosas que llevan imagen: el producto y la tienda. */
export type TipoImagen = 'foto' | 'logo'

/**
 * Las dos medidas en que se guarda cada imagen. Son intenciones, no píxeles:
 * cuántos mide cada una lo decide quien implementa el puerto.
 */
export type TamanoImagen = 'fila' | 'ficha'

/** Id -> URL de cada tamaño. Solo aparecen los ids que tienen imagen. */
export type MapaImagenes = Record<string, Record<TamanoImagen, string>>

/**
 * Fotos de producto y logos de tienda.
 *
 * Es un puerto aparte y no una columna más de `productos` porque la imagen no
 * hace falta cuando se lee el catálogo: `cargarTodo` se trae el catálogo
 * entero después de cada acción, y las imágenes cambian una vez cada muchos
 * meses. Se piden **una vez por sesión** y solo se refrescan cuando una cambia.
 *
 * `listar` devuelve URLs ya montadas, no rutas: así la pantalla no tiene que
 * saber dónde viven los ficheros, y quien lo implementa puede meter en la URL
 * lo que necesite para que el navegador no sirva de caché la imagen anterior.
 */
export interface RepositorioImagenes {
  listar(): Promise<Record<TipoImagen, MapaImagenes>>
  /** Sustituye la imagen de ese id. Recibe el fichero tal cual sale del móvil. */
  guardar(tipo: TipoImagen, id: string, fichero: Blob): Promise<void>
  quitar(tipo: TipoImagen, id: string): Promise<void>
  /**
   * Mueve la imagen cuando cambia el id.
   *
   * Existe porque en `productos` y `supermercados` el id **es** el nombre: al
   * renombrar, la base arrastra precios e items con su `on update cascade`,
   * pero la imagen no vive en la base y no se entera sola.
   */
  renombrar(tipo: TipoImagen, id: string, nuevoId: string): Promise<void>
}

export interface RepositorioPrecios {
  listar(): Promise<Precio[]>
  /** Sustituye el precio de esa fecha en esa tienda; no duplica. */
  guardar(precio: Precio): Promise<void>
  borrar(artId: string, superId: string, fecha: string): Promise<void>
}

export interface RepositorioListas {
  listar(): Promise<Lista[]>
  obtener(id: string): Promise<Lista | null>
  crear(nombre: string): Promise<Lista>
  /**
   * Sustituye los items de la lista por los que se pasan.
   *
   * Es la operación en bloque, y solo debe usarse cuando de verdad cambian
   * varios items a la vez —el dictado—. Para tocar uno solo están los tres
   * métodos de abajo: sustituir la lista entera para cambiar un booleano
   * obliga a leerla antes, y eso son tres viajes al servidor en vez de uno.
   */
  guardarItems(listaId: string, items: ItemLista[]): Promise<void>

  /**
   * Los tres cambios de **un solo item**, identificado por su lista y su
   * artículo —que juntos son su clave—. Ninguno necesita leer nada antes:
   * quien llama ya sabe el valor que quiere dejar.
   *
   * Si el item no está, no hacen nada: son idempotentes a propósito, porque
   * la app la usan dos personas y la otra puede haberlo quitado.
   */
  marcarComprado(listaId: string, artId: string, comprado: boolean): Promise<void>
  /** `cant` es la cantidad resultante, siempre mayor que cero. */
  fijarCantidad(listaId: string, artId: string, cant: number): Promise<void>
  quitarItem(listaId: string, artId: string): Promise<void>

  cambiarCierre(listaId: string, cerrada: boolean): Promise<void>
}

/**
 * Las cuentas de la pantalla de inicio, resueltas de una vez.
 *
 * Es un puerto aparte y no un método de los otros repositorios porque cruza
 * tres tablas —catálogo, precios y listas— y ninguno de ellos manda sobre las
 * tres. Cómo se resuelve es cosa de quien lo implementa: contra Supabase, una
 * sola llamada que cuenta en el servidor; en memoria, recorrer el almacén.
 *
 * Devuelve **todas** las listas abiertas y no «la que se está comprando»:
 * elegir cuál es la compra en curso es una decisión de la pantalla.
 */
export interface RepositorioResumen {
  inicio(): Promise<ResumenInicio>
}

export type Sesion = {
  email: string
}

export interface ServicioAutenticacion {
  sesionActual(): Promise<Sesion | null>
  entrar(email: string, contrasena: string): Promise<Sesion>
  salir(): Promise<void>
}

/**
 * El «hoy» de la aplicación. Es un puerto para que las reglas que dependen de
 * la fecha (un precio por tienda y día) sean comprobables sin tocar el reloj.
 */
export interface Reloj {
  /** ISO 'YYYY-MM-DD' */
  hoy(): string
}
