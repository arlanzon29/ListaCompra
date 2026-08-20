import type {
  Reloj,
  RepositorioArticulos,
  RepositorioImagenes,
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
  /** Fotos de producto y logos de tienda. No viajan con el catálogo. */
  imagenes: RepositorioImagenes
  /** Lecturas agregadas de la pantalla de inicio. */
  resumen: RepositorioResumen
  auth: ServicioAutenticacion
  reloj: Reloj
}
