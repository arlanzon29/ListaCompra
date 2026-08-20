import { construyeCasosDeUso, type CasosDeUso, type Dependencias } from '../aplicacion'
import { nuevoAlmacen, type Almacen } from './memoria/almacen'
import { autenticacionMemoria } from './memoria/autenticacion'
import {
  repositorioArticulosMemoria,
  repositorioListasMemoria,
  repositorioPreciosMemoria,
  repositorioResumenMemoria,
  repositorioSupermercadosMemoria,
} from './memoria/repositorios'
import { relojDelSistema } from './reloj'
import { clienteSupabase, haySupabase } from './supabase/cliente'
import { autenticacionSupabase } from './supabase/autenticacion'
import { repositorioSupermercadosSupabase } from './supabase/supermercados'
import { repositorioArticulosSupabase } from './supabase/articulos'
import { repositorioListasSupabase } from './supabase/listas'
import { repositorioPreciosSupabase } from './supabase/precios'
import { repositorioResumenSupabase } from './supabase/resumen'

/**
 * El único punto donde se elige la implementación de cada puerto.
 */

const enMemoria = (almacen: Almacen): Dependencias => ({
  articulos: repositorioArticulosMemoria(almacen),
  supermercados: repositorioSupermercadosMemoria(almacen),
  precios: repositorioPreciosMemoria(almacen),
  listas: repositorioListasMemoria(almacen),
  resumen: repositorioResumenMemoria(almacen),
  auth: autenticacionMemoria(),
  reloj: relojDelSistema(),
})

/** Todo simulado, con los datos de ejemplo del prototipo. */
export const dependenciasEnMemoria = (): Dependencias => enMemoria(nuevoAlmacen())

/**
 * Lo que usa la aplicación al arrancar.
 *
 * Fase 2 terminada: **todos** los repositorios son de Supabase.
 *
 * Hasta ahora esto partía de `...enMemoria(almacenVacio())` y sustituía encima
 * los puertos ya migrados, que era la forma de ir entrando de uno en uno. Al
 * entrar los precios, de aquel spread solo habría quedado el reloj: montar un
 * almacén en memoria entero —con sus cuatro repositorios— para sacarle el
 * reloj engaña a quien lo lee, porque parece que algo sigue simulado. Se
 * nombra cada puerto y el almacén en memoria desaparece de este camino.
 *
 * El reloj sigue siendo el del sistema, y eso no cambia: es un puerto para
 * poder fijar el «hoy» en una prueba, no algo que dependa de dónde estén los
 * datos.
 *
 * Sin `.env` configurado, todo sigue simulado y con semilla: el proyecto
 * arranca recién clonado. Ese es el único camino vivo que pasa por
 * `infraestructura/memoria`.
 */
export const dependenciasPorDefecto = (): Dependencias => {
  if (!haySupabase) return dependenciasEnMemoria()
  const sb = clienteSupabase()
  return {
    auth: autenticacionSupabase(sb),
    supermercados: repositorioSupermercadosSupabase(sb),
    articulos: repositorioArticulosSupabase(sb),
    precios: repositorioPreciosSupabase(sb),
    listas: repositorioListasSupabase(sb),
    resumen: repositorioResumenSupabase(sb),
    reloj: relojDelSistema(),
  }
}

export const casosDeUsoPorDefecto = (): CasosDeUso =>
  construyeCasosDeUso(dependenciasPorDefecto())
