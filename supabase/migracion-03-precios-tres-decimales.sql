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
--  POR QUÉ HAY QUE TIRAR LA VISTA. El `alter type` a secas no funciona:
--
--    ERROR: cannot alter type of a column used by a view or rule
--    DETAIL: rule _RETURN on view precios_actuales depends on column "precio"
--
--  `precios_actuales` selecciona `precio`, y una vista guarda el tipo de cada
--  columna que devuelve, así que Postgres no deja cambiar el tipo por debajo.
--  Hay que tirarla, cambiar la columna y volver a crearla igual. Entre las dos
--  cosas la vista no existe, pero es cuestión de milisegundos y la aplicación
--  no la consulta: `listar()` lee la tabla directamente.
--
--  La vista se recrea EXACTAMENTE como está en `schema.sql`, `security_invoker`
--  incluido. Sin esa opción la vista dejaría de respetar el RLS de la tabla y
--  se convertiría en una puerta de atrás para leer los precios sin sesión.
--
--  Es idempotente: se puede ejecutar tantas veces como haga falta. El
--  `alter type` sobre una columna que ya es numeric(10,3) no cambia nada, y la
--  vista se tira y se vuelve a crear igual.
--
--  `cantidad` en `lista_items` se queda en numeric(10,2) a propósito: son
--  unidades y kilos de la compra, no precios.
-- ============================================================================

begin;

drop view if exists precios_actuales;

alter table precios
  alter column precio type numeric(10,3);

-- Copia literal de la definición de `schema.sql`.
create view precios_actuales
with (security_invoker = on)
as
select distinct on (producto, supermercado)
       producto,
       supermercado,
       precio,
       fecha
from   precios
order  by producto, supermercado, fecha desc;

-- Los permisos NO sobreviven a un `drop view`: la vista nueva es otro objeto.
-- Supabase se los daría por defecto, pero dejarlo escrito es lo que garantiza
-- que la app siga leyendo si esos valores por defecto cambian algún día.
-- A `anon` se le concede igual que a `authenticated`: quien filtra por sesión
-- es el RLS de la tabla, que la vista respeta por `security_invoker`.
grant select on precios_actuales to anon, authenticated;

commit;

-- ----------------------------------------------------------------------------
-- Comprobación: tiene que devolver numeric_scale = 3.
-- ----------------------------------------------------------------------------
select data_type, numeric_precision, numeric_scale
from   information_schema.columns
where  table_name = 'precios' and column_name = 'precio';
