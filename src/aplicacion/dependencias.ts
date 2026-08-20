import type {
  Reloj,
  RepositorioArticulos,
  RepositorioListas,
  RepositorioPrecios,
  RepositorioResumen,
  RepositorioSupermercados,
  ServicioAutenticacion,
} from '../dominio/puertos'

/**
 * Lo que necesitan los casos de uso. Se inyecta una sola vez en el contenedor
 * (`infraestructura/contenedor.ts`); ningún caso de uso importa una
 * implementación concreta.
 */
export type Dependencias = {
  articulos: RepositorioArticulos
  supermercados: RepositorioSupermercados
  precios: RepositorioPrecios
  listas: RepositorioListas
  /** Lecturas agregadas de la pantalla de inicio. */
  resumen: RepositorioResumen
  auth: ServicioAutenticacion
  reloj: Reloj
}
