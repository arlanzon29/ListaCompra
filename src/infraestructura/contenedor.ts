import { construyeCasosDeUso, type CasosDeUso, type Dependencias } from '../aplicacion'
import { almacenVacio, nuevoAlmacen, type Almacen } from './memoria/almacen'
import { autenticacionMemoria } from './memoria/autenticacion'
import {
  repositorioArticulosMemoria,
  repositorioListasMemoria,
  repositorioPreciosMemoria,
  repositorioSupermercadosMemoria,
} from './memoria/repositorios'
import { relojDelSistema } from './reloj'
import { clienteSupabase, haySupabase } from './supabase/cliente'
import { autenticacionSupabase } from './supabase/autenticacion'
import { repositorioSupermercadosSupabase } from './supabase/supermercados'
import { repositorioArticulosSupabase } from './supabase/articulos'
import { repositorioListasSupabase } from './supabase/listas'

/**
 * El único punto donde se elige la implementación de cada puerto.
 */

const enMemoria = (almacen: Almacen): Dependencias => ({
  articulos: repositorioArticulosMemoria(almacen),
  supermercados: repositorioSupermercadosMemoria(almacen),
  precios: repositorioPreciosMemoria(almacen),
  listas: repositorioListasMemoria(almacen),
  auth: autenticacionMemoria(),
  reloj: relojDelSistema(),
})

/** Todo simulado, con los datos de ejemplo del prototipo. */
export const dependenciasEnMemoria = (): Dependencias => enMemoria(nuevoAlmacen())

/**
 * Lo que usa la aplicación al arrancar.
 *
 * Fase 2 en curso: van entrando puertos de uno en uno. Ya son de Supabase la
 * autenticación, los supermercados, los artículos y las listas; solo los
 * precios siguen en memoria, y **sin la semilla**, porque sus datos de ejemplo
 * apuntan a tiendas y artículos que ya no existen.
 *
 * Sin `.env` configurado, todo sigue simulado y con semilla: el proyecto
 * arranca recién clonado.
 */
export const dependenciasPorDefecto = (): Dependencias => {
  if (!haySupabase) return dependenciasEnMemoria()
  const sb = clienteSupabase()
  return {
    ...enMemoria(almacenVacio()),
    auth: autenticacionSupabase(sb),
    supermercados: repositorioSupermercadosSupabase(sb),
    articulos: repositorioArticulosSupabase(sb),
    listas: repositorioListasSupabase(sb),
  }
}

export const casosDeUsoPorDefecto = (): CasosDeUso =>
  construyeCasosDeUso(dependenciasPorDefecto())
