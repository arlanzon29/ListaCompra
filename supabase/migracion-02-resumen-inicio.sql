-- ============================================================================
--  Migración 02 — `resumen_inicio()`
--
--  Cómo ejecutarla:
--    Supabase -> SQL Editor -> pegar este fichero -> Run
--
--  Por qué: la pantalla de inicio solo enseña cuentas —listas abiertas,
--  artículos por comprar, artículos sin precio— y para calcularlas se estaba
--  descargando el histórico ENTERO de `precios`, que es la tabla que crece.
--  Esta función devuelve las cuentas ya hechas: un viaje y ni una fila de
--  precios por el cable.
--
--  Es idempotente: se puede ejecutar dos veces sin romper nada.
--
--  Primera función del proyecto. Hasta ahora la base solo tenía tablas y una
--  vista; a partir de aquí hay algo que se migra a mano. El reparto elegido es
--  estrecho a propósito: la base CUENTA, la aplicación DECIDE. Por eso
--  devuelve todas las listas abiertas con sus contadores y no elige cuál es la
--  compra en curso — ese criterio («la abierta con más pendientes») es regla de
--  producto, vive en `presentacion/pantallas/Inicio.tsx` y cambiarlo no debe
--  costar una migración.
-- ============================================================================


-- `security invoker` es el modo por defecto, pero se escribe: la función corre
-- como quien la llama, así que las políticas RLS de las tablas se aplican
-- igual que en un select normal. Con `security definer` se las saltaría, y con
-- la clave anónima siendo pública eso sería un agujero de verdad.
--
-- `stable` = no escribe y devuelve lo mismo dentro de una misma consulta.
--
-- `set search_path` fija dónde se resuelven los nombres, para que nadie pueda
-- colar un `productos` de otro esquema. Lleva `extensions` porque `citext` (el
-- tipo de las claves) puede estar instalado ahí y sus operadores tienen que
-- resolverse.
create or replace function resumen_inicio()
returns json
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select json_build_object(

    -- Artículos que no tienen precio en NINGUNA tienda. Es la única cuenta
    -- que no se puede sacar sin cruzar el catálogo con los precios, y por
    -- tanto la única razón real para que esto sea una función.
    'sin_precio', (
      select count(*)
      from   productos p
      where  not exists (
               select 1 from precios where producto = p.nombre
             )
    ),

    -- Las listas abiertas con sus dos contadores. Son una o dos filas, así
    -- que traerlas todas no cuesta más que traer una, y con ellas la
    -- aplicación saca las otras dos cifras sin preguntar otra vez:
    -- «listas abiertas» es la longitud, «artículos por comprar» la suma de
    -- `pendientes`.
    --
    -- El `left join` es lo que hace que una lista recién creada, todavía sin
    -- artículos, aparezca con 0 y 0 en lugar de desaparecer.
    'abiertas', (
      select coalesce(json_agg(x order by x.nombre), '[]'::json)
      from (
        select l.id,
               l.nombre,
               count(i.producto)                                as items,
               count(i.producto) filter (where not i.comprado)  as pendientes
        from   listas l
               left join lista_items i on i.lista = l.id
        where  not l.cerrada
        group  by l.id, l.nombre
      ) x
    )

  );
$$;


-- Postgres concede `execute` a PUBLIC en cada función nueva, y en Supabase
-- tanto `anon` como `authenticated` son PUBLIC. Se le quita a `anon`: el RLS
-- ya le impediría ver datos, pero le devolvería ceros y una lista vacía como
-- si la base estuviera vacía, en vez de negarle la llamada.
revoke execute on function resumen_inicio() from public, anon;
grant  execute on function resumen_inicio() to authenticated;
