-- ============================================================================
--  Migración 01 — `listas.cerrada`
--
--  Cómo ejecutarla:
--    Supabase -> SQL Editor -> pegar este fichero -> Run
--
--  Por qué: el dominio tiene `Lista.cerrada` desde la fase 1 (una lista cerrada
--  es de solo consulta) y hay dos pantallas que cierran y reabren, pero la
--  tabla `listas` nació sin esa columna. Sin ella, cerrar una lista no se
--  guardaba en ningún sitio.
--
--  Es idempotente: se puede ejecutar dos veces sin romper nada.
--
--  No hace falta tocar el RLS: la política de `listas` es `for all`, así que
--  cubre la columna nueva sin cambios.
-- ============================================================================

alter table listas
  add column if not exists cerrada boolean not null default false;
