-- ============================================================================
--  Migración 03 — `precios.precio` pasa a numeric(10,3)
--
--  Cómo ejecutarla:
--    Supabase -> SQL Editor -> pegar este fichero -> Run
--
--  Por qué: el precio va SIEMPRE por unidad de medida, y ahí el céntimo se
--  queda corto. Un pack de 6 x 1 l a 5,45 € son 0,908 €/l; con dos decimales
--  se guardaba 0,91 y la comparativa entre tiendas la decidía el redondeo en
--  vez del precio. Peor todavía: Postgres redondea `numeric(10,2)` en silencio,
--  así que tecleando 0,908 la app no daba ningún error, sencillamente guardaba
--  otra cosa.
--
--  Qué NO hace: recuperar la precisión perdida. Lo ya redondeado a dos
--  decimales se queda como está; a partir de aquí los apuntes nuevos guardan
--  tres.
--
--  Es idempotente: `alter type` sobre una columna que ya es numeric(10,3) no
--  cambia nada.
--
--  `cantidad` en `lista_items` se queda en numeric(10,2) a propósito: son
--  unidades y kilos de la compra, no precios.
-- ============================================================================

alter table precios
  alter column precio type numeric(10,3);
