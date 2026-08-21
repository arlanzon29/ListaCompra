-- ---------------------------------------------------------------------------
-- Migración 05: artículos favoritos
-- ---------------------------------------------------------------------------
--
-- El catálogo ha crecido hasta el punto de que buscar por nombre ya no basta:
-- para montar la lista de la semana se repiten siempre los mismos veinte
-- artículos, y hay que ir dando con ellos entre todos los demás.
--
-- Una columna booleana en `productos`, y no una tabla `favoritos`: el favorito
-- es del artículo, no de la persona. La aplicación la usan dos, comparten
-- catálogo, comparten listas y comparten precios; una tabla por usuario sería
-- inventar una distinción que en esta casa no existe, y costaría un `join` en
-- cada listado del catálogo.
--
-- `default false` y `not null` para que las filas que ya están no necesiten
-- ningún relleno, y para que la aplicación nunca tenga que tratar el `null`
-- como un tercer estado.
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- ---------------------------------------------------------------------------

alter table productos
  add column if not exists favorito boolean not null default false;


-- Índice parcial: solo indexa las filas favoritas, que son pocas. Es el que
-- usa el filtro «solo favoritos» del catálogo y del panel de añadir.
--
-- Con un catálogo doméstico Postgres podría recorrer la tabla entera sin
-- despeinarse; está porque no cuesta nada y porque un índice parcial de veinte
-- filas ocupa menos que el comentario que lo explica.
create index if not exists productos_favoritos_idx
  on productos (nombre) where favorito;
