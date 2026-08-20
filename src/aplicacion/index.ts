import type { Dependencias } from './dependencias'
import { cargarTodo } from './casos/datos'
import { cargarResumen } from './casos/resumen'
import { borrarArticulo, crearArticulo, editarArticulo } from './casos/articulos'
import {
  borrarSupermercado,
  crearSupermercado,
  renombrarSupermercado,
} from './casos/supermercados'
import {
  anadirArticuloALista,
  cambiarCantidad,
  cerrarLista,
  crearLista,
  insertarDictado,
  marcarComprado,
  quitarArticuloDeLista,
  reabrirLista,
} from './casos/listas'
import { guardarPrecio } from './casos/precios'
import { cargarImagenes, guardarImagen, quitarImagen } from './casos/imagenes'
import { cerrarSesion, iniciarSesion, sesionActual } from './casos/sesion'

/**
 * Los casos de uso ya enlazados a sus dependencias. Es lo único que la capa de
 * presentación puede llamar: nunca un repositorio directamente.
 */
export const construyeCasosDeUso = (d: Dependencias) => ({
  cargarTodo: cargarTodo(d),
  cargarResumen: cargarResumen(d),

  crearArticulo: crearArticulo(d),
  editarArticulo: editarArticulo(d),
  borrarArticulo: borrarArticulo(d),

  crearSupermercado: crearSupermercado(d),
  renombrarSupermercado: renombrarSupermercado(d),
  borrarSupermercado: borrarSupermercado(d),

  crearLista: crearLista(d),
  cerrarLista: cerrarLista(d),
  reabrirLista: reabrirLista(d),
  anadirArticuloALista: anadirArticuloALista(d),
  quitarArticuloDeLista: quitarArticuloDeLista(d),
  cambiarCantidad: cambiarCantidad(d),
  marcarComprado: marcarComprado(d),
  insertarDictado: insertarDictado(d),

  guardarPrecio: guardarPrecio(d),

  cargarImagenes: cargarImagenes(d),
  guardarImagen: guardarImagen(d),
  quitarImagen: quitarImagen(d),

  sesionActual: sesionActual(d),
  iniciarSesion: iniciarSesion(d),
  cerrarSesion: cerrarSesion(d),

  /** El «hoy» que usan las pantallas para marcar los apuntes del día. */
  hoy: () => d.reloj.hoy(),
})

export type CasosDeUso = ReturnType<typeof construyeCasosDeUso>
export type { Dependencias }
export type { Instantanea } from './casos/datos'
