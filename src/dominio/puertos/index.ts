import type { Articulo, ItemLista, Lista, Precio, Supermercado, Unidad } from '../modelo'

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
  /** Sustituye los items de la lista por los que se pasan. */
  guardarItems(listaId: string, items: ItemLista[]): Promise<void>
  cambiarCierre(listaId: string, cerrada: boolean): Promise<void>
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
